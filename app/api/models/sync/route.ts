import { NextResponse } from "next/server";
import { fetchTrendingPresets } from "@/lib/hf";

// Returns the current most-popular text-generation models from Hugging Face as
// calculator-ready presets, so the preset dropdown can refresh itself without a
// code change. Results are cached briefly at the edge to avoid hammering HF.

export const runtime = "nodejs";
export const revalidate = 3600; // 1h

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const limit = Math.min(Math.max(Number(searchParams.get("limit")) || 12, 1), 24);

  const presets = await fetchTrendingPresets(limit);
  if (presets.length === 0) {
    return NextResponse.json(
      { error: "Could not reach Hugging Face or no complete models found.", presets: [] },
      { status: 502 }
    );
  }

  return NextResponse.json({ presets, count: presets.length, source: "huggingface" });
}
