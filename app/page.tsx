import { Cpu, Github, Sparkles } from "lucide-react";
import { Calculator } from "@/components/Calculator";

export default function Home() {
  return (
    <main className="mx-auto max-w-[1400px] px-4 py-6 sm:px-6 lg:px-8">
      <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/15 text-primary ring-1 ring-primary/30">
            <Cpu size={22} />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight sm:text-2xl">
              AI Infrastructure <span className="text-gradient">Calculator</span>
            </h1>
            <p className="text-sm text-muted-foreground">
              Estimate the hardware needed to run any LLM — VRAM, RAM, KV cache, tokens/sec, cost.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary">
            <Sparkles size={13} /> Live estimates
          </span>
          <a
            href="https://huggingface.co/models"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 rounded-full border border-border bg-muted/40 px-3 py-1.5 text-xs font-medium text-muted-foreground transition hover:text-foreground"
          >
            <Github size={13} /> HF models
          </a>
        </div>
      </header>

      <Calculator />

      <footer className="mt-10 border-t border-border/50 pt-5 text-center text-xs text-muted-foreground">
        Estimates use memory-bandwidth roofline models and published formulas for KV cache, quantization
        and overheads. Real-world results vary ±15–25% by inference engine, kernel and driver. Not affiliated
        with any vendor.
      </footer>
    </main>
  );
}
