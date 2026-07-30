import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function fmtGb(gb: number): string {
  if (!isFinite(gb)) return "∞";
  if (gb >= 1024) return `${(gb / 1024).toFixed(2)} TB`;
  if (gb >= 100) return `${gb.toFixed(0)} GB`;
  if (gb >= 10) return `${gb.toFixed(1)} GB`;
  return `${gb.toFixed(2)} GB`;
}

export function fmtNum(n: number, digits = 0): string {
  if (!isFinite(n)) return "∞";
  return n.toLocaleString("en-US", { maximumFractionDigits: digits });
}

export function fmtUsd(n: number): string {
  if (!isFinite(n)) return "—";
  if (n >= 1000) return `$${(n / 1000).toFixed(1)}k`;
  if (n >= 10) return `$${n.toFixed(0)}`;
  return `$${n.toFixed(2)}`;
}

export function fmtTime(sec: number): string {
  if (!isFinite(sec)) return "—";
  if (sec < 1) return `${(sec * 1000).toFixed(0)} ms`;
  if (sec < 60) return `${sec.toFixed(1)} s`;
  return `${Math.floor(sec / 60)}m ${Math.round(sec % 60)}s`;
}
