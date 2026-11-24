"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import type { Holding, Portfolio } from "@/lib/data";
import { fmtUsd, fmtPct, fmtQty, fmtPrice, fmtInt, fmtDate, pnlClass } from "@/lib/format";

type Key = keyof Holding;
type Col = { key: Key; label: string; w: number; align?: "right"; render: (h: Holding) => React.ReactNode; cls?: (h: Holding) => string };

const COLS: Col[] = [
  { key: "ticker", label: "Ticker", w: 92, render: (h) => h.ticker },
  { key: "name", label: "Name", w: 220, render: (h) => h.name || "—" },
  { key: "exchange", label: "Exchange", w: 92, render: (h) => h.exchange },
  { key: "country", label: "Country", w: 130, render: (h) => h.country },
  { key: "sector", label: "Sector", w: 160, render: (h) => h.sector },
  { key: "buy_price", label: "Avg cost", w: 100, align: "right", render: (h) => fmtPrice(h.buy_price) },
  { key: "price", label: "Price", w: 100, align: "right", render: (h) => fmtPrice(h.price) },
  { key: "unrealized_pnl", label: "P/L $", w: 100, align: "right", render: (h) => fmtUsd(h.unrealized_pnl, { sign: true }), cls: (h) => pnlClass(h.unrealized_pnl) },
  { key: "unrealized_pct", label: "P/L %", w: 92, align: "right", render: (h) => fmtPct(h.unrealized_pct, { sign: true }), cls: (h) => pnlClass(h.unrealized_pct) },
  { key: "quantity", label: "Quantity", w: 100, align: "right", render: (h) => fmtQty(h.quantity) },
  { key: "invested", label: "Invested", w: 100, align: "right", render: (h) => fmtUsd(h.invested) },
  { key: "commission", label: "Commission", w: 104, align: "right", render: (h) => fmtUsd(h.commission) },
  { key: "net_dividends", label: "Net div.", w: 92, align: "right", render: (h) => fmtUsd(h.net_dividends) },
  { key: "div_yield_pct", label: "Div yield", w: 92, align: "right", render: (h) => fmtPct(h.div_yield_pct), cls: (h) => ((h.div_yield_pct ?? 0) > 0 ? "text-gold" : "text-muted") },
];
const TOTAL_W = COLS.reduce((a, c) => a + c.w, 0);
const GRID = COLS.map((c) => `${c.w}px`).join(" ");
const ROW_H = 40;

export function HoldingsTable() {
  const [data, setData] = useState<Portfolio | null>(null);
  const [error, setError] = useState(false);
  const [q, setQ] = useState("");
  const [country, setCountry] = useState("");
  const [exchange, setExchange] = useState("");
  const [sector, setSector] = useState("");
  const [pl, setPl] = useState<"" | "profit" | "loss">("");
  const [divOnly, setDivOnly] = useState(false);
  const [sort, setSort] = useState<{ key: Key; dir: 1 | -1 }>({ key: "market_value", dir: -1 });
  const [open, setOpen] = useState<Holding | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const initial = new URLSearchParams(window.location.search).get("q");
    if (initial) setQ(initial);
    fetch("/data/portfolio.json")
      .then((r) => r.json())
      .then(setData)
      .catch(() => setError(true));
  }, []);

  const options = useMemo(() => {
    const uniq = (k: Key) => [...new Set((data?.holdings ?? []).map((h) => String(h[k] || "Unknown")))].sort();
    return { country: uniq("country"), exchange: uniq("exchange"), sector: uniq("sector") };
  }, [data]);

  const rows = useMemo(() => {
    if (!data) return [];
    const needle = q.trim().toLowerCase();
    const exact = data.holdings.filter((h) => h.ticker.toLowerCase() === needle);
    let out = data.holdings.filter((h) => {
      if (needle && !h.ticker.toLowerCase().includes(needle) && !h.name.toLowerCase().includes(needle)) return false;
      if (country && (h.country || "Unknown") !== country) return false;
      if (exchange && (h.exchange || "Unknown") !== exchange) return false;
      if (sector && (h.sector || "Unknown") !== sector) return false;
      if (pl === "profit" && !((h.unrealized_pnl ?? 0) > 0)) return false;
      if (pl === "loss" && !((h.unrealized_pnl ?? 0) < 0)) return false;
      if (divOnly && !(h.net_dividends > 0)) return false;
      return true;
    });
    const { key, dir } = sort;
    out = [...out].sort((a, b) => {
      const av = a[key];
      const bv = b[key];
      if (av == null && bv == null) return 0;
      if (av == null) return 1; // nulls always last
      if (bv == null) return -1;
      if (typeof av === "number" && typeof bv === "number") return (av - bv) * dir;
      return String(av).localeCompare(String(bv)) * dir;
    });
    // an exact ticker match always comes first
    if (exact.length && out.includes(exact[0])) out = [exact[0], ...out.filter((h) => h !== exact[0])];
    return out;
  }, [data, q, country, exchange, sector, pl, divOnly, sort]);

  const virt = useVirtualizer({ count: rows.length, getScrollElement: () => scrollRef.current, estimateSize: () => ROW_H, overscan: 12 });

  const sums = useMemo(() => {
    const s = { invested: 0, mv: 0, pnl: 0, div: 0 };
    for (const h of rows) {
      s.invested += h.cost;
      s.mv += h.market_value ?? 0;
      s.pnl += h.unrealized_pnl ?? 0;
      s.div += h.net_dividends;
    }
    return s;
  }, [rows]);

  const toggleSort = (key: Key) =>
    setSort((s) => (s.key === key ? { key, dir: (s.dir * -1) as 1 | -1 } : { key, dir: typeof data?.holdings[0]?.[key] === "string" ? 1 : -1 }));

  const filtersActive = q || country || exchange || sector || pl || divOnly;
  const reset = () => {
    setQ("");
    setCountry("");
    setExchange("");
    setSector("");
    setPl("");
    setDivOnly(false);
  };

  if (error) return <p className="card p-6 text-sm text-down-text">Could not load the portfolio data. Please refresh.</p>;

  return (
    <div>
      {/* filters: one row above the table */}
      <div className="flex flex-wrap items-center gap-2">
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search ticker or company…"
          aria-label="Search ticker or company"
          className="h-10 min-w-0 flex-1 basis-56 rounded-xl border border-line bg-card px-3.5 text-sm outline-none placeholder:text-muted focus:border-clover"
        />
        <Select label="Country" plural="countries" value={country} onChange={setCountry} options={options.country} />
        <Select label="Exchange" plural="exchanges" value={exchange} onChange={setExchange} options={options.exchange} />
        <Select label="Sector" plural="sectors" value={sector} onChange={setSector} options={options.sector} />
        <select
          value={pl}
          onChange={(e) => setPl(e.target.value as "" | "profit" | "loss")}
          aria-label="Profit or loss"
          className="h-10 rounded-xl border border-line bg-card px-2.5 text-sm text-ink focus:border-clover"
        >
          <option value="">Profit &amp; loss</option>
          <option value="profit">In profit</option>
          <option value="loss">In loss</option>
        </select>
        <label className="flex h-10 cursor-pointer items-center gap-2 rounded-xl border border-line bg-card px-3 text-sm select-none">
          <input type="checkbox" checked={divOnly} onChange={(e) => setDivOnly(e.target.checked)} className="accent-clover" />
          Dividend payers
        </label>
        {filtersActive && (
          <button onClick={reset} className="h-10 rounded-xl px-3 text-sm font-semibold text-clover hover:bg-ice">
            Reset
          </button>
        )}
      </div>

      {/* summary of the current selection */}
      <div className="mt-3 flex flex-wrap items-center justify-between gap-x-6 gap-y-1 text-xs text-ink-2">
        <div className="num flex flex-wrap gap-x-5 gap-y-1">
          <span>
            <strong className="text-ink">{data ? fmtInt(rows.length) : "…"}</strong> of {data ? fmtInt(data.holdings.length) : "…"} companies
          </span>
          <span>Cost {fmtUsd(sums.invested)}</span>
          <span>Value {fmtUsd(sums.mv)}</span>
          <span className={pnlClass(sums.pnl)}>P/L {fmtUsd(sums.pnl, { sign: true })}</span>
          <span>Dividends {fmtUsd(sums.div)}</span>
        </div>
        <a href="/data/holdings.csv" download className="font-semibold text-clover hover:underline">
          Download CSV ↓
        </a>
      </div>

      {/* table */}
      <div ref={scrollRef} className="card relative mt-3 h-[72vh] min-h-[420px] overflow-auto" role="table" aria-label="Holdings" aria-rowcount={rows.length}>
        <div style={{ width: TOTAL_W, minWidth: "100%" }}>
          <div role="row" className="sticky top-0 z-20 grid border-b border-line bg-cream text-[11px] font-bold tracking-wide text-ink-2 uppercase" style={{ gridTemplateColumns: GRID }}>
            {COLS.map((c, i) => (
              <button
                key={c.key}
                role="columnheader"
                aria-sort={sort.key === c.key ? (sort.dir === 1 ? "ascending" : "descending") : "none"}
                onClick={() => toggleSort(c.key)}
                className={`flex h-10 items-center gap-1 px-3 hover:text-ink ${c.align === "right" ? "justify-end text-right" : ""} ${i === 0 ? "sticky left-0 z-10 bg-cream" : ""}`}
              >
                {c.label}
                <span className={`text-[9px] ${sort.key === c.key ? "text-clover" : "text-transparent"}`}>{sort.dir === 1 ? "▲" : "▼"}</span>
              </button>
            ))}
          </div>

          {!data ? (
            <div className="p-6 text-sm text-muted">Loading holdings…</div>
          ) : rows.length === 0 ? (
            <div className="p-6 text-sm text-ink-2">
              No match. {q && /^[A-Za-z.]{1,6}$/.test(q.trim()) && <span>“{q.trim().toUpperCase()}” is not in the portfolio (yet).</span>}
            </div>
          ) : (
            <div style={{ height: virt.getTotalSize(), position: "relative" }}>
              {virt.getVirtualItems().map((vr) => {
                const h = rows[vr.index];
                return (
                  <div
                    key={h.ticker}
                    role="row"
                    tabIndex={0}
                    onClick={() => setOpen(h)}
                    onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && (e.preventDefault(), setOpen(h))}
                    className="group absolute left-0 grid w-full cursor-pointer border-b border-line/60 text-[13px] hover:bg-mint/40 focus:bg-mint/50 focus:outline-none"
                    style={{ gridTemplateColumns: GRID, height: ROW_H, transform: `translateY(${vr.start}px)` }}
                  >
                    {COLS.map((c, i) => (
                      <div
                        key={c.key}
                        role="cell"
                        className={`num flex items-center truncate px-3 ${c.align === "right" ? "justify-end" : ""} ${c.cls ? c.cls(h) : "text-ink"} ${
                          i === 0 ? "sticky left-0 z-10 bg-card font-mono font-bold group-hover:bg-[#e9efe8]" : ""
                        } ${i === 1 ? "text-ink-2" : ""}`}
                        title={i === 1 ? h.name : undefined}
                      >
                        <span className="truncate">{c.render(h)}</span>
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
      <p className="mt-2 text-xs text-muted">Tap a row for details. Scroll sideways on small screens. Prices are delayed; “—” means no price was found.</p>

      {open && <Drawer h={open} onClose={() => setOpen(null)} />}
    </div>
  );
}

function Select({ label, plural, value, onChange, options }: { label: string; plural: string; value: string; onChange: (v: string) => void; options: string[] }) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      aria-label={label}
      className="h-10 max-w-44 rounded-xl border border-line bg-card px-2.5 text-sm text-ink focus:border-clover"
    >
      <option value="">All {plural}</option>
      {options.map((o) => (
        <option key={o} value={o}>
          {o}
        </option>
      ))}
    </select>
  );
}

function Drawer({ h, onClose }: { h: Holding; onClose: () => void }) {
  useEffect(() => {
    const k = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [onClose]);
  const rows: [string, React.ReactNode, string?][] = [
    ["Exchange", h.exchange],
    ["Country (HQ)", h.country],
    ["Sector", h.sector],
    ["Industry", h.industry || "—"],
    ["Quantity", fmtQty(h.quantity)],
    ["Avg cost / share", fmtPrice(h.buy_price)],
    ["Current price", fmtPrice(h.price)],
    ["Invested", fmtUsd(h.invested)],
    ["Commission", fmtUsd(h.commission)],
    ["Cost basis", fmtUsd(h.cost)],
    ["Market value", fmtUsd(h.market_value)],
    ["Unrealized P/L", `${fmtUsd(h.unrealized_pnl, { sign: true })} (${fmtPct(h.unrealized_pct, { sign: true })})`, pnlClass(h.unrealized_pnl)],
    ["Net dividends", fmtUsd(h.net_dividends)],
    ["Dividend yield on cost", fmtPct(h.div_yield_pct)],
    ["First bought", fmtDate(h.first_bought)],
  ];
  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-ink/30" onClick={onClose} role="dialog" aria-modal="true" aria-label={`${h.ticker} details`}>
      <div className="h-full w-full max-w-md overflow-y-auto bg-card p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="font-mono text-2xl font-bold text-ink">{h.ticker}</div>
            <div className="mt-1 text-sm text-ink-2">{h.name || "—"}</div>
          </div>
          <button onClick={onClose} className="rounded-lg px-2 py-1 text-xl leading-none text-ink-2 hover:bg-ice" aria-label="Close">
            ×
          </button>
        </div>
        <dl className="mt-6 divide-y divide-line/70 text-sm">
          {rows.map(([k, v, cls]) => (
            <div key={k} className="flex justify-between gap-4 py-2.5">
              <dt className="text-ink-2">{k}</dt>
              <dd className={`num text-right font-semibold ${cls ?? "text-ink"}`}>{v}</dd>
            </div>
          ))}
        </dl>
        <a
          href={`https://www.nasdaq.com/market-activity/stocks/${h.ticker.toLowerCase().replace(/\s+/g, ".")}`}
          target="_blank"
          rel="noreferrer"
          className="mt-6 inline-block text-sm font-semibold text-clover hover:underline"
        >
          View quote on nasdaq.com ↗
        </a>
      </div>
    </div>
  );
}
