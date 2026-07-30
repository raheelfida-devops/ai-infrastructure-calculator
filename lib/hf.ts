// Shared, server-only Hugging Face helpers used by the model lookup and the
// "sync latest models" endpoints. Kept in one place so both routes parse the
// HF API identically.

import type { ModelPreset } from "@/lib/types";

const HF_BASE = "https://huggingface.co";

export interface HfConfig {
  num_hidden_layers?: number;
  n_layer?: number;
  hidden_size?: number;
  n_embd?: number;
  num_attention_heads?: number;
  n_head?: number;
  num_key_value_heads?: number;
  max_position_embeddings?: number;
  num_local_experts?: number;
  num_experts?: number;
  n_routed_experts?: number;
  num_experts_per_tok?: number;
  model_type?: string;
}

export interface ResolvedModel {
  id: string;
  name: string;
  paramsB: number;
  layers: number;
  hiddenSize: number;
  attnHeads: number;
  kvHeads: number;
  maxContext: number;
  isMoE: boolean;
  experts: number;
  activeExperts: number;
  activeParamsB?: number;
  family: string;
  source: "huggingface";
}

async function getJson(url: string, timeoutMs = 8000): Promise<any | null> {
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "ai-infra-calculator" },
      cache: "no-store",
      signal: AbortSignal.timeout(timeoutMs),
    });
    if (!res.ok) {
      console.error("[hf] non-ok", res.status, url);
      return null;
    }
    return await res.json();
  } catch (e: any) {
    console.error("[hf] fetch error", e?.name, e?.message, e?.cause?.code, url);
    return null;
  }
}

/** Sum the safetensors dtype buckets into a total parameter count. */
function paramsFromSafetensors(st: any): number {
  if (!st) return 0;
  if (st.total) return st.total;
  if (st.parameters) {
    return Object.values(st.parameters as Record<string, number>).reduce(
      (a, b) => a + Number(b || 0),
      0
    );
  }
  return 0;
}

/** Turn raw HF metadata + config into normalized architecture numbers. */
export function parseModel(id: string, meta: any, config: HfConfig): ResolvedModel {
  const totalParams = paramsFromSafetensors(meta?.safetensors);
  const layers = config.num_hidden_layers ?? config.n_layer ?? 0;
  const hiddenSize = config.hidden_size ?? config.n_embd ?? 0;
  const attnHeads = config.num_attention_heads ?? config.n_head ?? 0;
  const kvHeads = config.num_key_value_heads ?? attnHeads;
  const maxContext = config.max_position_embeddings ?? 0;
  const experts =
    config.num_local_experts ?? config.num_experts ?? config.n_routed_experts ?? 0;
  const activeExperts = config.num_experts_per_tok ?? 0;
  const isMoE = experts > 0;
  const paramsB = totalParams > 0 ? +(totalParams / 1e9).toFixed(2) : 0;

  // MoE active-parameter count is not published directly; approximate it from
  // the routed-expert fraction when both counts are known.
  let activeParamsB: number | undefined;
  if (isMoE && experts > 0 && activeExperts > 0 && paramsB > 0) {
    activeParamsB = +(paramsB * (activeExperts / experts)).toFixed(2);
  }

  return {
    id,
    name: id.split("/").pop() ?? id,
    paramsB,
    layers,
    hiddenSize,
    attnHeads,
    kvHeads,
    maxContext,
    isMoE,
    experts,
    activeExperts,
    activeParamsB,
    family: config.model_type ?? id.split("/")[0] ?? "unknown",
    source: "huggingface",
  };
}

/** Encode a repo id for a URL path while preserving the org/model slash. */
function encodeId(id: string): string {
  return id.split("/").map(encodeURIComponent).join("/");
}

/** Look up a single model by repo id (used by /api/hf). Returns null if absent. */
export async function lookupModel(id: string): Promise<ResolvedModel | null> {
  const enc = encodeId(id);
  const meta = await getJson(
    `${HF_BASE}/api/models/${enc}?expand[]=safetensors&expand[]=config`
  );
  if (!meta) return null;
  // The expand[]=config payload is truncated (model_type only, no layer/dim
  // counts), so always pull the full config.json for architecture and merge the
  // sparse expand config underneath it as a fallback.
  const fullConfig = await getJson(`${HF_BASE}/${enc}/raw/main/config.json`);
  const config: HfConfig = { ...(meta?.config ?? {}), ...(fullConfig ?? {}) };
  return parseModel(id, meta, config);
}

/**
 * Fetch the current most-popular text-generation models and resolve each into a
 * calculator-ready preset. Only models with complete architecture (params +
 * layers + hidden size) are returned, so synced presets stay trustworthy.
 */
export async function fetchTrendingPresets(limit = 12): Promise<ModelPreset[]> {
  const list = await getJson(
    `${HF_BASE}/api/models?pipeline_tag=text-generation&sort=downloads&direction=-1&limit=${Math.min(
      limit * 2,
      40
    )}`
  );
  if (!Array.isArray(list)) return [];

  const ids: string[] = list
    .map((m: any) => m?.id ?? m?.modelId)
    .filter((x: unknown): x is string => typeof x === "string");

  const resolved = await Promise.all(ids.map((id) => lookupModel(id)));

  const presets: ModelPreset[] = [];
  for (const r of resolved) {
    if (!r) continue;
    if (r.paramsB <= 0 || r.layers <= 0 || r.hiddenSize <= 0) continue; // incomplete
    presets.push({
      id: `hf:${r.id}`,
      name: r.name,
      paramsB: r.paramsB,
      isMoE: r.isMoE,
      activeParamsB: r.activeParamsB,
      experts: r.experts || undefined,
      activeExperts: r.activeExperts || undefined,
      layers: r.layers,
      hiddenSize: r.hiddenSize,
      attnHeads: r.attnHeads,
      kvHeads: r.kvHeads,
      maxContext: r.maxContext || 8192,
      family: r.family,
    });
    if (presets.length >= limit) break;
  }
  return presets;
}
