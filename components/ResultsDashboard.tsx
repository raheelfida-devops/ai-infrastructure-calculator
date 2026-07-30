"use client";

import { motion } from "framer-motion";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import {
  AlertTriangle,
  CheckCircle2,
  Cpu,
  DollarSign,
  Gauge,
  HardDrive,
  Info,
  MemoryStick,
  Server,
  Timer,
  TrendingUp,
  Users,
  XCircle,
  Zap,
} from "lucide-react";
import type { CalculationResult, CalculatorInput, Verdict } from "@/lib/types";
import { Card, Badge, ProgressBar, SectionTitle } from "@/components/ui/primitives";
import { AnimatedNumber } from "@/components/AnimatedNumber";
import { fmtGb, fmtTime, fmtUsd } from "@/lib/utils";

const verdictMeta: Record<Verdict, { label: string; variant: "success" | "warning" | "danger" | "info"; icon: React.ReactNode }> = {
  comfortable: { label: "Runs comfortably", variant: "success", icon: <CheckCircle2 size={18} /> },
  tight: { label: "Fits — tight", variant: "warning", icon: <AlertTriangle size={18} /> },
  insufficient: { label: "Does not fit", variant: "danger", icon: <XCircle size={18} /> },
  "cpu-only": { label: "CPU inference only", variant: "info", icon: <Cpu size={18} /> },
};

const MEM_COLORS = ["#818cf8", "#34d399", "#f59e0b", "#a78bfa", "#64748b", "#f43f5e"];

function StatCard({
  icon,
  label,
  value,
  decimals = 0,
  unit,
  sub,
  accent = "text-foreground",
  delay = 0,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  decimals?: number;
  unit?: string;
  sub?: string;
  accent?: string;
  delay?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay }}
      className="glass rounded-xl p-4"
    >
      <div className="mb-2 flex items-center gap-2 text-muted-foreground">
        <span className="text-primary">{icon}</span>
        <span className="text-[11px] font-medium uppercase tracking-wide">{label}</span>
      </div>
      <div className={`text-2xl font-bold tabular-nums ${accent}`}>
        <AnimatedNumber value={value} decimals={decimals} />
        {unit && <span className="ml-1 text-sm font-medium text-muted-foreground">{unit}</span>}
      </div>
      {sub && <div className="mt-0.5 text-xs text-muted-foreground">{sub}</div>}
    </motion.div>
  );
}

export function ResultsDashboard({
  result,
  input,
}: {
  result: CalculationResult;
  input: CalculatorInput;
}) {
  const v = verdictMeta[result.verdict];
  const m = result.memory;

  const memData = [
    { name: "Weights", value: m.weightsGb },
    { name: "KV cache", value: m.kvCacheAllUsersGb },
    { name: "Activations", value: m.activationsGb },
    { name: "Framework", value: m.frameworkOverheadGb },
    { name: "OS", value: m.osOverheadGb },
    { name: "Safety", value: m.safetyMarginGb },
  ].filter((d) => d.value > 0.001);

  const deviceCap = result.totalVramGb || input.systemRamGb;
  const fitPct = Math.min(100, (m.totalGb / (deviceCap || 1)) * 100);

  return (
    <div className="space-y-4">
      {/* VERDICT BANNER */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-strong flex flex-col gap-3 rounded-2xl p-5 sm:flex-row sm:items-center sm:justify-between"
      >
        <div className="flex items-center gap-3">
          <div
            className={`flex h-11 w-11 items-center justify-center rounded-xl ${
              v.variant === "success"
                ? "bg-success/15 text-success"
                : v.variant === "warning"
                ? "bg-warning/15 text-warning"
                : v.variant === "danger"
                ? "bg-danger/15 text-danger"
                : "bg-primary/15 text-primary"
            }`}
          >
            {v.icon}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-lg font-bold text-foreground">{v.label}</span>
              <Badge variant={v.variant}>{result.gpu ? result.gpu.name : "CPU"}</Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              {input.modelName} · {input.paramsB}B · {input.quantization} · {input.contextTokens.toLocaleString()} ctx
            </p>
          </div>
        </div>
        <div className="text-right">
          <div className="text-xs uppercase tracking-wide text-muted-foreground">Memory needed vs device</div>
          <div className="text-2xl font-bold tabular-nums text-foreground">
            {fmtGb(m.totalGb)} <span className="text-sm text-muted-foreground">/ {fmtGb(deviceCap)}</span>
          </div>
          <div className="mt-1 w-48">
            <ProgressBar
              value={m.totalGb}
              max={deviceCap}
              colorClass={fitPct > 100 ? "bg-danger" : fitPct > 85 ? "bg-warning" : "bg-success"}
            />
          </div>
        </div>
      </motion.div>

      {/* KEY STATS */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard icon={<MemoryStick size={16} />} label="Total RAM req." value={result.memory.totalGb} decimals={1} unit="GB" sub={`min ${result.minRamGb} · rec ${result.recommendedRamGb} · ideal ${result.idealRamGb}`} delay={0.02} />
        <StatCard icon={<Server size={16} />} label="VRAM required" value={result.vramRequiredGb} decimals={1} unit="GB" sub={result.gpu ? `${result.totalVramGb}GB available` : "no GPU"} accent={result.fitsOnGpu ? "text-success" : "text-danger"} delay={0.05} />
        <StatCard icon={<Gauge size={16} />} label="KV cache" value={result.memory.kvCacheAllUsersGb} decimals={2} unit="GB" sub={`${fmtGb(result.memory.kvCacheGb)}/seq · ${input.kvCachePrecision}`} delay={0.08} />
        <StatCard icon={<Zap size={16} />} label="Tokens / sec" value={result.tokensPerSecond} decimals={0} unit="tok/s" sub={`prefill ~${Math.round(result.prefillTps)} tok/s`} accent="text-accent" delay={0.11} />
        <StatCard icon={<Users size={16} />} label="Max users" value={result.concurrentUsersSupported} unit="users" sub="mem + throughput bound" delay={0.14} />
        <StatCard icon={<TrendingUp size={16} />} label="Max context" value={result.maxContextOnDevice} unit="tok" sub="that fits on device" delay={0.17} />
        <StatCard icon={<HardDrive size={16} />} label="Disk / load" value={result.diskGb} decimals={1} unit="GB" sub={`load ~${fmtTime(result.loadTimeSec)} @5GB/s`} delay={0.2} />
        <StatCard icon={<DollarSign size={16} />} label="Power" value={result.powerWatts} unit="W" sub={`${fmtUsd(result.costPerHourUsd)}/hr · ${fmtUsd(result.costPer1MTokensUsd)}/1M tok`} delay={0.23} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* MEMORY BREAKDOWN */}
        <Card>
          <SectionTitle icon={<MemoryStick size={16} />} title="Memory breakdown" subtitle="Where every gigabyte goes" />
          <div className="flex flex-col items-center gap-4 sm:flex-row">
            <div className="h-44 w-44 shrink-0">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={memData} dataKey="value" nameKey="name" innerRadius={45} outerRadius={70} paddingAngle={2} stroke="none">
                    {memData.map((_, i) => (
                      <Cell key={i} fill={MEM_COLORS[i % MEM_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ background: "#0d1220", border: "1px solid #2a3550", borderRadius: 10, fontSize: 12 }}
                    formatter={(val: number) => fmtGb(val)}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex-1 space-y-2">
              {memData.map((d, i) => (
                <div key={d.name}>
                  <div className="flex items-center justify-between text-xs">
                    <span className="flex items-center gap-1.5 text-muted-foreground">
                      <span className="h-2.5 w-2.5 rounded-full" style={{ background: MEM_COLORS[i % MEM_COLORS.length] }} />
                      {d.name}
                    </span>
                    <span className="font-semibold text-foreground">{fmtGb(d.value)}</span>
                  </div>
                  <ProgressBar value={d.value} max={m.totalGb} colorClass="bg-primary/70" />
                </div>
              ))}
            </div>
          </div>
        </Card>

        {/* RECOMMENDATIONS */}
        <Card>
          <SectionTitle icon={<Info size={16} />} title="Recommendation engine" subtitle="Actionable guidance for this configuration" />
          <div className="space-y-2">
            {result.recommendations.map((r, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.05 * i }}
                className={`flex items-start gap-2 rounded-lg border p-2.5 text-sm ${
                  r.level === "success"
                    ? "border-success/25 bg-success/10 text-success"
                    : r.level === "warning"
                    ? "border-warning/25 bg-warning/10 text-warning"
                    : r.level === "danger"
                    ? "border-danger/25 bg-danger/10 text-danger"
                    : "border-primary/25 bg-primary/10 text-foreground"
                }`}
              >
                <span className="mt-0.5 shrink-0">
                  {r.level === "success" ? <CheckCircle2 size={15} /> : r.level === "danger" ? <XCircle size={15} /> : r.level === "warning" ? <AlertTriangle size={15} /> : <Info size={15} />}
                </span>
                <span className="text-foreground/90">{r.text}</span>
              </motion.div>
            ))}
          </div>
        </Card>
      </div>

      {/* FORMULAS */}
      <Card>
        <SectionTitle icon={<Timer size={16} />} title="How these numbers were derived" subtitle="Transparent formulas & assumptions" />
        <div className="grid gap-3 md:grid-cols-2">
          <div className="rounded-lg border border-border bg-muted/20 p-3">
            <div className="mb-1 text-xs font-semibold text-primary">Weight footprint</div>
            <code className="block break-words text-[11px] leading-relaxed text-muted-foreground">{result.weightFormula}</code>
          </div>
          <div className="rounded-lg border border-border bg-muted/20 p-3">
            <div className="mb-1 text-xs font-semibold text-accent">KV cache</div>
            <code className="block break-words text-[11px] leading-relaxed text-muted-foreground">{result.kvFormula}</code>
          </div>
        </div>
        <div className="mt-3 grid gap-2 text-[11px] text-muted-foreground md:grid-cols-3">
          <p>• <span className="text-foreground/80">Decode TPS</span> = bandwidth × 0.8 efficiency ÷ active-weight bytes read per token (roofline, memory-bound).</p>
          <p>• <span className="text-foreground/80">Prefill TPS</span> = FP16 TFLOPS × 0.4 ÷ (2 × active params) — compute-bound.</p>
          <p>• <span className="text-foreground/80">Overheads</span>: framework 0.75GB+5%, OS/driver, +10% safety margin. Estimates carry ±15-25% variance across engines.</p>
        </div>
      </Card>
    </div>
  );
}
