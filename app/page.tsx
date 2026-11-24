import { getPortfolio, groupCount, pnlHistogram, daysSinceStart, GOAL, PEAK_COMPANIES, type Holding } from "@/lib/data";
import { fmtUsd, fmtPct, fmtInt, fmtDate, pnlClass, fmtPrice } from "@/lib/format";
import { Counter } from "@/components/Counter";
import { BarList, Histogram, GrowthBars } from "@/components/Charts";
import { HoldingsTable } from "@/components/HoldingsTable";
import { Benchmarks } from "@/components/Benchmarks";

const MILESTONES = [1000, 5000, 10000, 25000, 50000];

const timeline = [
  { date: "19 Aug 2024", label: "Day 0", text: "The experiment starts at Interactive Brokers." },
  { date: "2 Dec 2024", label: "Day 105", text: "~1,880 companies." },
  { date: "11 Dec 2024", label: "Day 114", text: "~2,107 companies." },
  { date: "22 Dec 2024", label: "Day 125", text: "~2,946 companies." },
  { date: "23 Dec 2024", label: "Day 126", text: "~2,995 companies." },
  { date: "4 Jul 2026", label: "", text: "~3,200 companies." },
  { date: "17 Sep 2026", label: "", text: "4,431 companies." },
  { date: "Late 2026", label: "", text: "Peak of 4,938 companies, then a few delistings and mergers." },
];

export default function Home() {
  const p = getPortfolio() as ReturnType<typeof getPortfolio> & { first_bought_from?: string };
  const t = p.totals;
  const priced = p.holdings.filter((h) => h.unrealized_pct != null);
  const day = daysSinceStart();
  const sincePeak = t.companies - PEAK_COMPANIES;
  const pct = (t.companies / GOAL) * 100;

  const byPct = [...priced].sort((a, b) => (b.unrealized_pct ?? 0) - (a.unrealized_pct ?? 0));
  const byValue = [...priced].sort((a, b) => (b.market_value ?? 0) - (a.market_value ?? 0));
  const yielders = [...p.holdings].filter((h) => (h.div_yield_pct ?? 0) > 0).sort((a, b) => (b.div_yield_pct ?? 0) - (a.div_yield_pct ?? 0)).slice(0, 10);

  // companies held over time, from the first-bought date of each current holding (IBKR trades)
  const dated = p.holdings.filter((h) => h.first_bought).map((h) => h.first_bought as string).sort();
  const before = p.holdings.length - dated.length;
  // one bar per buying day: companies owned at the end of that day (+ a first bar for everything bought earlier)
  const growth: { date: string; n: number; added: number; start?: boolean }[] = [];
  if (p.first_bought_from && dated.length) {
    growth.push({ date: p.first_bought_from, n: before, added: 0, start: true });
    const perDay = new Map<string, number>();
    for (const d of dated) perDay.set(d, (perDay.get(d) || 0) + 1);
    let n = before;
    for (const [date, added] of [...perDay.entries()].sort(([a], [b]) => a.localeCompare(b))) {
      n += added;
      growth.push({ date, n, added });
    }
  }

  return (
    <div className="mx-auto max-w-6xl px-4">
      {/* HERO */}
      <section id="dashboard" className="scroll-mt-16 pt-12 pb-10 sm:pt-16">
        <p className="font-mono text-xs text-ink-2">
          Day {fmtInt(day)} · data from Interactive Brokers, {fmtDate(p.prices_updated_at ?? p.updated_at)}
        </p>
        <h1 className="mt-4 font-display text-4xl leading-[1.05] font-extrabold tracking-tight text-ink sm:text-6xl">
          I own{" "}
          <span className="text-clover">
            <Counter to={t.companies} />
          </span>
          <br className="sm:hidden" /> companies.
        </h1>
        <p className="tracked mt-5 text-sm font-bold text-gold sm:text-base">Own Everything. Predict Nothing.</p>
        <p className="mt-4 max-w-2xl text-[15px] leading-relaxed text-ink-2">
          A public experiment to hold a tiny slice of every listed company, with fractional positions of a few cents to a dollar each.
          Target: <strong className="text-ink">50,000 companies</strong>.
          {sincePeak < 0 && (
            <>
              {" "}
              The count can fall too: <span className="num font-semibold text-ink">−{fmtInt(-sincePeak)}</span> since the peak of {fmtInt(PEAK_COMPANIES)} (delistings and mergers).
            </>
          )}
        </p>

        <div className="card mt-8 p-5 sm:p-6">
          <div className="flex items-baseline justify-between gap-4">
            <span className="tracked text-[11px] font-bold text-ink-2">Progress to 50,000</span>
            <span className="num text-sm font-semibold">
              {fmtInt(t.companies)} / 50,000 · <span className="text-clover">{pct.toFixed(1)}%</span>
            </span>
          </div>
          <div className="relative mt-4 mb-6 h-3 rounded-full bg-ice">
            <div className="absolute inset-y-0 left-0 rounded-full bg-clover" style={{ width: `${Math.min(pct, 100)}%` }} />
            {MILESTONES.map((m) => (
              <div key={m} className="absolute top-0 h-3" style={{ left: `${(m / GOAL) * 100}%` }}>
                <div className={`absolute -top-1 h-5 w-[2px] -translate-x-1/2 ${t.companies >= m ? "bg-clover-deep" : "bg-muted/60"}`} />
                <div className={`absolute top-5 font-mono text-[10px] whitespace-nowrap text-ink-2 ${m === GOAL ? "-translate-x-full" : m <= 1000 ? "-translate-x-1/4" : "-translate-x-1/2"}`}>
                  {m / 1000}K
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* KPIs */}
      <section aria-label="Key numbers" className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <Kpi label="Cost basis" value={fmtUsd(t.cost_usd)} sub={`${fmtUsd(t.avg_invested_per_company_usd)} avg per company`} />
        <Kpi label="Market value" value={fmtUsd(t.market_value_usd)} sub={`${fmtInt(t.priced_count)} positions`} />
        <Kpi label="Unrealized P/L" value={fmtUsd(t.unrealized_pnl_usd, { sign: true })} valueClass={pnlClass(t.unrealized_pnl_usd)} sub={fmtPct(t.unrealized_pct, { sign: true }) + " on cost"} />
        <Kpi label="Total return" value={fmtPct(t.total_return_pct, { sign: true })} valueClass={pnlClass(t.total_return_pct)} sub="incl. dividends & commissions" />
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
          sub={`${fmtPct((t.profit_count / Math.max(t.priced_count, 1)) * 100, { digits: 0 })} of positions up`}
        />
        <Kpi label="Days running" value={fmtInt(day)} sub="since 19 Aug 2024" />
      </section>

      {/* ABOUT */}
      <section id="about" className="mt-16 scroll-mt-16">
        <p className="tracked text-xs font-bold text-gold">The story</p>
        <h2 className="mt-3 font-display text-3xl font-extrabold tracking-tight sm:text-4xl">Own everything. Predict nothing.</h2>
        <p className="mt-4 max-w-3xl text-[16px] leading-relaxed text-ink-2">
          Instead of picking winners, All Stocks Fund owns a tiny piece of <em>every</em> listed company it can buy. Each position is a fraction of a
          share, usually worth between one cent and one dollar. After {fmtInt(day)} days the portfolio holds{" "}
          <strong className="text-ink">{fmtInt(t.companies)}</strong> companies; the goal is <strong className="text-ink">50,000</strong>.
        </p>

        <div className="mt-8 grid gap-4 lg:grid-cols-2">
          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3">
              {[
                ["$0.01 per interaction", "Every view, follow, like, comment and share on the channels adds one cent to the buying budget."],
                ["Dividends reinvested", "Every dividend goes back into buying new companies."],
                ["No predictions", "No stock picking, no market timing. If it's listed and buyable, it qualifies."],
              ].map(([title, d]) => (
                <div key={title} className="card p-4">
                  <div className="font-display text-sm font-bold text-clover">{title}</div>
                  <p className="mt-1.5 text-[13px] leading-relaxed text-ink-2">{d}</p>
                </div>
              ))}
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="card border-l-4 border-l-clover p-4">
                <div className="font-mono text-xs text-muted">Phase 1</div>
                <div className="mt-1 font-display text-sm font-bold">Broad capture</div>
                <p className="mt-1.5 text-[13px] leading-relaxed text-ink-2">Buy as many companies as possible, up to 50,000.</p>
              </div>
              <div className="card border-l-4 border-l-gold p-4">
                <div className="font-mono text-xs text-muted">Phase 2</div>
                <div className="mt-1 font-display text-sm font-bold">Trim &amp; concentrate</div>
                <p className="mt-1.5 text-[13px] leading-relaxed text-ink-2">Gradually concentrate into the top tiers, letting the market decide.</p>
              </div>
            </div>
          </div>

            <div className="card p-5">
              <h3 className="tracked text-[11px] font-bold text-ink-2">Timeline</h3>
              <ol className="mt-4 border-l-2 border-mint pl-5">
                {timeline.map((e) => (
                  <li key={e.date} className="relative pb-3 last:pb-0">
                    <span className="absolute top-1.5 -left-[27px] h-2.5 w-2.5 rounded-full border-2 border-card bg-clover" />
                    <span className="font-mono text-[11px] text-muted">
                      {e.date} {e.label && <span className="text-gold">· {e.label}</span>}
                    </span>
                    <span className="ml-2 text-[13px] text-ink">{e.text}</span>
                  </li>
                ))}
                <li className="relative">
                  <span className="absolute top-1.5 -left-[27px] h-2.5 w-2.5 rounded-full border-2 border-card bg-gold" />
                  <span className="font-mono text-[11px] text-muted">Today</span>
                  <span className="ml-2 text-[13px] font-semibold text-ink">{fmtInt(t.companies)} companies.</span>
                </li>
              </ol>
            </div>
        </div>

        <Benchmarks companies={t.companies} />
      </section>

      {/* GROWTH */}
      {growth.length > 2 && (
        <section className="mt-12">
          <Panel
            title="Companies owned over time"
            note={`One bar per day new companies were bought, from IBKR trade history (available since ${fmtDate(p.first_bought_from)}). The first bar holds the ${fmtInt(before)} companies bought before that.`}
          >
            <GrowthBars data={growth} height={240} />
          </Panel>
        </section>
      )}

      {/* CHARTS */}
      <section className="mt-4 grid gap-4 lg:grid-cols-2">
        <Panel title="Unrealized gain / loss distribution" note={`${fmtInt(priced.length)} positions, grouped by unrealized % on cost.`}>
          <Histogram data={pnlHistogram(p.holdings)} />
        </Panel>
        <Panel title="By sector" note="Number of companies per sector.">
          <BarList data={groupCount(p.holdings, "sector", 12)} />
        </Panel>
        <Panel title="By country (HQ)" note="Top 5 countries by number of companies.">
          <BarList data={groupCount(p.holdings, "country", 5, false)} color="#2f5264" />
        </Panel>
        <Panel title="By exchange" note="Where the shares are listed.">
          <BarList data={groupCount(p.holdings, "exchange", 6)} color="#2f5264" />
        </Panel>
      </section>

      {/* HALL OF FAME */}
      <section className="mt-12">
        <h2 className="tracked text-sm font-extrabold text-ink">Hall of fame &amp; shame</h2>
        <div className="mt-4 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <TopList title="Top gainers" rows={byPct.slice(0, 10)} metric={(h) => fmtPct(h.unrealized_pct, { sign: true })} cls={(h) => pnlClass(h.unrealized_pct)} />
          <TopList title="Top losers" rows={byPct.slice(-10).reverse()} metric={(h) => fmtPct(h.unrealized_pct, { sign: true })} cls={(h) => pnlClass(h.unrealized_pct)} />
          <TopList title="Top dividend yield" rows={yielders} metric={(h) => fmtPct(h.div_yield_pct)} cls={() => "text-gold"} hint="Net dividends ÷ invested" />
          <TopList title="Largest positions" rows={byValue.slice(0, 10)} metric={(h) => fmtUsd(h.market_value)} cls={() => "text-ink"} />
          <TopList title="Smallest positions" rows={byValue.slice(-10).reverse()} metric={(h) => fmtUsd(h.market_value)} cls={() => "text-ink"} />
        </div>
      </section>

      {/* HOLDINGS */}
      <section id="holdings" className="mt-16 scroll-mt-16">
        <h2 className="font-display text-3xl font-extrabold tracking-tight sm:text-4xl">
          All <span className="text-clover">{fmtInt(t.companies)}</span> holdings
        </h2>
        <p className="mt-2 mb-5 max-w-3xl text-sm text-ink-2">
          Positions, prices and P/L from Interactive Brokers. P/L % is on cost basis incl. commissions, like in IBKR. Dividend yield = net dividends ÷
          invested. Click a row for details.
        </p>
        <HoldingsTable version={p.updated_at} />
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
            <a href={`?q=${encodeURIComponent(h.ticker)}#holdings`} className="w-16 shrink-0 truncate font-mono text-[13px] font-bold text-ink hover:text-clover">
              {h.ticker}
            </a>
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
