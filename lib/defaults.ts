import type { CalculatorInput } from "@/lib/types";
import { MODEL_PRESET_MAP } from "@/lib/data/models";

export const CONTEXT_PRESETS = [4096, 8192, 16384, 32768, 65536, 131072, 262144];

export function defaultInput(): CalculatorInput {
  const m = MODEL_PRESET_MAP["llama31-8b"];
  return {
    modelName: m.name,
    paramsB: m.paramsB,
    isMoE: m.isMoE,
    experts: m.experts ?? 0,
    activeExperts: m.activeExperts ?? 0,
    activeParamsB: m.activeParamsB ?? m.paramsB,
    layers: m.layers,
    hiddenSize: m.hiddenSize,
    attnHeads: m.attnHeads,
    kvHeads: m.kvHeads,
    quantization: "Q4_K_M",
    contextTokens: 8192,
    kvCacheEnabled: true,
    kvCachePrecision: "FP16",
    concurrentUsers: 1,
    batchSize: 1,
    promptTokens: 512,
    outputTokens: 512,
    flashAttention: true,
    continuousBatching: false,
    speculativeDecoding: false,
    prefixCaching: false,
    slidingWindow: false,
    gpuId: "rtx4090",
    gpuCount: 1,
    systemRamGb: 32,
  };
}
