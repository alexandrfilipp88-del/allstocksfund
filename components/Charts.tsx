"use client";

import { useMemo, useRef, useState } from "react";
import { fmtInt, fmtUsd } from "@/lib/format";

const FORMATS = { int: (n: number) => fmtInt(n), usd: (n: number) => fmtUsd(n, { compact: true }) };

const UP = "#17734f";
const DOWN = "#e0714a";
const NAVY = "#2f5264";
const GRID = "#e4e0d7";
const MUTED = "#7a8a92";

type Tip = { x: number; y: number; title: string; lines: string[] } | null;

function Tooltip({ tip }: { tip: Tip }) {
  if (!tip) return null;
  return (
    <div
      className="pointer-events-none absolute z-10 min-w-36 -translate-x-1/2 -translate-y-full rounded-lg border border-line bg-card px-3 py-2 text-xs shadow-lg"
      style={{ left: tip.x, top: tip.y - 10 }}
    >
      <div className="font-semibold text-ink">{tip.title}</div>
      {tip.lines.map((l) => (
        <div key={l} className="num mt-0.5 text-ink-2">
          {l}
        </div>
      ))}
    </div>
  );
}

/* ---------------- vertical bars over time (one bar per buying day) ---------------- */
export function GrowthBars({ data, height = 240 }: { data: { date: string; n: number; added: number; start?: boolean }[]; height?: number }) {
  const [tip, setTip] = useState<Tip>(null);
  const ref = useRef<HTMLDivElement>(null);
  const max = niceMax(Math.max(...data.map((d) => d.n), 1));
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((f) => f * max);
  const fmtD = (iso: string) => new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
  // month labels under the first bar of a month, spaced out so they never collide
  const labels: { i: number; text: string }[] = [];
  data.forEach((d, i) => {
    const m = d.date.slice(0, 7);
    const prev = labels[labels.length - 1];
    if ((i === 0 || data[i - 1].date.slice(0, 7) !== m) && (!prev || i - prev.i >= Math.max(4, Math.round(data.length / 9)))) {
      const dt = new Date(d.date);
      labels.push({ i, text: dt.toLocaleDateString("en-GB", { month: "short", timeZone: "UTC" }) + (dt.getUTCMonth() === 0 || i === 0 ? " " + String(dt.getUTCFullYear()).slice(2) : "") });
    }
  });
  return (
    <div className="relative" ref={ref}>
      <div className="grid grid-cols-[2.75rem_1fr] gap-2">
        <div className="relative" style={{ height }}>
          {ticks.map((v) => (
            <span key={v} className="num absolute right-0 -translate-y-1/2 font-mono text-[10px] text-muted" style={{ top: `${(1 - v / max) * 100}%` }}>
              {fmtInt(v)}
            </span>
          ))}
        </div>
        <div className="relative" style={{ height }}>
          {ticks.map((v) => (
            <div key={v} className="absolute inset-x-0 border-t" style={{ top: `${(1 - v / max) * 100}%`, borderColor: GRID }} />
          ))}
          <div className="absolute inset-0 flex items-end gap-px" onMouseLeave={() => setTip(null)}>
            {data.map((d) => (
              <div
                key={d.date}
                className="flex h-full min-w-0 flex-1 items-end"
                onMouseMove={(e) => {
                  const r = ref.current!.getBoundingClientRect();
                  const b = (e.currentTarget as HTMLElement).getBoundingClientRect();
                  setTip({
                    x: b.left - r.left + b.width / 2,
                    y: b.bottom - r.top - (b.height * d.n) / max,
                    title: d.start ? `Before ${fmtD(d.date)}` : fmtD(d.date),
                    lines: d.start ? [`${fmtInt(d.n)} companies already owned`] : [`${fmtInt(d.n)} companies owned`, `+${fmtInt(d.added)} bought that day`],
                  });
                }}
              >
                <div className="w-full rounded-t-[3px] transition-opacity hover:opacity-75" style={{ height: `${(d.n / max) * 100}%`, background: d.start ? NAVY : UP }} />
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="relative mt-2 ml-[3.25rem] h-4">
        {labels.map((l) => (
          <span key={l.i} className="absolute font-mono text-[10px] whitespace-nowrap text-muted" style={{ left: `${((l.i + 0.5) / data.length) * 100}%`, transform: "translateX(-50%)" }}>
            {l.text}
          </span>
        ))}
      </div>
      <Tooltip tip={tip} />
    </div>
  );
}

/* ---------------- horizontal bar list (HTML, responsive) ---------------- */
export function BarList({ data, unit = "companies", color = UP }: { data: { label: string; value: number }[]; unit?: string; color?: string }) {
  const max = Math.max(...data.map((d) => d.value), 1);
  const total = data.reduce((a, d) => a + d.value, 0);
  return (
    <ul className="space-y-1.5">
      {data.map((d) => (
        <li key={d.label} className="group grid grid-cols-[minmax(0,8.5rem)_1fr_auto] items-center gap-3 text-sm sm:grid-cols-[minmax(0,11rem)_1fr_auto]" title={`${d.label}: ${d.value.toLocaleString("en-US")} ${unit} (${((d.value / total) * 100).toFixed(1)}%)`}>
          <span className="truncate text-ink-2 group-hover:text-ink">{d.label}</span>
          <span className="relative h-3.5 rounded-r-[4px] bg-transparent">
            <span
              className="absolute inset-y-0 left-0 rounded-r-[4px] transition-opacity group-hover:opacity-80"
              style={{ width: `${Math.max((d.value / max) * 100, 0.6)}%`, background: color }}
            />
          </span>
          <span className="num w-14 text-right font-semibold text-ink">{d.value.toLocaleString("en-US")}</span>
        </li>
      ))}
    </ul>
  );
}

/* ---------------- histogram of unrealized % (diverging) ---------------- */
export function Histogram({ data }: { data: { label: string; value: number; positive: boolean }[] }) {
  const [tip, setTip] = useState<Tip>(null);
  const ref = useRef<HTMLDivElement>(null);
  const max = Math.max(...data.map((d) => d.value), 1);
  const total = data.reduce((a, d) => a + d.value, 0);
  return (
    <div ref={ref} className="relative">
      <div className="flex h-48 items-end gap-[2px]" onMouseLeave={() => setTip(null)}>
        {data.map((d, i) => (
          <div
            key={d.label}
            className="relative flex h-full flex-1 cursor-default items-end"
            onMouseMove={(e) => {
              const r = ref.current!.getBoundingClientRect();
              const b = (e.currentTarget as HTMLElement).getBoundingClientRect();
              setTip({
                x: b.left - r.left + b.width / 2,
                y: b.top - r.top + b.height * (1 - d.value / max),
                title: d.label,
                lines: [`${d.value.toLocaleString("en-US")} companies`, `${((d.value / total) * 100).toFixed(1)}% of priced`],
              });
            }}
          >
            <div
              className="w-full rounded-t-[4px] transition-opacity hover:opacity-80"
              style={{ height: `${Math.max((d.value / max) * 100, d.value ? 1 : 0)}%`, background: d.positive ? UP : DOWN }}
            />
            {i === 5 && <div className="absolute -left-[1.5px] top-0 bottom-0 w-px bg-ink/40" aria-hidden />}
          </div>
        ))}
      </div>
      <div className="mt-2 flex justify-between font-mono text-[10px] text-muted">
        <span>−100%</span>
        <span className="text-ink-2">0%</span>
        <span>+100%+</span>
      </div>
      <div className="mt-3 flex gap-4 text-xs text-ink-2">
        <span className="flex items-center gap-1.5">
          <i className="inline-block h-2.5 w-2.5 rounded-sm" style={{ background: DOWN }} /> In loss
        </span>
        <span className="flex items-center gap-1.5">
          <i className="inline-block h-2.5 w-2.5 rounded-sm" style={{ background: UP }} /> In profit
        </span>
      </div>
      <Tooltip tip={tip} />
    </div>
  );
}

/* ---------------- line chart (1–2 series, shared y axis) ---------------- */
type Series = { name: string; color: string; dashed?: boolean; values: (number | null)[]; format: keyof typeof FORMATS };

export function LineChart({ dates, series, height = 220 }: { dates: string[]; series: Series[]; height?: number }) {
  const [hover, setHover] = useState<number | null>(null);
  const W = 640;
  const H = height;
  const pad = { l: 52, r: 16, t: 14, b: 26 };
  const t = dates.map((d) => Date.parse(d));
  const t0 = Math.min(...t);
  const t1 = Math.max(...t);
  const all = series.flatMap((s) => s.values.filter((v): v is number => v != null));
  const yMax = niceMax(Math.max(...all, 1));
  const yMin = 0;
  const x = (ti: number) => pad.l + ((ti - t0) / Math.max(t1 - t0, 1)) * (W - pad.l - pad.r);
  const y = (v: number) => pad.t + (1 - (v - yMin) / (yMax - yMin)) * (H - pad.t - pad.b);
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((f) => yMin + f * (yMax - yMin));
  const years = useMemo(() => {
    const out: { t: number; label: string }[] = [];
    const a = new Date(t0).getUTCFullYear();
    const b = new Date(t1).getUTCFullYear();
    for (let yr = a; yr <= b; yr++) {
      for (const m of [0, 6]) {
        const tt = Date.UTC(yr, m, 1);
        if (tt >= t0 && tt <= t1) out.push({ t: tt, label: m === 0 ? String(yr) : `Jul ${String(yr).slice(2)}` });
      }
    }
    return out;
  }, [t0, t1]);

  const path = (vals: (number | null)[]) => {
    let d = "";
    vals.forEach((v, i) => {
      if (v == null) return;
      d += `${d ? "L" : "M"}${x(t[i]).toFixed(1)},${y(v).toFixed(1)}`;
    });
    return d;
  };

  const onMove = (e: React.MouseEvent<SVGRectElement>) => {
    const svg = e.currentTarget.ownerSVGElement!;
    const r = svg.getBoundingClientRect();
    const px = ((e.clientX - r.left) / r.width) * W;
    let best = 0;
    let bd = Infinity;
    t.forEach((ti, i) => {
      const dd = Math.abs(x(ti) - px);
      if (dd < bd) {
        bd = dd;
        best = i;
      }
    });
    setHover(best);
  };

  const fmt = FORMATS[series[0].format];
  return (
    <div className="relative">
      <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full overflow-visible" role="img" aria-label={series.map((s) => s.name).join(" and ") + " over time"}>
        {ticks.map((v) => (
          <g key={v}>
            <line x1={pad.l} x2={W - pad.r} y1={y(v)} y2={y(v)} stroke={GRID} strokeWidth={1} />
            <text x={pad.l - 8} y={y(v)} textAnchor="end" dominantBaseline="middle" fontSize={10} fill={MUTED} className="num">
              {fmt(v)}
            </text>
          </g>
        ))}
        {years.map((yy) => (
          <text key={yy.t} x={x(yy.t)} y={H - 6} textAnchor="middle" fontSize={10} fill={MUTED}>
            {yy.label}
          </text>
        ))}
        {series.map((s) => (
          <path key={s.name} d={path(s.values)} fill="none" stroke={s.color} strokeWidth={2} strokeDasharray={s.dashed ? "5 4" : undefined} strokeLinejoin="round" strokeLinecap="round" />
        ))}
        {series.map((s) =>
          s.values.map((v, i) =>
            v == null ? null : <circle key={s.name + i} cx={x(t[i])} cy={y(v)} r={hover === i ? 5 : 3} fill={s.color} stroke="#fbfaf6" strokeWidth={2} />,
          ),
        )}
        {hover != null && <line x1={x(t[hover])} x2={x(t[hover])} y1={pad.t} y2={H - pad.b} stroke={NAVY} strokeOpacity={0.35} />}
        <rect x={pad.l} y={0} width={W - pad.l - pad.r} height={H} fill="transparent" onMouseMove={onMove} onMouseLeave={() => setHover(null)} />
      </svg>
      {series.length > 1 && (
        <div className="mt-2 flex flex-wrap gap-4 text-xs text-ink-2">
          {series.map((s) => (
            <span key={s.name} className="flex items-center gap-1.5">
              <svg width="18" height="6" aria-hidden>
                <line x1="0" x2="18" y1="3" y2="3" stroke={s.color} strokeWidth="2" strokeDasharray={s.dashed ? "4 3" : undefined} />
              </svg>
              {s.name}
            </span>
          ))}
        </div>
      )}
      {hover != null && (
        <div
          className="pointer-events-none absolute top-0 z-10 rounded-lg border border-line bg-card px-3 py-2 text-xs shadow-lg"
          style={{ left: `${(x(t[hover]) / W) * 100}%`, transform: x(t[hover]) > W * 0.6 ? "translateX(calc(-100% - 12px))" : "translateX(12px)" }}
        >
          <div className="font-semibold text-ink">{new Date(dates[hover]).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" })}</div>
          {series.map((s) =>
            s.values[hover] == null ? null : (
              <div key={s.name} className="num mt-0.5 text-ink-2">
                {s.name}: <span className="font-semibold text-ink">{FORMATS[s.format](s.values[hover] as number)}</span>
              </div>
            ),
          )}
        </div>
      )}
    </div>
  );
}

function niceMax(v: number) {
  const p = 10 ** Math.floor(Math.log10(v));
  for (const m of [1, 1.2, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10]) if (m * p >= v) return m * p;
  return 10 * p;
}
