import { NextResponse } from "next/server";
import { readFile } from "node:fs/promises";
import path from "node:path";
import type { GpuSpec } from "@/lib/types";
import { GPUS, mergeGpus } from "@/lib/data/gpus";

// Serves the GPU catalog at runtime so specs can be updated WITHOUT a redeploy.
// Source precedence:
//   1. GPU_DATA_URL env  — a hosted JSON copy (fetched fresh each request)
//   2. ./data/gpus.json  — a file on the server the operator can edit
//   3. built-in list     — always the fallback baked into the bundle
// Override entries merge over the built-ins by id; new ids are appended.

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const VENDORS = ["NVIDIA", "AMD", "Intel", "Apple", "Huawei"];

/** Accept only well-formed entries so a malformed file can't corrupt the math. */
function validate(raw: unknown): GpuSpec[] {
  if (!Array.isArray(raw)) return [];
  const out: GpuSpec[] = [];
  for (const g of raw as any[]) {
    if (
      g &&
      typeof g.id === "string" &&
      typeof g.name === "string" &&
      VENDORS.includes(g.vendor) &&
      Number.isFinite(g.vramGb) &&
      Number.isFinite(g.bandwidthGbs) &&
      g.bandwidthGbs > 0 &&
      Number.isFinite(g.fp16Tflops) &&
      Number.isFinite(g.tdpWatts) &&
      Number.isFinite(g.msrpUsd)
    ) {
      out.push({
        id: g.id,
        name: g.name,
        vendor: g.vendor,
        vramGb: g.vramGb,
        bandwidthGbs: g.bandwidthGbs,
        fp16Tflops: g.fp16Tflops,
        tdpWatts: g.tdpWatts,
        msrpUsd: g.msrpUsd,
        tensorCores: !!g.tensorCores,
        unified: !!g.unified,
        ...(typeof g.note === "string" ? { note: g.note } : {}),
      });
    }
  }
  return out;
}

async function loadOverrides(): Promise<{ list: GpuSpec[]; source: string }> {
  const url = process.env.GPU_DATA_URL;
  if (url) {
    try {
      const res = await fetch(url, { cache: "no-store", signal: AbortSignal.timeout(8000) });
      if (res.ok) {
        const json = await res.json();
        return { list: validate(json?.gpus ?? json), source: "env-url" };
      }
    } catch {
      /* fall through to file */
    }
  }
  try {
    const file = await readFile(path.join(process.cwd(), "data", "gpus.json"), "utf8");
    const json = JSON.parse(file);
    return { list: validate(json?.gpus ?? json), source: "data/gpus.json" };
  } catch {
    return { list: [], source: "builtin" };
  }
}

export async function GET() {
  const { list, source } = await loadOverrides();
  const gpus = list.length > 0 ? mergeGpus(list) : GPUS;
  return NextResponse.json({
    gpus,
    source,
    overrideCount: list.length,
    builtinCount: GPUS.length,
  });
}
