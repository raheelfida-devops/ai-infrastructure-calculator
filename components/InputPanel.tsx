"use client";

import { useState } from "react";
import {
  Cpu,
  Boxes,
  Gauge,
  HardDrive,
  Layers,
  Search,
  Settings2,
  Sparkles,
  Users,
  Zap,
  Loader2,
  RefreshCw,
  DownloadCloud,
} from "lucide-react";
import type { CalculatorInput } from "@/lib/types";
import { estimateArchitecture } from "@/lib/data/models";
import { QUANT_LIST, QUANTIZATIONS } from "@/lib/data/quantization";
import { CONTEXT_PRESETS } from "@/lib/defaults";
import type { Catalog } from "@/components/useCatalog";
import {
  Card,
  Field,
  Select,
  Slider,
  TextInput,
  Toggle,
  SectionTitle,
  Badge,
} from "@/components/ui/primitives";
import { weightBytes } from "@/lib/calculations";
import { fmtGb } from "@/lib/utils";

type Patch = (p: Partial<CalculatorInput>) => void;

export function InputPanel({
  input,
  patch,
  catalog,
}: {
  input: CalculatorInput;
  patch: Patch;
  catalog: Catalog;
}) {
  const [advanced, setAdvanced] = useState(false);
  const [hfId, setHfId] = useState("");
  const [hfState, setHfState] = useState<"idle" | "loading" | "error">("idle");
  const [hfMsg, setHfMsg] = useState("");

  function applyPreset(id: string) {
    const m = catalog.presetMap[id];
    if (!m) return;
    patch({
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
    });
  }

  function onParamsChange(paramsB: number) {
    // Re-estimate architecture when params change manually (dense assumption).
    const arch = estimateArchitecture(paramsB);
    patch({
      paramsB,
      layers: arch.layers,
      hiddenSize: arch.hiddenSize,
      attnHeads: arch.attnHeads,
      kvHeads: arch.kvHeads,
      activeParamsB: input.isMoE ? input.activeParamsB : paramsB,
    });
  }

  async function lookupHf() {
    if (!hfId.trim()) return;
    setHfState("loading");
    setHfMsg("");
    try {
      const res = await fetch(`/api/hf?id=${encodeURIComponent(hfId.trim())}`);
      const data = await res.json();
      if (!res.ok) {
        setHfState("error");
        setHfMsg(data.error ?? "Lookup failed");
        return;
      }
      const arch =
        data.layers && data.hiddenSize
          ? data
          : { ...data, ...estimateArchitecture(data.paramsB || input.paramsB) };
      patch({
        modelName: data.name,
        paramsB: data.paramsB || input.paramsB,
        isMoE: data.isMoE,
        experts: data.experts || 0,
        activeExperts: data.activeExperts || 0,
        activeParamsB: data.isMoE && data.activeParamsB ? data.activeParamsB : data.paramsB || input.paramsB,
        layers: arch.layers,
        hiddenSize: arch.hiddenSize,
        attnHeads: arch.attnHeads,
        kvHeads: arch.kvHeads,
        contextTokens: Math.min(input.contextTokens, data.maxContext || input.contextTokens),
      });
      setHfState("idle");
      setHfMsg(`Loaded ${data.name} (${data.paramsB}B)`);
    } catch {
      setHfState("error");
      setHfMsg("Network error contacting Hugging Face");
    }
  }

  const projectedSize = fmtGb(weightBytes(input.paramsB, input.quantization) / 1024 ** 3);

  return (
    <div className="space-y-4">
      {/* MODEL */}
      <Card>
        <SectionTitle icon={<Boxes size={16} />} title="Model" subtitle="Pick a preset or look one up on Hugging Face" />

        <div className="space-y-3">
          <Field label="Preset model">
            <div className="flex gap-2">
              <Select
                value={catalog.presets.find((m) => m.name === input.modelName)?.id ?? ""}
                onChange={(e) => applyPreset(e.target.value)}
              >
                <option value="">— custom / from lookup —</option>
                {catalog.presets.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name} · {m.paramsB}B {m.isMoE ? "(MoE)" : ""}
                    {m.id.startsWith("hf:") ? " · HF" : ""}
                  </option>
                ))}
              </Select>
              <button
                type="button"
                onClick={() => catalog.syncModels()}
                disabled={catalog.modelsState === "loading"}
                title="Sync the latest trending models from Hugging Face into this list"
                className="flex shrink-0 items-center gap-1.5 rounded-lg border border-border bg-muted/40 px-2.5 text-xs font-medium text-muted-foreground transition hover:text-foreground disabled:opacity-50"
              >
                {catalog.modelsState === "loading" ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <DownloadCloud size={14} />
                )}
                Sync HF
              </button>
            </div>
          </Field>
          {catalog.modelsMsg && (
            <p
              className={`-mt-1 text-xs ${
                catalog.modelsState === "error" ? "text-danger" : "text-success"
              }`}
            >
              {catalog.modelsMsg}
            </p>
          )}

          <Field label="Hugging Face lookup" hint="e.g. meta-llama/Llama-3.1-8B">
            <div className="flex gap-2">
              <TextInput
                placeholder="org/model-id"
                value={hfId}
                onChange={(e) => setHfId(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && lookupHf()}
              />
              <button
                type="button"
                onClick={lookupHf}
                disabled={hfState === "loading"}
                className="flex shrink-0 items-center gap-1.5 rounded-lg bg-primary px-3 text-sm font-medium text-primary-foreground transition hover:opacity-90 disabled:opacity-50"
              >
                {hfState === "loading" ? <Loader2 size={15} className="animate-spin" /> : <Search size={15} />}
                Fetch
              </button>
            </div>
          </Field>
          {hfMsg && (
            <p className={`text-xs ${hfState === "error" ? "text-danger" : "text-success"}`}>{hfMsg}</p>
          )}

          <Field label={`Parameters: ${input.paramsB}B`} hint="1B – 1000B">
            <Slider value={input.paramsB} min={0.5} max={1000} step={0.5} onChange={onParamsChange} />
          </Field>

          <div className="grid grid-cols-2 gap-2">
            <Toggle label="Mixture of Experts" checked={input.isMoE} onChange={(v) => patch({ isMoE: v, activeParamsB: v ? input.activeParamsB : input.paramsB })} />
            <div className="flex items-center justify-end">
              <Badge variant="info">arch: {input.layers}L · {input.hiddenSize}d · {input.kvHeads}kv</Badge>
            </div>
          </div>

          {input.isMoE && (
            <div className="grid grid-cols-3 gap-2">
              <Field label="Experts">
                <TextInput type="number" value={input.experts} onChange={(e) => patch({ experts: +e.target.value })} />
              </Field>
              <Field label="Active">
                <TextInput type="number" value={input.activeExperts} onChange={(e) => patch({ activeExperts: +e.target.value })} />
              </Field>
              <Field label="Active B/tok">
                <TextInput type="number" value={input.activeParamsB} onChange={(e) => patch({ activeParamsB: +e.target.value })} />
              </Field>
            </div>
          )}
        </div>
      </Card>

      {/* QUANTIZATION */}
      <Card>
        <SectionTitle icon={<Layers size={16} />} title="Quantization" subtitle={QUANTIZATIONS[input.quantization].note} />
        <div className="grid grid-cols-2 gap-3">
          <Field label="Format">
            <Select value={input.quantization} onChange={(e) => patch({ quantization: e.target.value as CalculatorInput["quantization"] })}>
              {QUANT_LIST.map((q) => (
                <option key={q.id} value={q.id}>
                  {q.label} · {q.bitsPerWeight} bpw
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Projected model size">
            <div className="flex h-[38px] items-center rounded-lg border border-border bg-muted/30 px-3 text-sm font-semibold text-accent">
              {projectedSize}
            </div>
          </Field>
        </div>
      </Card>

      {/* CONTEXT + KV */}
      <Card>
        <SectionTitle icon={<Gauge size={16} />} title="Context & KV Cache" subtitle="Attention memory grows linearly with context length" />
        <div className="space-y-3">
          <Field label="Context window (tokens)">
            <div className="flex flex-wrap gap-1.5">
              {CONTEXT_PRESETS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => patch({ contextTokens: c })}
                  className={`rounded-md px-2.5 py-1 text-xs font-medium transition ${
                    input.contextTokens === c
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted/40 text-muted-foreground hover:bg-muted"
                  }`}
                >
                  {c >= 1024 ? `${c / 1024}K` : c}
                </button>
              ))}
            </div>
          </Field>
          <Field label={`Custom context: ${input.contextTokens.toLocaleString()} tokens`}>
            <Slider value={input.contextTokens} min={1024} max={262144} step={1024} onChange={(v) => patch({ contextTokens: v })} />
          </Field>
          <div className="grid grid-cols-2 gap-2">
            <Toggle label="Enable KV cache" checked={input.kvCacheEnabled} onChange={(v) => patch({ kvCacheEnabled: v })} />
            <Field label="KV precision">
              <Select
                value={input.kvCachePrecision}
                onChange={(e) => patch({ kvCachePrecision: e.target.value as CalculatorInput["kvCachePrecision"] })}
                disabled={!input.kvCacheEnabled}
              >
                <option value="FP16">FP16 (2 B)</option>
                <option value="FP8">FP8 (1 B)</option>
                <option value="INT8">INT8 (1 B)</option>
                <option value="Q4">Quantized Q4 (0.5 B)</option>
              </Select>
            </Field>
          </div>
        </div>
      </Card>

      {/* WORKLOAD */}
      <Card>
        <SectionTitle icon={<Users size={16} />} title="Workload" subtitle="Concurrency and request shape" />
        <div className="grid grid-cols-2 gap-3">
          <Field label={`Concurrent users: ${input.concurrentUsers}`}>
            <Slider value={input.concurrentUsers} min={1} max={256} step={1} onChange={(v) => patch({ concurrentUsers: v })} />
          </Field>
          <Field label={`Batch size: ${input.batchSize}`}>
            <Slider value={input.batchSize} min={1} max={64} step={1} onChange={(v) => patch({ batchSize: v })} />
          </Field>
          <Field label="Prompt tokens (avg)">
            <TextInput type="number" value={input.promptTokens} onChange={(e) => patch({ promptTokens: +e.target.value })} />
          </Field>
          <Field label="Output tokens (avg)">
            <TextInput type="number" value={input.outputTokens} onChange={(e) => patch({ outputTokens: +e.target.value })} />
          </Field>
        </div>
      </Card>

      {/* HARDWARE */}
      <Card>
        <div className="flex items-start justify-between">
          <SectionTitle icon={<Cpu size={16} />} title="Hardware target" subtitle="GPU / accelerator to size against" />
          <button
            type="button"
            onClick={() => catalog.refreshGpus()}
            disabled={catalog.gpusState === "loading"}
            title={catalog.gpusMsg || "Reload the GPU catalog from the server (data/gpus.json)"}
            className="mt-0.5 flex shrink-0 items-center gap-1 rounded-md border border-border bg-muted/40 px-2 py-1 text-[11px] font-medium text-muted-foreground transition hover:text-foreground disabled:opacity-50"
          >
            <RefreshCw size={12} className={catalog.gpusState === "loading" ? "animate-spin" : ""} />
            {catalog.gpus.length} GPUs
          </button>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Accelerator">
            <Select value={input.gpuId} onChange={(e) => patch({ gpuId: e.target.value })}>
              <option value="none">CPU only (no GPU)</option>
              {["NVIDIA", "AMD", "Intel", "Apple", "Huawei"].map((vendor) => (
                <optgroup key={vendor} label={vendor}>
                  {catalog.gpus.filter((g) => g.vendor === vendor).map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.name} · {g.vramGb}GB
                    </option>
                  ))}
                </optgroup>
              ))}
            </Select>
          </Field>
          <Field label={`GPU count: ${input.gpuCount}`}>
            <Slider value={input.gpuCount} min={1} max={8} step={1} onChange={(v) => patch({ gpuCount: v })} />
          </Field>
          <Field label="System RAM (GB)">
            <TextInput type="number" value={input.systemRamGb} onChange={(e) => patch({ systemRamGb: +e.target.value })} />
          </Field>
          <Field label="Engine features">
            <div className="flex h-[38px] items-center">
              <Badge variant="muted">
                {[input.flashAttention && "FA", input.continuousBatching && "CB", input.speculativeDecoding && "SD"].filter(Boolean).join(" · ") || "baseline"}
              </Badge>
            </div>
          </Field>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-2 md:grid-cols-3">
          <Toggle label="Flash Attention" checked={input.flashAttention} onChange={(v) => patch({ flashAttention: v })} />
          <Toggle label="Continuous batching" checked={input.continuousBatching} onChange={(v) => patch({ continuousBatching: v })} />
          <Toggle label="Speculative decode" checked={input.speculativeDecoding} onChange={(v) => patch({ speculativeDecoding: v })} />
        </div>
      </Card>

      {/* ADVANCED */}
      <Card>
        <button
          type="button"
          onClick={() => setAdvanced((a) => !a)}
          className="flex w-full items-center justify-between"
        >
          <SectionTitle icon={<Settings2 size={16} />} title="Advanced / expert settings" subtitle="Fine-tune architecture and engine behavior" />
          <Sparkles size={16} className={advanced ? "text-primary" : "text-muted-foreground"} />
        </button>
        {advanced && (
          <div className="mt-2 space-y-3 animate-fade-up">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Layers">
                <TextInput type="number" value={input.layers} onChange={(e) => patch({ layers: +e.target.value })} />
              </Field>
              <Field label="Hidden size">
                <TextInput type="number" value={input.hiddenSize} onChange={(e) => patch({ hiddenSize: +e.target.value })} />
              </Field>
              <Field label="Attention heads">
                <TextInput type="number" value={input.attnHeads} onChange={(e) => patch({ attnHeads: +e.target.value })} />
              </Field>
              <Field label="KV heads (GQA)">
                <TextInput type="number" value={input.kvHeads} onChange={(e) => patch({ kvHeads: +e.target.value })} />
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-2 md:grid-cols-2">
              <Toggle label="Prefix caching" checked={input.prefixCaching} onChange={(v) => patch({ prefixCaching: v })} />
              <Toggle label="Sliding window" checked={input.slidingWindow} onChange={(v) => patch({ slidingWindow: v })} />
            </div>
            <p className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
              <Zap size={12} className="text-warning" />
              Tensor/pipeline parallelism is modeled via GPU count with ~90%/GPU scaling efficiency.
            </p>
          </div>
        )}
      </Card>
    </div>
  );
}
