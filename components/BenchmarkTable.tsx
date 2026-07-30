"use client";

import { useMemo } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Tooltip,
  Cell,
} from "recharts";
import { CheckCircle2, XCircle, Cpu } from "lucide-react";
import type { CalculatorInput, GpuSpec } from "@/lib/types";
import { calculate } from "@/lib/calculations";
import { Card, SectionTitle, Badge } from "@/components/ui/primitives";
import { fmtGb, fmtUsd } from "@/lib/utils";

export function BenchmarkTable({
  input,
  gpus,
  gpuMap,
}: {
  input: CalculatorInput;
  gpus: GpuSpec[];
  gpuMap: Record<string, GpuSpec>;
}) {
  const rows = useMemo(() => {
    return gpus
      .map((g) => {
        const r = calculate({ ...input, gpuId: g.id, gpuCount: 1 }, gpuMap);
        return {
          gpu: g,
          tps: r.tokensPerSecond,
          fits: r.fitsOnGpu,
          needed: r.vramRequiredGb,
          users: r.concurrentUsersSupported,
        };
      })
      .sort((a, b) => b.tps - a.tps);
  }, [input, gpus, gpuMap]);

  const chartData = rows.map((r) => ({
    name: r.gpu.name.replace(/ \(.*\)/, "").replace(/GB.*/, ""),
    tps: Math.round(r.tps),
    fits: r.fits,
  }));

  return (
    <Card>
      <SectionTitle
        icon={<Cpu size={16} />}
        title="Hardware benchmark comparison"
        subtitle="Estimated decode speed & fit for this exact model across accelerators"
      />

      <div className="mb-4 h-56 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} layout="vertical" margin={{ left: 8, right: 16 }}>
            <XAxis type="number" hide />
            <YAxis
              type="category"
              dataKey="name"
              width={120}
              tick={{ fill: "#94a3b8", fontSize: 11 }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip
              cursor={{ fill: "rgba(255,255,255,0.04)" }}
              contentStyle={{ background: "#0d1220", border: "1px solid #2a3550", borderRadius: 10, fontSize: 12 }}
              formatter={(val: number) => [`${val} tok/s`, "decode"]}
            />
            <Bar dataKey="tps" radius={[0, 6, 6, 0]} barSize={12}>
              {chartData.map((d, i) => (
                <Cell key={i} fill={d.fits ? "#34d399" : "#64748b"} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-border text-[11px] uppercase tracking-wide text-muted-foreground">
              <th className="py-2 pr-3 font-medium">Accelerator</th>
              <th className="py-2 pr-3 font-medium">VRAM</th>
              <th className="py-2 pr-3 font-medium">BW</th>
              <th className="py-2 pr-3 font-medium">tok/s</th>
              <th className="py-2 pr-3 font-medium">Users</th>
              <th className="py-2 pr-3 font-medium">Fit</th>
              <th className="py-2 pr-3 font-medium">~Price</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.gpu.id} className="border-b border-border/50 last:border-0">
                <td className="py-2 pr-3">
                  <span className="font-medium text-foreground">{r.gpu.name}</span>
                  <span className="ml-1.5 text-[10px] text-muted-foreground">{r.gpu.vendor}</span>
                </td>
                <td className="py-2 pr-3 tabular-nums text-muted-foreground">{r.gpu.vramGb}GB</td>
                <td className="py-2 pr-3 tabular-nums text-muted-foreground">{r.gpu.bandwidthGbs}</td>
                <td className="py-2 pr-3 font-semibold tabular-nums text-accent">{Math.round(r.tps)}</td>
                <td className="py-2 pr-3 tabular-nums text-muted-foreground">{r.users}</td>
                <td className="py-2 pr-3">
                  {r.fits ? (
                    <span className="inline-flex items-center gap-1 text-success"><CheckCircle2 size={14} /> fits</span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-danger"><XCircle size={14} /> {fmtGb(r.needed)}</span>
                  )}
                </td>
                <td className="py-2 pr-3 tabular-nums text-muted-foreground">{fmtUsd(r.gpu.msrpUsd)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
