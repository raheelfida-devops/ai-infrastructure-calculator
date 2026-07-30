import type { GpuSpec } from "@/lib/types";

// Memory bandwidth is the dominant factor for single-stream LLM decode speed,
// so it is the headline spec here. FP16 TFLOPS drive prefill/prompt throughput.
// Values are approximate public specs / MSRP and are used for relative sizing.
export const GPUS: GpuSpec[] = [
  // ---- NVIDIA consumer ----
  { id: "rtx3060", name: "RTX 3060 12GB", vendor: "NVIDIA", vramGb: 12, bandwidthGbs: 360, fp16Tflops: 51, tdpWatts: 170, msrpUsd: 329, tensorCores: true, unified: false },
  { id: "rtx4060ti16", name: "RTX 4060 Ti 16GB", vendor: "NVIDIA", vramGb: 16, bandwidthGbs: 288, fp16Tflops: 88, tdpWatts: 165, msrpUsd: 499, tensorCores: true, unified: false },
  { id: "rtx4070ti", name: "RTX 4070 Ti Super", vendor: "NVIDIA", vramGb: 16, bandwidthGbs: 672, fp16Tflops: 176, tdpWatts: 285, msrpUsd: 799, tensorCores: true, unified: false },
  { id: "rtx3090", name: "RTX 3090 24GB", vendor: "NVIDIA", vramGb: 24, bandwidthGbs: 936, fp16Tflops: 71, tdpWatts: 350, msrpUsd: 1499, tensorCores: true, unified: false },
  { id: "rtx4090", name: "RTX 4090 24GB", vendor: "NVIDIA", vramGb: 24, bandwidthGbs: 1008, fp16Tflops: 330, tdpWatts: 450, msrpUsd: 1599, tensorCores: true, unified: false },
  { id: "rtx5090", name: "RTX 5090 32GB", vendor: "NVIDIA", vramGb: 32, bandwidthGbs: 1792, fp16Tflops: 419, tdpWatts: 575, msrpUsd: 1999, tensorCores: true, unified: false },
  // ---- NVIDIA data center ----
  { id: "l40s", name: "L40S 48GB", vendor: "NVIDIA", vramGb: 48, bandwidthGbs: 864, fp16Tflops: 362, tdpWatts: 350, msrpUsd: 9000, tensorCores: true, unified: false },
  { id: "a100-80", name: "A100 80GB SXM", vendor: "NVIDIA", vramGb: 80, bandwidthGbs: 2039, fp16Tflops: 312, tdpWatts: 400, msrpUsd: 15000, tensorCores: true, unified: false },
  { id: "h100", name: "H100 80GB SXM", vendor: "NVIDIA", vramGb: 80, bandwidthGbs: 3350, fp16Tflops: 990, tdpWatts: 700, msrpUsd: 30000, tensorCores: true, unified: false },
  { id: "h200", name: "H200 141GB", vendor: "NVIDIA", vramGb: 141, bandwidthGbs: 4800, fp16Tflops: 990, tdpWatts: 700, msrpUsd: 32000, tensorCores: true, unified: false },
  { id: "b200", name: "B200 192GB", vendor: "NVIDIA", vramGb: 192, bandwidthGbs: 8000, fp16Tflops: 2250, tdpWatts: 1000, msrpUsd: 40000, tensorCores: true, unified: false },
  // ---- AMD ----
  { id: "rx7900xtx", name: "Radeon RX 7900 XTX", vendor: "AMD", vramGb: 24, bandwidthGbs: 960, fp16Tflops: 123, tdpWatts: 355, msrpUsd: 999, tensorCores: false, unified: false },
  { id: "mi300x", name: "Instinct MI300X 192GB", vendor: "AMD", vramGb: 192, bandwidthGbs: 5300, fp16Tflops: 1307, tdpWatts: 750, msrpUsd: 15000, tensorCores: true, unified: false },
  // ---- Intel ----
  { id: "arc-a770", name: "Intel Arc A770 16GB", vendor: "Intel", vramGb: 16, bandwidthGbs: 560, fp16Tflops: 39, tdpWatts: 225, msrpUsd: 329, tensorCores: false, unified: false },
  { id: "arc-b580", name: "Intel Arc B580 12GB", vendor: "Intel", vramGb: 12, bandwidthGbs: 456, fp16Tflops: 45, tdpWatts: 190, msrpUsd: 249, tensorCores: false, unified: false },
  // ---- Huawei ----
  { id: "ascend910b", name: "Huawei Ascend 910B", vendor: "Huawei", vramGb: 64, bandwidthGbs: 1600, fp16Tflops: 400, tdpWatts: 400, msrpUsd: 12000, tensorCores: true, unified: false, note: "CANN/MindSpore stack." },
  // ---- Apple Silicon (unified memory) ----
  { id: "m1-max", name: "Apple M1 Max (32GB)", vendor: "Apple", vramGb: 32, bandwidthGbs: 400, fp16Tflops: 21, tdpWatts: 60, msrpUsd: 2000, tensorCores: false, unified: true },
  { id: "m2-max", name: "Apple M2 Max (64GB)", vendor: "Apple", vramGb: 64, bandwidthGbs: 400, fp16Tflops: 27, tdpWatts: 60, msrpUsd: 2600, tensorCores: false, unified: true },
  { id: "m3-max", name: "Apple M3 Max (128GB)", vendor: "Apple", vramGb: 128, bandwidthGbs: 400, fp16Tflops: 28, tdpWatts: 65, msrpUsd: 3500, tensorCores: false, unified: true },
  { id: "m4-max", name: "Apple M4 Max (128GB)", vendor: "Apple", vramGb: 128, bandwidthGbs: 546, fp16Tflops: 34, tdpWatts: 65, msrpUsd: 3900, tensorCores: false, unified: true },
  { id: "m2-ultra", name: "Apple M2 Ultra (192GB)", vendor: "Apple", vramGb: 192, bandwidthGbs: 800, fp16Tflops: 54, tdpWatts: 110, msrpUsd: 5600, tensorCores: false, unified: true },
  { id: "m3-ultra", name: "Apple M3 Ultra (512GB)", vendor: "Apple", vramGb: 512, bandwidthGbs: 819, fp16Tflops: 56, tdpWatts: 120, msrpUsd: 9500, tensorCores: false, unified: true },
];

export const GPU_MAP: Record<string, GpuSpec> = Object.fromEntries(
  GPUS.map((g) => [g.id, g])
);

/** Build an id→spec map from any GPU list. */
export function gpuMapOf(list: GpuSpec[]): Record<string, GpuSpec> {
  return Object.fromEntries(list.map((g) => [g.id, g]));
}

/**
 * Merge a runtime/override GPU list over the built-in catalog. Entries with a
 * matching id replace the built-in; new ids are appended. The built-in list is
 * always the base, so a bad override file can never remove hardware entirely.
 */
export function mergeGpus(overrides: GpuSpec[]): GpuSpec[] {
  const map = gpuMapOf(GPUS);
  for (const g of overrides) map[g.id] = g;
  return Object.values(map);
}

// Local US electricity price used for running-cost estimates ($/kWh).
export const ELECTRICITY_USD_PER_KWH = 0.16;
