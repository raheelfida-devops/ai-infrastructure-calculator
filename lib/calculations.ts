import type {
  CalculatorInput,
  CalculationResult,
  MemoryBreakdown,
  Recommendation,
  Verdict,
  GpuSpec,
} from "@/lib/types";
import { QUANTIZATIONS, KV_PRECISION_BYTES } from "@/lib/data/quantization";
import { GPU_MAP, ELECTRICITY_USD_PER_KWH } from "@/lib/data/gpus";

const GB = 1024 ** 3;

// Fixed overheads (GB). Framework overhead scales a little with model size.
const OS_OVERHEAD_GB = 2.5; // OS + drivers headroom for host RAM path
const SAFETY_MARGIN = 0.1; // 10% headroom on top of everything

/**
 * Bytes to store the full weight tensor for the given quantization.
 * size = params · (bitsPerWeight / 8)
 */
export function weightBytes(paramsB: number, quantId: CalculatorInput["quantization"]): number {
  const q = QUANTIZATIONS[quantId];
  const params = paramsB * 1e9;
  return params * (q.bitsPerWeight / 8);
}

/**
 * KV-cache bytes for a single sequence at the given context length.
 *
 *   kv = 2 · layers · (kvHeads · headDim) · context · bytesPerElem
 *
 * The factor 2 covers the Key and Value tensors. headDim = hidden / attnHeads,
 * so kvHeads·headDim is the grouped-query KV projection width (GQA shrinks it).
 */
export function kvCacheBytesPerSequence(input: CalculatorInput): number {
  if (!input.kvCacheEnabled) return 0;
  const headDim = input.hiddenSize / Math.max(1, input.attnHeads);
  const kvDim = input.kvHeads * headDim;
  const bytesPerElem = KV_PRECISION_BYTES[input.kvCachePrecision];
  let ctx = input.contextTokens;
  // Sliding-window attention caps the cache at the window (approximated at 4k).
  if (input.slidingWindow) ctx = Math.min(ctx, 4096);
  return 2 * input.layers * kvDim * ctx * bytesPerElem;
}

/** Active parameters used per decoded token (all weights for dense models). */
export function activeParamsB(input: CalculatorInput): number {
  if (input.isMoE && input.activeParamsB > 0) return input.activeParamsB;
  return input.paramsB;
}

function verdictFor(fitsGpu: boolean, gpuVram: number, totalGb: number, hasGpu: boolean): Verdict {
  if (!hasGpu) return "cpu-only";
  if (fitsGpu && gpuVram >= totalGb * 1.15) return "comfortable";
  if (fitsGpu) return "tight";
  return "insufficient";
}

export function calculate(
  input: CalculatorInput,
  gpuMap: Record<string, GpuSpec> = GPU_MAP
): CalculationResult {
  const q = QUANTIZATIONS[input.quantization];
  const gpu = gpuMap[input.gpuId] ?? null;
  const hasGpu = !!gpu && input.gpuId !== "none";
  const gpuCount = Math.max(1, input.gpuCount);

  // ---- Weights ----
  const wBytes = weightBytes(input.paramsB, input.quantization);
  const weightsGb = wBytes / GB;
  const modelSizeGb = weightsGb; // on-disk == weight footprint for quantized files

  // ---- KV cache ----
  const kvSeqBytes = kvCacheBytesPerSequence(input);
  const kvCacheGb = kvSeqBytes / GB;
  const users = Math.max(1, input.concurrentUsers);
  // Continuous batching lets sequences share the pool; without it each of the
  // batch slots reserves its own full-context cache.
  const concurrentSeqs = input.continuousBatching
    ? users
    : Math.max(users, input.batchSize);
  const kvCacheAllUsersGb = kvCacheGb * concurrentSeqs;

  // ---- Activations / compute buffers ----
  // Rough transient buffer per active sequence; Flash-Attention removes the
  // O(seq²) materialization so we scale it down substantially.
  const actPerSeq =
    (input.hiddenSize * input.contextTokens * 2 * (input.flashAttention ? 1 : 6)) / GB;
  const activationsGb = Math.max(0.25, actPerSeq * Math.min(concurrentSeqs, 8));

  // ---- Overheads ----
  const frameworkOverheadGb = 0.75 + weightsGb * 0.05;
  const osOverheadGb = hasGpu ? 0.8 : OS_OVERHEAD_GB;

  const subtotal =
    weightsGb + kvCacheAllUsersGb + activationsGb + frameworkOverheadGb + osOverheadGb;
  const safetyMarginGb = subtotal * SAFETY_MARGIN;
  const totalGb = subtotal + safetyMarginGb;

  const memory: MemoryBreakdown = {
    weightsGb,
    kvCacheGb,
    kvCacheAllUsersGb,
    activationsGb,
    frameworkOverheadGb,
    osOverheadGb,
    safetyMarginGb,
    totalGb,
  };

  // ---- Device fit ----
  const totalVramGb = hasGpu ? gpu!.vramGb * gpuCount : 0;
  const fitsOnGpu = hasGpu && totalVramGb >= totalGb;
  const vramRequiredGb = totalGb;

  // ---- Throughput (memory-bandwidth roofline for batch-1 decode) ----
  // Each token reads the active weights once from memory. Multi-GPU tensor
  // parallelism adds bandwidth but with scaling losses.
  const actGb = (activeParamsB(input) * 1e9 * (q.bitsPerWeight / 8)) / GB;
  const kvReadPerTokenGb = kvCacheGb; // decode re-reads cache each step (upper bound)
  const perTokenReadGb = actGb + kvReadPerTokenGb * 0.5;
  const tpScaling = gpuCount > 1 ? 0.9 : 1; // ~90% tensor-parallel efficiency/GPU
  const effBandwidth = hasGpu
    ? gpu!.bandwidthGbs * gpuCount * tpScaling
    : // CPU path: assume dual-channel DDR5 ~ 80 GB/s effective
      80;
  const efficiency = 0.8; // real kernels hit ~75-85% of peak bandwidth
  let tps = (effBandwidth * efficiency) / Math.max(0.001, perTokenReadGb);
  if (input.speculativeDecoding) tps *= 1.6; // typical accepted-token speedup
  const tokensPerSecond = tps;

  // Prefill/prompt processing is compute-bound (FLOPs), not bandwidth-bound.
  // ~2·activeParams FLOPs per token; TFLOPS in units of 1e12.
  const flopsPerToken = 2 * activeParamsB(input) * 1e9;
  const computeThroughput = hasGpu
    ? gpu!.fp16Tflops * gpuCount * 1e12 * 0.4
    : 0.2e12;
  const prefillTps = computeThroughput / flopsPerToken;

  // ---- Max context that fits on the device ----
  let maxContextOnDevice = input.contextTokens;
  if (hasGpu && kvCacheGb > 0) {
    const freeForKv = Math.max(0, totalVramGb - weightsGb - frameworkOverheadGb - osOverheadGb);
    const kvPerTokenGb = kvCacheGb / Math.max(1, input.contextTokens);
    maxContextOnDevice = Math.floor(freeForKv / Math.max(1e-9, kvPerTokenGb));
  }

  // ---- Concurrent users supported by the target device ----
  let concurrentUsersSupported = 0;
  if (hasGpu) {
    const freeForKv = Math.max(0, totalVramGb - weightsGb - activationsGb - frameworkOverheadGb - osOverheadGb);
    const memBound = kvCacheGb > 0 ? Math.floor(freeForKv / kvCacheGb) : users;
    // Throughput bound: enough aggregate tokens/s to give each user their share.
    const perUserDemand = Math.max(1, input.outputTokens > 0 ? 15 : 10); // target tps/user
    const throughputBound = Math.floor((tokensPerSecond * 1.8) / perUserDemand);
    concurrentUsersSupported = Math.max(0, Math.min(memBound, Math.max(1, throughputBound)));
  }

  // ---- Load time (read model file from storage) ----
  // NVMe Gen4 ~ 5 GB/s sustained.
  const loadTimeSec = modelSizeGb / 5;

  // ---- Power & cost ----
  const powerWatts = hasGpu ? gpu!.tdpWatts * gpuCount + 80 : 180;
  const costPerHourUsd = (powerWatts / 1000) * ELECTRICITY_USD_PER_KWH;
  const tokensPerHour = tokensPerSecond * 3600;
  const costPer1MTokensUsd = tokensPerHour > 0 ? (costPerHourUsd / tokensPerHour) * 1e6 : Infinity;

  // ---- RAM tiers ----
  const minRamGb = Math.ceil(totalGb);
  const recommendedRamGb = Math.ceil(totalGb * 1.25);
  const idealRamGb = Math.ceil(totalGb * 1.5);

  const verdict = verdictFor(fitsOnGpu, totalVramGb, totalGb, hasGpu);

  const recommendations = buildRecommendations(input, {
    weightsGb,
    totalGb,
    totalVramGb,
    fitsOnGpu,
    hasGpu,
    tokensPerSecond,
    kvCacheAllUsersGb,
    maxContextOnDevice,
    verdict,
    gpuVendor: gpu?.vendor,
    unified: gpu?.unified ?? false,
  });

  const headDim = input.hiddenSize / Math.max(1, input.attnHeads);
  const kvFormula = `2 × ${input.layers} layers × (${input.kvHeads} kv-heads × ${headDim.toFixed(0)} head-dim = ${(input.kvHeads * headDim).toFixed(0)}) × ${input.contextTokens.toLocaleString()} ctx × ${KV_PRECISION_BYTES[input.kvCachePrecision]} B = ${kvCacheGb.toFixed(2)} GB/seq`;
  const weightFormula = `${input.paramsB}B params × ${(q.bitsPerWeight / 8).toFixed(3)} B/param (${q.label}) = ${weightsGb.toFixed(2)} GB`;

  return {
    bytesPerWeight: q.bitsPerWeight / 8,
    modelSizeGb,
    memory,
    minRamGb,
    recommendedRamGb,
    idealRamGb,
    vramRequiredGb,
    diskGb: modelSizeGb,
    loadTimeSec,
    tokensPerSecond,
    prefillTps,
    maxContextOnDevice,
    concurrentUsersSupported,
    powerWatts,
    costPerHourUsd,
    costPer1MTokensUsd,
    verdict,
    fitsOnGpu,
    recommendations,
    kvFormula,
    weightFormula,
    gpu,
    totalVramGb,
  };
}

interface RecoContext {
  weightsGb: number;
  totalGb: number;
  totalVramGb: number;
  fitsOnGpu: boolean;
  hasGpu: boolean;
  tokensPerSecond: number;
  kvCacheAllUsersGb: number;
  maxContextOnDevice: number;
  verdict: Verdict;
  gpuVendor?: string;
  unified: boolean;
}

function buildRecommendations(input: CalculatorInput, ctx: RecoContext): Recommendation[] {
  const recs: Recommendation[] = [];

  if (ctx.verdict === "comfortable") {
    recs.push({ level: "success", text: "This model will run comfortably on the selected hardware." });
  } else if (ctx.verdict === "tight") {
    recs.push({ level: "warning", text: "Fits, but with little headroom — expect pressure at long contexts or high concurrency." });
  } else if (ctx.verdict === "insufficient") {
    recs.push({ level: "danger", text: `Does not fit: needs ~${ctx.totalGb.toFixed(1)} GB but device has ${ctx.totalVramGb.toFixed(0)} GB.` });
  } else {
    recs.push({ level: "info", text: "CPU inference only — expect low tokens/sec. A GPU is strongly recommended." });
  }

  // Quantization advice
  if (!ctx.fitsOnGpu && ctx.hasGpu) {
    const q = QUANTIZATIONS[input.quantization];
    if (q.bitsPerWeight > 5) {
      recs.push({ level: "info", text: "Try Q4_K_M instead of a higher-precision format to roughly halve the weight footprint." });
    } else if (q.bitsPerWeight > 3) {
      recs.push({ level: "info", text: "Consider IQ3_M or an even smaller i-quant to make the weights fit." });
    }
    const deficit = ctx.totalGb - ctx.totalVramGb;
    if (deficit > 0) {
      recs.push({ level: "info", text: `Add ~${Math.ceil(deficit / 8) * 8} GB of VRAM/RAM, or split across multiple GPUs with tensor parallelism.` });
    }
  }

  // KV cache advice
  if (ctx.kvCacheAllUsersGb > ctx.weightsGb && input.kvCachePrecision === "FP16") {
    recs.push({ level: "info", text: "KV cache dominates memory — switch to FP8/INT8 quantized KV cache to halve it." });
  }
  if (input.contextTokens > ctx.maxContextOnDevice && ctx.hasGpu && ctx.maxContextOnDevice > 0) {
    recs.push({ level: "warning", text: `Requested ${input.contextTokens.toLocaleString()} ctx exceeds the ~${ctx.maxContextOnDevice.toLocaleString()} tokens that fit — reduce context or enable a quantized KV cache.` });
  }
  if (!input.flashAttention && input.contextTokens > 8192) {
    recs.push({ level: "info", text: "Enable Flash Attention to cut activation memory and speed up long-context prefill." });
  }
  if (!input.continuousBatching && input.concurrentUsers > 1) {
    recs.push({ level: "info", text: "Enable continuous batching (vLLM/TGI) to serve multiple users without reserving per-slot caches." });
  }

  // Throughput advice
  if (ctx.tokensPerSecond < 15 && ctx.hasGpu) {
    recs.push({ level: "warning", text: `~${ctx.tokensPerSecond.toFixed(0)} tok/s is below interactive speed — a higher-bandwidth GPU (e.g. RTX 4090/H100) would help.` });
  }

  // Apple advice
  if (ctx.unified) {
    if (ctx.fitsOnGpu) {
      recs.push({ level: "success", text: "Apple unified memory is sufficient — use MLX or llama.cpp Metal build for best throughput." });
    }
  } else if (ctx.gpuVendor === "AMD") {
    recs.push({ level: "info", text: "On AMD, use ROCm builds of llama.cpp/vLLM; verify your card is on the supported gfx list." });
  }

  return recs;
}
