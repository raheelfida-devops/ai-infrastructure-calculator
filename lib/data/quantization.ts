import type { Quantization, QuantizationId, KvCachePrecision } from "@/lib/types";

// Effective bits-per-weight values are drawn from llama.cpp / GGUF quantization
// measurements and vendor docs. K-quants and I-quants include block-scale
// metadata, so their real footprint is slightly above the nominal bit count.
export const QUANTIZATIONS: Record<QuantizationId, Quantization> = {
  FP32: { id: "FP32", label: "FP32 (full)", bitsPerWeight: 32, group: "full", note: "Full precision. Training / reference only." },
  FP16: { id: "FP16", label: "FP16", bitsPerWeight: 16, group: "full", note: "Half precision. Standard GPU inference baseline." },
  BF16: { id: "BF16", label: "BF16", bitsPerWeight: 16, group: "full", note: "Brain float. Same size as FP16, wider range." },
  FP8: { id: "FP8", label: "FP8 (E4M3)", bitsPerWeight: 8, group: "8bit", note: "Hopper/Blackwell & vLLM native 8-bit float." },
  INT8: { id: "INT8", label: "INT8", bitsPerWeight: 8, group: "8bit", note: "8-bit integer weights (bitsandbytes / TensorRT)." },
  Q8_0: { id: "Q8_0", label: "Q8_0 (GGUF)", bitsPerWeight: 8.5, group: "8bit", note: "GGUF 8-bit. Near-lossless, ~1.06 B/param." },
  Q6_K: { id: "Q6_K", label: "Q6_K (GGUF)", bitsPerWeight: 6.56, group: "kquant", note: "6-bit k-quant. Excellent quality." },
  Q5_K_M: { id: "Q5_K_M", label: "Q5_K_M (GGUF)", bitsPerWeight: 5.67, group: "kquant", note: "5-bit k-quant medium. Great quality/size." },
  Q5_0: { id: "Q5_0", label: "Q5_0 (GGUF)", bitsPerWeight: 5.5, group: "kquant", note: "Legacy 5-bit." },
  Q4_K_M: { id: "Q4_K_M", label: "Q4_K_M (GGUF)", bitsPerWeight: 4.83, group: "kquant", note: "The community default. Best size/quality trade-off." },
  Q4_0: { id: "Q4_0", label: "Q4_0 (GGUF)", bitsPerWeight: 4.5, group: "kquant", note: "Legacy 4-bit, fast." },
  IQ4_XS: { id: "IQ4_XS", label: "IQ4_XS", bitsPerWeight: 4.25, group: "iquant", note: "Importance-matrix 4-bit, smaller than Q4_K_M." },
  IQ3_M: { id: "IQ3_M", label: "IQ3_M", bitsPerWeight: 3.66, group: "iquant", note: "3-bit i-quant. Noticeable quality loss." },
  IQ2_XXS: { id: "IQ2_XXS", label: "IQ2_XXS", bitsPerWeight: 2.06, group: "iquant", note: "Extreme 2-bit. Only for very large models." },
  GPTQ: { id: "GPTQ", label: "GPTQ (4-bit)", bitsPerWeight: 4.25, group: "gptq-awq", note: "Post-training GPTQ, GPU-only (ExLlama/AutoGPTQ)." },
  AWQ: { id: "AWQ", label: "AWQ (4-bit)", bitsPerWeight: 4.25, group: "gptq-awq", note: "Activation-aware 4-bit. Strong vLLM support." },
  GGUF: { id: "GGUF", label: "GGUF (Q4_K_M default)", bitsPerWeight: 4.83, group: "container", note: "GGUF container; defaults to Q4_K_M sizing." },
  EXL2: { id: "EXL2", label: "EXL2 (~4.0 bpw)", bitsPerWeight: 4.0, group: "gptq-awq", note: "ExLlamaV2 variable bitrate; ~4 bpw default." },
  MLX: { id: "MLX", label: "MLX (4-bit)", bitsPerWeight: 4.5, group: "container", note: "Apple MLX quantized; ~4-bit group default." },
};

export const QUANT_LIST = Object.values(QUANTIZATIONS);

export const KV_PRECISION_BYTES: Record<KvCachePrecision, number> = {
  FP16: 2,
  FP8: 1,
  INT8: 1,
  Q4: 0.5,
};

export const KV_PRECISION_LABEL: Record<KvCachePrecision, string> = {
  FP16: "FP16 (2 bytes)",
  FP8: "FP8 (1 byte)",
  INT8: "INT8 (1 byte)",
  Q4: "Quantized Q4 (0.5 byte)",
};
