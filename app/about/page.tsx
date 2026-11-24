import type { Metadata } from "next";
import { getPortfolio, daysSinceStart } from "@/lib/data";
import { fmtInt } from "@/lib/format";

export const metadata: Metadata = { title: "About" };

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

export default function About() {
  const p = getPortfolio();
  const n = p.totals.companies;
  const comparison = [
    { name: "Vanguard Total World (VT)", value: 9500 },
    { name: "iShares MSCI ACWI IMI", value: 13000 },
    { name: "All Stocks Fund today", value: n, accent: "gold" },
    { name: "All Stocks Fund target", value: 50000, accent: "clover" },
  ];
  return (
    <div className="mx-auto max-w-3xl px-4 pt-12">
      <p className="tracked text-xs font-bold text-gold">The story</p>
      <h1 className="mt-3 font-display text-3xl font-extrabold tracking-tight sm:text-5xl">Own everything. Predict nothing.</h1>
      <p className="mt-6 text-[17px] leading-relaxed text-ink-2">
        All Stocks Fund is a public experiment: instead of picking winners, own a tiny piece of <em>every</em> listed company in
        the world. Each position is a fraction of a share, usually worth between one cent and one dollar. After{" "}
        {fmtInt(daysSinceStart())} days, the portfolio holds <strong className="text-ink">{fmtInt(n)}</strong> companies. The
        goal is <strong className="text-ink">50,000</strong>.
      </p>

      <h2 className="tracked mt-14 text-sm font-extrabold">The rules</h2>
      <ul className="mt-4 grid gap-3 sm:grid-cols-3">
        {[
          ["$0.01 per interaction", "Every view, follow, like, comment and share on the channels adds one cent to the buying budget."],
          ["Dividends reinvested", "Every dividend goes back into buying new companies."],
          ["No predictions", "No stock picking, no market timing. If it's listed and buyable, it qualifies."],
        ].map(([t, d]) => (
          <li key={t} className="card p-5">
            <div className="font-display text-sm font-bold text-clover">{t}</div>
            <p className="mt-2 text-sm leading-relaxed text-ink-2">{d}</p>
          </li>
        ))}
      </ul>

      <h2 className="tracked mt-14 text-sm font-extrabold">The plan</h2>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <div className="card border-l-4 border-l-clover p-5">
          <div className="font-mono text-xs text-muted">Phase 1</div>
          <div className="mt-1 font-display font-bold">Broad capture</div>
          <p className="mt-2 text-sm leading-relaxed text-ink-2">
            Buy as many companies as possible, up to 50,000. Fractional shares make the first ~9,500 cheap; after that, only
            whole shares remain.
          </p>
        </div>
        <div className="card border-l-4 border-l-gold p-5">
          <div className="font-mono text-xs text-muted">Phase 2</div>
          <div className="mt-1 font-display font-bold">Trim &amp; concentrate</div>
          <p className="mt-2 text-sm leading-relaxed text-ink-2">Gradually concentrate into the top tiers, letting the market (not opinions) decide.</p>
        </div>
      </div>

      <h2 className="tracked mt-14 text-sm font-extrabold">How broad is that?</h2>
      <p className="mt-2 text-sm text-ink-2">Number of companies held, compared with the broadest world index funds.</p>
      <ul className="card mt-4 space-y-3 p-5">
        {comparison.map((c) => (
          <li key={c.name} className="grid grid-cols-[minmax(0,10rem)_1fr_auto] items-center gap-3 text-sm sm:grid-cols-[minmax(0,14rem)_1fr_auto]">
            <span className={`truncate ${c.accent ? "font-semibold text-ink" : "text-ink-2"}`}>{c.name}</span>
            <span className="h-3.5">
              <span
                className={`block h-full rounded-r-[4px] ${c.accent === "clover" ? "bg-clover" : c.accent === "gold" ? "bg-gold" : "bg-navy"}`}
                style={{ width: `${(c.value / 50000) * 100}%` }}
              />
            </span>
            <span className="num w-16 text-right font-semibold">{c.accent ? "" : "~"}{fmtInt(c.value)}</span>
          </li>
        ))}
      </ul>

      <h2 className="tracked mt-14 text-sm font-extrabold">Timeline</h2>
      <ol className="mt-5 border-l-2 border-mint pl-6">
        {timeline.map((t) => (
          <li key={t.date} className="relative pb-6 last:pb-0">
            <span className="absolute top-1.5 -left-[31px] h-3 w-3 rounded-full border-2 border-card bg-clover" />
            <div className="font-mono text-xs text-muted">
              {t.date} {t.label && <span className="text-gold">· {t.label}</span>}
            </div>
            <div className="mt-0.5 text-sm text-ink">{t.text}</div>
          </li>
        ))}
        <li className="relative">
          <span className="absolute top-1.5 -left-[31px] h-3 w-3 rounded-full border-2 border-card bg-gold" />
          <div className="font-mono text-xs text-muted">Today</div>
          <div className="mt-0.5 text-sm font-semibold text-ink">{fmtInt(n)} companies.</div>
        </li>
      </ol>

      <h2 className="tracked mt-14 text-sm font-extrabold">Follow along</h2>
      <div className="mt-4 flex flex-wrap gap-2 text-sm font-semibold">
        <a className="rounded-xl bg-clover px-4 py-2.5 text-white hover:bg-clover-deep" href="https://www.youtube.com/results?search_query=All+Stocks+Fund" target="_blank" rel="noreferrer">
          YouTube · All Stocks Fund
        </a>
        <a className="rounded-xl border border-line bg-card px-4 py-2.5 hover:border-clover" href="https://www.tiktok.com/@allstocksportfolio" target="_blank" rel="noreferrer">
          TikTok · @allstocksportfolio
        </a>
        <a className="rounded-xl border border-line bg-card px-4 py-2.5 hover:border-clover" href="https://t.me/allstocksfund" target="_blank" rel="noreferrer">
          Telegram · @allstocksfund
        </a>
      </div>

      <h2 className="tracked mt-14 text-sm font-extrabold">Open data</h2>
      <p className="mt-2 text-sm leading-relaxed text-ink-2">
        The full dataset is public: <a className="font-mono text-clover hover:underline" href="/data/portfolio.json">/data/portfolio.json</a>,{" "}
        <a className="font-mono text-clover hover:underline" href="/data/holdings.csv">/data/holdings.csv</a> and{" "}
        <a className="font-mono text-clover hover:underline" href="/data/history.json">/data/history.json</a>. Prices are delayed quotes
        refreshed once a day.
      </p>

      <p className="card mt-14 bg-gold-soft/60 p-5 text-sm leading-relaxed text-ink">
        <strong>Disclaimer.</strong> Personal portfolio experiment. Not a fund, not investment advice, no outside money accepted.
      </p>
    </div>
  );
}
