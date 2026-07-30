"use client";

import { useEffect, useRef, useState } from "react";

/** Smoothly tweens a displayed number toward its target value. */
export function AnimatedNumber({
  value,
  decimals = 0,
  duration = 600,
}: {
  value: number;
  decimals?: number;
  duration?: number;
}) {
  const [display, setDisplay] = useState(value);
  const fromRef = useRef(value);
  const rafRef = useRef<number | undefined>(undefined);

  useEffect(() => {
    const from = fromRef.current;
    const to = value;
    if (!isFinite(to)) {
      setDisplay(to);
      return;
    }
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplay(from + (to - from) * eased);
      if (t < 1) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        fromRef.current = to;
      }
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      fromRef.current = display;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, duration]);

  if (!isFinite(display)) return <>∞</>;
  return <>{display.toLocaleString("en-US", { maximumFractionDigits: decimals, minimumFractionDigits: decimals })}</>;
}
