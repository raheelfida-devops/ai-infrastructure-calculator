// Core domain types for the AI Infrastructure Sizing Calculator.

export type QuantizationId =
  | "FP32"
  | "FP16"
  | "BF16"
  | "FP8"
  | "INT8"
  | "Q8_0"
  | "Q6_K"
  | "Q5_K_M"
  | "Q5_0"
  | "Q4_K_M"
  | "Q4_0"
  | "IQ4_XS"
  | "IQ3_M"
  | "IQ2_XXS"
  | "GPTQ"
  | "AWQ"
  | "GGUF"
  | "EXL2"
  | "MLX";

export interface Quantization {
  id: QuantizationId;
  label: string;
  /** Effective bits used to store one weight (includes block metadata for k-quants). */
  bitsPerWeight: number;
  /** Bytes per element for KV-cache when this precision is used for cache, if applicable. */
  group: "full" | "8bit" | "kquant" | "iquant" | "gptq-awq" | "container";
  note: string;
}

export type KvCachePrecision = "FP16" | "FP8" | "INT8" | "Q4";

export interface GpuSpec {
  id: string;
  name: string;
  vendor: "NVIDIA" | "AMD" | "Intel" | "Apple" | "Huawei";
  vramGb: number;
  bandwidthGbs: number; // memory bandwidth GB/s
  fp16Tflops: number; // dense FP16/BF16 TFLOPS (approx)
  tdpWatts: number;
  msrpUsd: number;
  tensorCores: boolean;
  unified: boolean; // unified memory (Apple)
  note?: string;
}

export interface ModelPreset {
  id: string;
  name: string;
  paramsB: number;
  isMoE: boolean;
  activeParamsB?: number; // active params per token for MoE
  experts?: number;
  activeExperts?: number;
  layers: number;
  hiddenSize: number;
  attnHeads: number;
  kvHeads: number; // GQA: < attnHeads
  maxContext: number;
  family: string;
}

export interface CalculatorInput {
  // Model
  modelName: string;
  paramsB: number;
  isMoE: boolean;
  experts: number;
  activeExperts: number;
  activeParamsB: number; // effective active params/token (MoE)
  // Architecture (estimated or user-provided)
  layers: number;
  hiddenSize: number;
  attnHeads: number;
  kvHeads: number;
  // Quantization
  quantization: QuantizationId;
  // Context + KV cache
  contextTokens: number;
  kvCacheEnabled: boolean;
  kvCachePrecision: KvCachePrecision;
  // Workload
  concurrentUsers: number;
  batchSize: number;
  promptTokens: number;
  outputTokens: number;
  // Feature toggles
  flashAttention: boolean;
  continuousBatching: boolean;
  speculativeDecoding: boolean;
  prefixCaching: boolean;
  slidingWindow: boolean;
  // Hardware target
  gpuId: string;
  gpuCount: number;
  systemRamGb: number;
}

export interface MemoryBreakdown {
  weightsGb: number;
  kvCacheGb: number; // per single sequence at full context
  kvCacheAllUsersGb: number;
  activationsGb: number;
  frameworkOverheadGb: number;
  osOverheadGb: number;
  safetyMarginGb: number;
  totalGb: number;
}

export type Verdict = "comfortable" | "tight" | "insufficient" | "cpu-only";

export interface Recommendation {
  level: "success" | "warning" | "danger" | "info";
  text: string;
}

export interface CalculationResult {
  bytesPerWeight: number;
  modelSizeGb: number;
  memory: MemoryBreakdown;
  minRamGb: number;
  recommendedRamGb: number;
  idealRamGb: number;
  vramRequiredGb: number;
  diskGb: number;
  loadTimeSec: number;
  tokensPerSecond: number;
  prefillTps: number;
  maxContextOnDevice: number;
  concurrentUsersSupported: number;
  powerWatts: number;
  costPerHourUsd: number;
  costPer1MTokensUsd: number;
  verdict: Verdict;
  fitsOnGpu: boolean;
  recommendations: Recommendation[];
  kvFormula: string;
  weightFormula: string;
  gpu: GpuSpec | null;
  totalVramGb: number;
}
