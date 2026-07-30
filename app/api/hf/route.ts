import { NextResponse } from "next/server";
import { lookupModel } from "@/lib/hf";

// Server-side Hugging Face lookup. Pulls the safetensors parameter total and
// config.json architecture so the calculator can auto-fill exact numbers.
// Runs on the server to avoid browser CORS restrictions.

export const runtime = "nodejs";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id")?.trim();
  if (!id) {
    return NextResponse.json({ error: "Missing model id" }, { status: 400 });
  }

  const model = await lookupModel(id);
  if (!model) {
    return NextResponse.json(
      { error: `Model "${id}" not found or is gated/private.` },
      { status: 404 }
    );
  }

  return NextResponse.json(model);
}
