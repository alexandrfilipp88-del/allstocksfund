import fs from "node:fs";
import path from "node:path";

export type Holding = {
  ticker: string;
  name: string;
  exchange: string;
  country: string;
  sector: string;
  industry: string;
  quantity: number;
  buy_price: number | null;
  price: number | null;
  invested: number;
  commission: number;
  cost: number;
  market_value: number | null;
  unrealized_pnl: number | null;
  unrealized_pct: number | null;
  net_dividends: number;
  div_yield_pct: number | null;
  first_bought: string | null;
};

export type Totals = {
  companies: number;
  priced_count: number;
  invested_usd: number;
  commissions_usd: number;
  cost_usd: number;
  market_value_usd: number;
  unrealized_pnl_usd: number;
  unrealized_pct: number | null;
  net_dividends_usd: number;
  total_return_pct: number | null;
  profit_count: number;
  loss_count: number;
  flat_count: number;
  dividend_payers: number;
  avg_invested_per_company_usd: number;
};

export type Portfolio = {
  updated_at: string;
  prices_updated_at: string | null;
  source_file: string;
  totals: Totals;
  holdings: Holding[];
};

export type HistoryPoint = {
  date: string;
  companies: number;
  invested?: number;
  value?: number;
  pnl?: number;
  dividends?: number;
  source: string;
};

const dir = path.join(process.cwd(), "public", "data");

export function getPortfolio(): Portfolio {
  return JSON.parse(fs.readFileSync(path.join(dir, "portfolio.json"), "utf8"));
}

export function getHistory(): HistoryPoint[] {
  return JSON.parse(fs.readFileSync(path.join(dir, "history.json"), "utf8"));
}

export const GOAL = 50_000;
export const START_DATE = "2024-08-19";
export const PEAK_COMPANIES = 4938; // highest count reached in 2026 (before delistings/mergers)

export function groupCount(holdings: Holding[], key: keyof Holding, top = 12, other = true) {
  const m = new Map<string, number>();
  for (const h of holdings) {
    const k = String(h[key] || "Unknown");
    m.set(k, (m.get(k) || 0) + 1);
  }
  const sorted = [...m.entries()].sort((a, b) => b[1] - a[1]);
  if (!other) return sorted.slice(0, top).map(([label, value]) => ({ label, value }));
  if (sorted.length <= top) return sorted.map(([label, value]) => ({ label, value }));
  const head = sorted.slice(0, top - 1).map(([label, value]) => ({ label, value }));
  const rest = sorted.slice(top - 1).reduce((a, [, v]) => a + v, 0);
  return [...head, { label: `Other (${sorted.length - top + 1})`, value: rest }];
}

/** Histogram of unrealized % in fixed buckets from ≤-90% to ≥+100%. */
export function pnlHistogram(holdings: Holding[]) {
  const edges = [-100, -75, -50, -25, -10, 0, 10, 25, 50, 100, Infinity];
  const labels = ["−100 to −75%", "−75 to −50%", "−50 to −25%", "−25 to −10%", "−10 to 0%", "0 to +10%", "+10 to +25%", "+25 to +50%", "+50 to +100%", "over +100%"];
  const counts = new Array(labels.length).fill(0);
  for (const h of holdings) {
    if (h.unrealized_pct == null) continue;
    const p = h.unrealized_pct;
    let i = edges.findIndex((e, j) => j < edges.length - 1 && p >= e && p < edges[j + 1]);
    if (i < 0) i = p < edges[0] ? 0 : labels.length - 1;
    counts[i]++;
  }
  return labels.map((label, i) => ({ label, value: counts[i], positive: i >= 5 }));
}

export function daysSinceStart(iso = new Date().toISOString()) {
  return Math.floor((Date.parse(iso) - Date.parse(START_DATE)) / 86_400_000);
}
