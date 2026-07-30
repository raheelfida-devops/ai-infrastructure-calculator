"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export function Card({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("glass rounded-2xl p-5", className)} {...props} />;
}

export function SectionTitle({
  icon,
  title,
  subtitle,
}: {
  icon?: React.ReactNode;
  title: string;
  subtitle?: string;
}) {
  return (
    <div className="mb-4 flex items-start gap-3">
      {icon && (
        <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-primary">
          {icon}
        </div>
      )}
      <div>
        <h3 className="text-sm font-semibold tracking-wide text-foreground">{title}</h3>
        {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
      </div>
    </div>
  );
}

export function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block space-y-1.5">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-muted-foreground">{label}</span>
        {hint && <span className="text-[10px] text-muted-foreground/70">{hint}</span>}
      </div>
      {children}
    </label>
  );
}

export function TextInput({ className, ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        "w-full rounded-lg border border-border bg-muted/40 px-3 py-2 text-sm text-foreground",
        "placeholder:text-muted-foreground/50 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/50",
        className
      )}
      {...props}
    />
  );
}

export function Select({ className, children, ...props }: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={cn(
        "w-full rounded-lg border border-border bg-muted/40 px-3 py-2 text-sm text-foreground",
        "focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/50",
        "[&>option]:bg-[#0d1220] [&>option]:text-foreground",
        className
      )}
      {...props}
    >
      {children}
    </select>
  );
}

export function Slider({
  value,
  min,
  max,
  step = 1,
  onChange,
}: {
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (v: number) => void;
}) {
  return (
    <input
      type="range"
      className="w-full"
      value={value}
      min={min}
      max={max}
      step={step}
      onChange={(e) => onChange(Number(e.target.value))}
    />
  );
}

export function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={cn(
        "flex items-center justify-between gap-2 rounded-lg border px-3 py-2 text-xs font-medium transition-colors",
        checked
          ? "border-primary/60 bg-primary/15 text-foreground"
          : "border-border bg-muted/30 text-muted-foreground hover:bg-muted/50"
      )}
    >
      <span>{label}</span>
      <span
        className={cn(
          "relative h-4 w-7 shrink-0 rounded-full transition-colors",
          checked ? "bg-primary" : "bg-muted-foreground/40"
        )}
      >
        <span
          className={cn(
            "absolute top-0.5 h-3 w-3 rounded-full bg-white transition-all",
            checked ? "left-3.5" : "left-0.5"
          )}
        />
      </span>
    </button>
  );
}

const badgeStyles: Record<string, string> = {
  success: "bg-success/15 text-success border-success/30",
  warning: "bg-warning/15 text-warning border-warning/30",
  danger: "bg-danger/15 text-danger border-danger/30",
  info: "bg-primary/15 text-primary border-primary/30",
  muted: "bg-muted/40 text-muted-foreground border-border",
};

export function Badge({
  children,
  variant = "muted",
  className,
}: {
  children: React.ReactNode;
  variant?: keyof typeof badgeStyles;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold",
        badgeStyles[variant],
        className
      )}
    >
      {children}
    </span>
  );
}

export function ProgressBar({
  value,
  max,
  colorClass = "bg-primary",
}: {
  value: number;
  max: number;
  colorClass?: string;
}) {
  const pct = Math.max(0, Math.min(100, (value / (max || 1)) * 100));
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-muted/50">
      <div
        className={cn("h-full rounded-full transition-all duration-700 ease-out", colorClass)}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}
