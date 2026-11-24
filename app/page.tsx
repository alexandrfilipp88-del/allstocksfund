import Link from "next/link";
import { getPortfolio, getHistory, groupCount, pnlHistogram, daysSinceStart, GOAL, PEAK_COMPANIES, type Holding } from "@/lib/data";
import { fmtUsd, fmtPct, fmtInt, fmtDate, pnlClass, fmtPrice } from "@/lib/format";
import { Counter } from "@/components/Counter";
import { BarList, Histogram, LineChart } from "@/components/Charts";

const MILESTONES = [
  { n: 1000, label: "1K" },
  { n: 5000, label: "5K" },
  { n: 9500, label: "~9.5K", note: "End of cheap fractional stocks. Beyond ~9,500 companies, the remaining stocks can only be bought as whole shares." },
  { n: 10000, label: "10K" },
  { n: 25000, label: "25K" },
  { n: 50000, label: "50K" },
];

export default function Home() {
  const p = getPortfolio();
  const history = getHistory();
  const t = p.totals;
  const priced = p.holdings.filter((h) => h.unrealized_pct != null);
  const day = daysSinceStart();
  const sincePeak = t.companies - PEAK_COMPANIES;

  const byPct = [...priced].sort((a, b) => (b.unrealized_pct ?? 0) - (a.unrealized_pct ?? 0));
  const gainers = byPct.slice(0, 10);
  const losers = byPct.slice(-10).reverse();
  const yielders = [...p.holdings].filter((h) => (h.div_yield_pct ?? 0) > 0).sort((a, b) => (b.div_yield_pct ?? 0) - (a.div_yield_pct ?? 0)).slice(0, 10);
  const biggest = [...priced].sort((a, b) => (b.market_value ?? 0) - (a.market_value ?? 0)).slice(0, 10);

  const valueHist = history.filter((h) => h.value != null);
  const pct = (t.companies / GOAL) * 100;

  return (
    <div className="mx-auto max-w-6xl px-4">
      {/* HERO */}
      <section className="pt-12 pb-10 sm:pt-16">
        <p className="font-mono text-xs text-ink-2">
          Day {fmtInt(day)} · prices as of {fmtDate(p.prices_updated_at ?? p.updated_at)}
        </p>
        <h1 className="mt-4 font-display text-4xl leading-[1.05] font-extrabold tracking-tight text-ink sm:text-6xl">
          I own <span className="text-clover"><Counter to={t.companies} /></span>
          <br className="sm:hidden" /> companies.
        </h1>
        <p className="tracked mt-5 text-sm font-bold text-gold sm:text-base">Own Everything. Predict Nothing.</p>
        <p className="mt-4 max-w-2xl text-[15px] leading-relaxed text-ink-2">
          A public experiment to hold a tiny slice of every listed company, with fractional positions of a few cents to a dollar each.
          Target: <strong className="text-ink">50,000 companies</strong>.
          {sincePeak < 0 && (
            <>
              {" "}
              The count can fall too: <span className="num font-semibold text-ink">{fmtInt(sincePeak).replace("-", "−")}</span> since the peak of {fmtInt(PEAK_COMPANIES)} (delistings and mergers).
            </>
          )}
        </p>

        {/* progress */}
        <div className="card mt-8 p-5 sm:p-6">
          <div className="flex items-baseline justify-between gap-4">
            <span className="tracked text-[11px] font-bold text-ink-2">Progress to 50,000</span>
            <span className="num text-sm font-semibold">
              {fmtInt(t.companies)} / 50,000 · <span className="text-clover">{pct.toFixed(1)}%</span>
            </span>
          </div>
          <div className="relative mt-4 mb-9 h-3 rounded-full bg-ice">
            <div className="absolute inset-y-0 left-0 rounded-full bg-clover" style={{ width: `${Math.min(pct, 100)}%` }} />
            {MILESTONES.map((m) => {
              const left = (m.n / GOAL) * 100;
              const reached = t.companies >= m.n;
              return (
                <div key={m.n} className="group absolute top-0 h-3" style={{ left: `${left}%` }}>
                  <div className={`absolute -top-1 h-5 w-[2px] -translate-x-1/2 ${m.note ? "bg-gold" : reached ? "bg-clover-deep" : "bg-muted/60"}`} />
                  <div
                    className={`absolute top-5 font-mono text-[10px] whitespace-nowrap ${m.n === GOAL ? "-translate-x-full" : m.n <= 1000 ? "-translate-x-1/4" : "-translate-x-1/2"} ${m.note ? "font-bold text-gold" : "text-ink-2"} ${m.n === 10000 ? "translate-y-3.5" : ""}`}
                  >
                    {m.label}
                  </div>
                  {m.note && (
                    <div className="pointer-events-none absolute bottom-6 left-0 z-10 hidden w-64 -translate-x-1/2 rounded-lg border border-line bg-card p-3 text-xs leading-snug text-ink-2 shadow-lg group-hover:block">
                      {m.note}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          <p className="text-xs text-ink-2">
            <span className="font-bold text-gold">~9.5K</span> marks the end of cheap fractional stocks. Beyond it, the remaining
            companies can only be bought as whole shares.
          </p>
        </div>
      </section>

      {/* KPIs */}
      <section aria-label="Key numbers" className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <Kpi label="Cost basis" value={fmtUsd(t.cost_usd)} sub={`${fmtUsd(t.avg_invested_per_company_usd)} avg per company`} />
        <Kpi label="Market value" value={fmtUsd(t.market_value_usd)} sub={`${fmtInt(t.priced_count)} positions priced`} />
        <Kpi
          label="Unrealized P/L"
          value={fmtUsd(t.unrealized_pnl_usd, { sign: true })}
          valueClass={pnlClass(t.unrealized_pnl_usd)}
          sub={fmtPct(t.unrealized_pct, { sign: true }) + " on cost"}
        />
        <Kpi
          label="Total return"
          value={fmtPct(t.total_return_pct, { sign: true })}
          valueClass={pnlClass(t.total_return_pct)}
          sub="incl. dividends & commissions"
        />
        <Kpi label="Net dividends" value={fmtUsd(t.net_dividends_usd)} sub={`${fmtInt(t.dividend_payers)} dividend payers`} />
        <Kpi label="Commissions paid" value={fmtUsd(t.commissions_usd)} sub={`${fmtPct((t.commissions_usd / t.cost_usd) * 100)} of cost`} />
        <Kpi
          label="In profit / in loss"
          value={
            <>
              <span className="text-up-text">{fmtInt(t.profit_count)}</span>
              <span className="text-muted"> / </span>
              <span className="text-down-text">{fmtInt(t.loss_count)}</span>
            </>
          }
          sub={`${fmtPct((t.profit_count / Math.max(t.priced_count, 1)) * 100, { digits: 0 })} of priced positions up`}
        />
        <Kpi label="Days running" value={fmtInt(day)} sub="since 19 Aug 2024" />
      </section>

      {/* CHARTS */}
      <section className="mt-12 grid gap-4 lg:grid-cols-2">
        <Panel title="Companies owned over time" note="Early points are recorded milestones; daily snapshots from Nov 2026.">
          <LineChart
            dates={history.map((h) => h.date)}
            series={[{ name: "Companies", color: "#17734f", values: history.map((h) => h.companies), format: "int" }]}
          />
        </Panel>
        <Panel title="Portfolio value vs invested" note="One snapshot per day, starting 24 Nov 2026.">
          {valueHist.length >= 2 ? (
            <LineChart
              dates={valueHist.map((h) => h.date)}
              series={[
                { name: "Market value", color: "#17734f", values: valueHist.map((h) => h.value ?? null), format: "usd" },
                { name: "Cost basis", color: "#2f5264", dashed: true, values: valueHist.map((h) => h.invested ?? null), format: "usd" },
              ]}
            />
          ) : (
            <div className="grid h-48 place-items-center rounded-lg bg-ice/60 p-6 text-center">
              <div>
                <div className="num text-2xl font-bold text-ink">
                  {fmtUsd(t.market_value_usd)} <span className="text-base font-semibold text-muted">vs</span> {fmtUsd(t.invested_usd)}
                </div>
                <p className="mt-2 text-sm text-ink-2">The daily history starts today. This chart fills in as snapshots are added.</p>
              </div>
            </div>
          )}
        </Panel>
        <Panel title="Unrealized gain / loss distribution" note={`${fmtInt(priced.length)} priced positions, grouped by unrealized %.`}>
          <Histogram data={pnlHistogram(p.holdings)} />
        </Panel>
        <Panel title="By sector" note="Number of companies per sector.">
          <BarList data={groupCount(p.holdings, "sector", 12)} />
        </Panel>
        <Panel title="By country (HQ)" note="Top countries by number of companies.">
          <BarList data={groupCount(p.holdings, "country", 15)} color="#2f5264" />
        </Panel>
        <Panel title="By exchange" note="Where the shares are listed.">
          <BarList data={groupCount(p.holdings, "exchange", 8)} color="#2f5264" />
        </Panel>
      </section>

      {/* HALL OF FAME */}
      <section className="mt-12">
        <h2 className="tracked text-sm font-extrabold text-ink">Hall of fame &amp; shame</h2>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <TopList title="Top gainers" rows={gainers} metric={(h) => fmtPct(h.unrealized_pct, { sign: true })} cls={(h) => pnlClass(h.unrealized_pct)} />
          <TopList title="Top losers" rows={losers} metric={(h) => fmtPct(h.unrealized_pct, { sign: true })} cls={(h) => pnlClass(h.unrealized_pct)} />
          <TopList title="Top dividend yield" rows={yielders} metric={(h) => fmtPct(h.div_yield_pct)} cls={() => "text-gold"} hint="Net dividends ÷ invested" />
          <TopList title="Largest positions" rows={biggest} metric={(h) => fmtUsd(h.market_value)} cls={() => "text-ink"} />
        </div>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link href="/holdings" className="rounded-xl bg-clover px-5 py-3 text-sm font-bold text-white hover:bg-clover-deep">
            See all {fmtInt(t.companies)} holdings →
          </Link>
          <a href="/data/holdings.csv" download className="rounded-xl border border-line bg-card px-5 py-3 text-sm font-bold text-ink hover:border-clover">
            Download CSV
          </a>
        </div>
      </section>
    </div>
  );
}

function Kpi({ label, value, sub, valueClass = "text-ink" }: { label: string; value: React.ReactNode; sub?: string; valueClass?: string }) {
  return (
    <div className="card p-4 sm:p-5">
      <div className="tracked text-[10px] font-bold text-ink-2">{label}</div>
      <div className={`num mt-2 text-xl font-bold sm:text-2xl ${valueClass}`}>{value}</div>
      {sub && <div className="mt-1 text-xs text-muted">{sub}</div>}
    </div>
  );
}

function Panel({ title, note, children }: { title: string; note?: string; children: React.ReactNode }) {
  return (
    <div className="card p-5 sm:p-6">
      <h2 className="font-display text-base font-bold text-ink">{title}</h2>
      {note && <p className="mt-0.5 mb-5 text-xs text-muted">{note}</p>}
      {children}
    </div>
  );
}

function TopList({ title, rows, metric, cls, hint }: { title: string; rows: Holding[]; metric: (h: Holding) => string; cls: (h: Holding) => string; hint?: string }) {
  return (
    <div className="card p-5">
      <h3 className="tracked text-[11px] font-bold text-ink-2">{title}</h3>
      {hint && <p className="mt-0.5 text-[11px] text-muted">{hint}</p>}
      <ol className="mt-3 space-y-1.5">
        {rows.map((h, i) => (
          <li key={h.ticker} className="flex items-baseline gap-2 text-sm">
            <span className="num w-4 shrink-0 text-right font-mono text-[11px] text-muted">{i + 1}</span>
            <Link href={`/holdings?q=${encodeURIComponent(h.ticker)}`} className="w-14 shrink-0 font-mono text-[13px] font-bold text-ink hover:text-clover">
              {h.ticker}
            </Link>
            <span className="min-w-0 flex-1 truncate text-xs text-ink-2" title={`${h.name} · ${fmtPrice(h.price)}`}>
              {h.name}
            </span>
            <span className={`num shrink-0 font-semibold ${cls(h)}`}>{metric(h)}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}
