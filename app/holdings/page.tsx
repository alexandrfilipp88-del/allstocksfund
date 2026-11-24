import type { Metadata } from "next";
import { HoldingsTable } from "@/components/HoldingsTable";
import { getPortfolio } from "@/lib/data";
import { fmtInt, fmtDate } from "@/lib/format";

export const metadata: Metadata = { title: "Holdings" };

export default function HoldingsPage() {
  const p = getPortfolio();
  return (
    <div className="mx-auto max-w-6xl px-4 pt-10">
      <p className="font-mono text-xs text-ink-2">Prices as of {fmtDate(p.prices_updated_at ?? p.updated_at)}</p>
      <h1 className="mt-2 font-display text-3xl font-extrabold tracking-tight sm:text-4xl">
        All <span className="text-clover">{fmtInt(p.totals.companies)}</span> holdings
      </h1>
      <p className="mt-2 mb-6 max-w-2xl text-sm text-ink-2">
        Every position in the portfolio. Sort any column, search by ticker or name, and filter by country, exchange, sector or
        profit/loss. Dividend yield is shown on cost: net dividends received ÷ amount invested.
      </p>
      <HoldingsTable />
    </div>
  );
}
