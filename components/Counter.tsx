"use client";

import { useEffect, useState } from "react";

/** Counts up to `to` once on mount. Renders the final value on the server (no layout shift, works without JS). */
export function Counter({ to, duration = 1400 }: { to: number; duration?: number }) {
  const [n, setN] = useState(to);
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let raf = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const p = Math.min((now - start) / duration, 1);
      setN(Math.round(to * (1 - Math.pow(1 - p, 3))));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [to, duration]);
  return <span className="num">{n.toLocaleString("en-US")}</span>;
}
