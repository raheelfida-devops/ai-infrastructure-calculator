"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { GpuSpec, ModelPreset } from "@/lib/types";
import { GPUS, gpuMapOf } from "@/lib/data/gpus";
import { MODEL_PRESETS } from "@/lib/data/models";

export type SyncState = "idle" | "loading" | "done" | "error";

export interface Catalog {
  gpus: GpuSpec[];
  gpuMap: Record<string, GpuSpec>;
  presets: ModelPreset[];
  presetMap: Record<string, ModelPreset>;
  // Model preset sync (Hugging Face)
  syncModels: () => Promise<void>;
  modelsState: SyncState;
  modelsMsg: string;
  // GPU catalog refresh (runtime JSON)
  refreshGpus: () => Promise<void>;
  gpusState: SyncState;
  gpusMsg: string;
}

/**
 * Central data catalog for the calculator. GPUs load from /api/gpus on mount
 * (runtime-editable JSON, merged over the built-ins). Model presets start from
 * the bundled list and can be extended live with trending models from HF.
 */
export function useCatalog(): Catalog {
  const [gpus, setGpus] = useState<GpuSpec[]>(GPUS);
  const [presets, setPresets] = useState<ModelPreset[]>(MODEL_PRESETS);

  const [modelsState, setModelsState] = useState<SyncState>("idle");
  const [modelsMsg, setModelsMsg] = useState("");
  const [gpusState, setGpusState] = useState<SyncState>("idle");
  const [gpusMsg, setGpusMsg] = useState("");

  const refreshGpus = useCallback(async () => {
    setGpusState("loading");
    setGpusMsg("");
    try {
      const res = await fetch("/api/gpus", { cache: "no-store" });
      const data = await res.json();
      if (!res.ok || !Array.isArray(data.gpus)) throw new Error();
      setGpus(data.gpus);
      setGpusState("done");
      setGpusMsg(
        data.overrideCount > 0
          ? `${data.gpus.length} GPUs · ${data.overrideCount} from ${data.source}`
          : `${data.gpus.length} built-in GPUs`
      );
    } catch {
      setGpusState("error");
      setGpusMsg("Could not load GPU catalog — using built-ins");
    }
  }, []);

  // Load the runtime GPU catalog once on mount.
  useEffect(() => {
    void refreshGpus();
  }, [refreshGpus]);

  const syncModels = useCallback(async () => {
    setModelsState("loading");
    setModelsMsg("");
    try {
      const res = await fetch("/api/models/sync?limit=16", { cache: "no-store" });
      const data = await res.json();
      if (!res.ok || !Array.isArray(data.presets) || data.presets.length === 0) {
        throw new Error(data?.error);
      }
      // Merge: built-ins first, then synced (deduped by id), synced replacing.
      setPresets((prev) => {
        const map = new Map<string, ModelPreset>();
        for (const p of MODEL_PRESETS) map.set(p.id, p);
        for (const p of prev) map.set(p.id, p);
        for (const p of data.presets as ModelPreset[]) map.set(p.id, p);
        return Array.from(map.values());
      });
      setModelsState("done");
      setModelsMsg(`Added ${data.count} trending models from Hugging Face`);
    } catch (e) {
      setModelsState("error");
      setModelsMsg(
        e instanceof Error && e.message ? e.message : "Could not reach Hugging Face"
      );
    }
  }, []);

  const gpuMap = useMemo(() => gpuMapOf(gpus), [gpus]);
  const presetMap = useMemo(
    () => Object.fromEntries(presets.map((p) => [p.id, p])),
    [presets]
  );

  return {
    gpus,
    gpuMap,
    presets,
    presetMap,
    syncModels,
    modelsState,
    modelsMsg,
    refreshGpus,
    gpusState,
    gpusMsg,
  };
}
