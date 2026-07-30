"use client";

import { useMemo, useState } from "react";
import type { CalculatorInput } from "@/lib/types";
import { defaultInput } from "@/lib/defaults";
import { calculate } from "@/lib/calculations";
import { InputPanel } from "@/components/InputPanel";
import { ResultsDashboard } from "@/components/ResultsDashboard";
import { BenchmarkTable } from "@/components/BenchmarkTable";
import { useCatalog } from "@/components/useCatalog";

export function Calculator() {
  const [input, setInput] = useState<CalculatorInput>(defaultInput);
  const catalog = useCatalog();

  const patch = (p: Partial<CalculatorInput>) => setInput((prev) => ({ ...prev, ...p }));

  const result = useMemo(() => calculate(input, catalog.gpuMap), [input, catalog.gpuMap]);

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,380px)_minmax(0,1fr)]">
      <div className="lg:sticky lg:top-4 lg:h-fit lg:max-h-[calc(100vh-2rem)] lg:overflow-y-auto lg:pr-1">
        <InputPanel input={input} patch={patch} catalog={catalog} />
      </div>
      <div className="space-y-4">
        <ResultsDashboard result={result} input={input} />
        <BenchmarkTable input={input} gpus={catalog.gpus} gpuMap={catalog.gpuMap} />
      </div>
    </div>
  );
}
