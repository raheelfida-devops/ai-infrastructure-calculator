import type { ModelPreset } from "@/lib/types";

// Reference architectures for popular open models. Layer/hidden/head counts are
// taken from published model configs and drive exact KV-cache math when a
// preset is selected.
export const MODEL_PRESETS: ModelPreset[] = [
  { id: "llama32-1b", name: "Llama 3.2 1B", paramsB: 1.24, isMoE: false, layers: 16, hiddenSize: 2048, attnHeads: 32, kvHeads: 8, maxContext: 131072, family: "Llama" },
  { id: "llama32-3b", name: "Llama 3.2 3B", paramsB: 3.21, isMoE: false, layers: 28, hiddenSize: 3072, attnHeads: 24, kvHeads: 8, maxContext: 131072, family: "Llama" },
  { id: "llama31-8b", name: "Llama 3.1 8B", paramsB: 8.03, isMoE: false, layers: 32, hiddenSize: 4096, attnHeads: 32, kvHeads: 8, maxContext: 131072, family: "Llama" },
  { id: "llama33-70b", name: "Llama 3.3 70B", paramsB: 70.6, isMoE: false, layers: 80, hiddenSize: 8192, attnHeads: 64, kvHeads: 8, maxContext: 131072, family: "Llama" },
  { id: "llama31-405b", name: "Llama 3.1 405B", paramsB: 405, isMoE: false, layers: 126, hiddenSize: 16384, attnHeads: 128, kvHeads: 8, maxContext: 131072, family: "Llama" },
  { id: "qwen25-7b", name: "Qwen2.5 7B", paramsB: 7.6, isMoE: false, layers: 28, hiddenSize: 3584, attnHeads: 28, kvHeads: 4, maxContext: 131072, family: "Qwen" },
  { id: "qwen25-14b", name: "Qwen2.5 14B", paramsB: 14.7, isMoE: false, layers: 48, hiddenSize: 5120, attnHeads: 40, kvHeads: 8, maxContext: 131072, family: "Qwen" },
  { id: "qwen25-32b", name: "Qwen2.5 32B", paramsB: 32.5, isMoE: false, layers: 64, hiddenSize: 5120, attnHeads: 40, kvHeads: 8, maxContext: 131072, family: "Qwen" },
  { id: "qwen25-72b", name: "Qwen2.5 72B", paramsB: 72.7, isMoE: false, layers: 80, hiddenSize: 8192, attnHeads: 64, kvHeads: 8, maxContext: 131072, family: "Qwen" },
  { id: "mistral-7b", name: "Mistral 7B v0.3", paramsB: 7.25, isMoE: false, layers: 32, hiddenSize: 4096, attnHeads: 32, kvHeads: 8, maxContext: 32768, family: "Mistral" },
  { id: "mixtral-8x7b", name: "Mixtral 8x7B", paramsB: 46.7, isMoE: true, activeParamsB: 12.9, experts: 8, activeExperts: 2, layers: 32, hiddenSize: 4096, attnHeads: 32, kvHeads: 8, maxContext: 32768, family: "Mistral" },
  { id: "mixtral-8x22b", name: "Mixtral 8x22B", paramsB: 141, isMoE: true, activeParamsB: 39, experts: 8, activeExperts: 2, layers: 56, hiddenSize: 6144, attnHeads: 48, kvHeads: 8, maxContext: 65536, family: "Mistral" },
  { id: "gemma2-9b", name: "Gemma 2 9B", paramsB: 9.24, isMoE: false, layers: 42, hiddenSize: 3584, attnHeads: 16, kvHeads: 8, maxContext: 8192, family: "Gemma" },
  { id: "gemma2-27b", name: "Gemma 2 27B", paramsB: 27.2, isMoE: false, layers: 46, hiddenSize: 4608, attnHeads: 32, kvHeads: 16, maxContext: 8192, family: "Gemma" },
  { id: "phi3-mini", name: "Phi-3 Mini 3.8B", paramsB: 3.8, isMoE: false, layers: 32, hiddenSize: 3072, attnHeads: 32, kvHeads: 32, maxContext: 131072, family: "Phi" },
  { id: "deepseek-v3", name: "DeepSeek-V3 671B", paramsB: 671, isMoE: true, activeParamsB: 37, experts: 256, activeExperts: 8, layers: 61, hiddenSize: 7168, attnHeads: 128, kvHeads: 128, maxContext: 131072, family: "DeepSeek" },
  { id: "deepseek-r1", name: "DeepSeek-R1 671B", paramsB: 671, isMoE: true, activeParamsB: 37, experts: 256, activeExperts: 8, layers: 61, hiddenSize: 7168, attnHeads: 128, kvHeads: 128, maxContext: 131072, family: "DeepSeek" },
];

export const MODEL_PRESET_MAP: Record<string, ModelPreset> = Object.fromEntries(
  MODEL_PRESETS.map((m) => [m.id, m])
);

/**
 * Estimate transformer architecture (layers / hidden size / heads) from a raw
 * parameter count when no config is known. Uses the standard dense-transformer
 * relation params ≈ 12 · L · d² together with the empirical aspect ratio
 * d ≈ 128 · sqrt(L·k), calibrated against Llama/Qwen reference points.
 */
export function estimateArchitecture(paramsB: number): {
  layers: number;
  hiddenSize: number;
  attnHeads: number;
  kvHeads: number;
} {
  const table = [
    { p: 0.5, L: 12, d: 1536 },
    { p: 1, L: 16, d: 2048 },
    { p: 3, L: 28, d: 3072 },
    { p: 7, L: 32, d: 4096 },
    { p: 13, L: 40, d: 5120 },
    { p: 34, L: 60, d: 6656 },
    { p: 70, L: 80, d: 8192 },
    { p: 140, L: 88, d: 12288 },
    { p: 405, L: 126, d: 16384 },
    { p: 1000, L: 160, d: 20480 },
  ];
  let lo = table[0];
  let hi = table[table.length - 1];
  for (let i = 0; i < table.length - 1; i++) {
    if (paramsB >= table[i].p && paramsB <= table[i + 1].p) {
      lo = table[i];
      hi = table[i + 1];
      break;
    }
  }
  const span = hi.p - lo.p || 1;
  const t = Math.min(1, Math.max(0, (paramsB - lo.p) / span));
  const layers = Math.round(lo.L + (hi.L - lo.L) * t);
  const hiddenSize = Math.round((lo.d + (hi.d - lo.d) * t) / 128) * 128;
  const attnHeads = Math.max(8, Math.round(hiddenSize / 128));
  // Modern models use grouped-query attention with 8 KV heads by default.
  const kvHeads = attnHeads >= 16 ? 8 : attnHeads;
  return { layers, hiddenSize, attnHeads, kvHeads };
}
