import { fmtInt } from "@/lib/format";

type Row = { name: string; value: number; what: string; year: string; src: string; plus?: boolean };

// Every figure checked against its source (click a name). "what" says what is counted.
const GROUPS: { title: string; note?: string; rows: Row[] }[] = [
  {
    title: "State-owned funds",
    note: "Pension funds, sovereign funds, central banks",
    rows: [
      { name: "Florida State Board of Administration", value: 10300, plus: true, what: "companies voted at", year: "2016", src: "https://corpgov.law.harvard.edu/2016/12/26/2016-corporate-governance-annual-summary/" },
      { name: "CalPERS", value: 10000, plus: true, what: "companies held", year: "2017", src: "https://www.calpers.ca.gov/sites/default/files/spf/docs/forms-publications/annual-investment-report-2017.pdf" },
      { name: "CalSTRS", value: 10000, what: "company AGMs voted / year", year: "2025", src: "https://www.calstrs.com/calstrs-protects-portfolio-members-pensions-by-diligently-voting-on-company-directors-shareholder-proposals" },
      { name: "Norway's oil fund (GPFG)", value: 7201, what: "companies held", year: "end 2025", src: "https://www.nbim.no/en/news-and-insights/reports/" },
      { name: "Swiss National Bank", value: 6700, what: "company shares held", year: "2019", src: "https://www.snb.ch/public/asset/en/www-snb-ch/publications/communication/speeches/2019/ref_20191114_amrtmo/publications0_en/ref_20191114_amrtmo.en.pdf" },
      { name: "New Zealand Super Fund", value: 6000, what: "companies held", year: "2019", src: "https://www.nzsuperfund.nz/news-and-media/nz-super-fund-takes-important-step-improve-transparency/" },
    ],
  },
  {
    title: "Asset managers",
    note: "All their funds combined",
    rows: [
      { name: "State Street", value: 24600, what: "meetings voted", year: "2025", src: "https://www.ssga.com/library-content/assets/pdf/global/asset-stewardship/stewardship-report-2025.pdf" },
      { name: "Dimensional", value: 23275, what: "meetings voted", year: "2025", src: "https://corpgov.law.harvard.edu/2025/11/07/2025-annual-stewardship-report/" },
      { name: "Northern Trust AM", value: 15957, what: "meetings voted", year: "2025", src: "https://www.northerntrust.com/content/dam/northerntrust/pws/nt/documents/investment-management/stewardship-report.pdf" },
      { name: "Vanguard", value: 13432, what: "companies voted at", year: "2025", src: "https://corporate.vanguard.com/content/dam/corp/advocate/investment-stewardship/pdf/policies-and-reports/2025_investment_stewardship_annual_report.pdf" },
      { name: "Goldman Sachs AM", value: 12800, plus: true, what: "meetings voted", year: "2025", src: "https://am.gs.com/cms-assets/gsam-app/documents/evergreen/en/GS-Stewardship-Report-2025.pdf" },
      { name: "BlackRock", value: 12700, plus: true, what: "companies voted at", year: "2024–25", src: "https://corpgov.law.harvard.edu/2025/12/09/2025-global-voting-spotlight/" },
      { name: "UBS Asset Management", value: 12000, what: "meetings voted", year: "latest", src: "https://www.ubs.com/global/en/assetmanagement/capabilities/sustainable-investing/stewardship-engagement.html" },
      { name: "Amundi", value: 7852, what: "companies voted at", year: "2025", src: "https://www.amundi.com/institutional/article/discover-main-highlights-our-2025-stewardship-activity" },
    ],
  },
  {
    title: "Fewer companies than ASF",
    note: "Big investors below today's count",
    rows: [
      { name: "New York State Common", value: 3165, what: "US stock positions (13F)", year: "Sep 2026", src: "https://www.quiverquant.com/institutions/NEW%20YORK%20STATE%20COMMON%20RETIREMENT%20FUND" },
      { name: "PGGM (Netherlands)", value: 2700, what: "listed companies held", year: "latest", src: "https://pggm.nl/en/investment-management-overview/responsible-investment" },
      { name: "AP7 (Sweden)", value: 2000, plus: true, what: "companies held", year: "2025", src: "https://www.ap7.se/app/uploads/2025/12/climateactionplan_2025-final.pdf" },
    ],
  },
];

const SCALE = 25_000; // bar scale for the benchmark rows

export function Benchmarks({ companies, goal }: { companies: number; goal: number }) {
  const mark = `${(companies / SCALE) * 100}%`;
  return (
    <div className="card mt-4 p-5 sm:p-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h3 className="font-display text-base font-bold text-ink">How broad is that?</h3>
          <p className="mt-0.5 text-xs text-muted">Companies owned by All Stocks Fund vs. some of the world&apos;s biggest investors.</p>
        </div>
        <div className="flex gap-5 text-[13px]">
          <span>
            <span className="mr-1.5 inline-block h-2.5 w-2.5 rounded-sm bg-gold align-middle" />
            ASF today <strong className="num">{fmtInt(companies)}</strong>
          </span>
          <span>
            <span className="mr-1.5 inline-block h-2.5 w-2.5 rounded-sm bg-clover align-middle" />
            ASF target <strong className="num">{fmtInt(goal)}</strong>
          </span>
        </div>
      </div>

      <div className="mt-6 grid gap-x-8 gap-y-8 lg:grid-cols-3">
        {GROUPS.map((g) => (
          <div key={g.title}>
            <h4 className="tracked text-[11px] font-bold text-ink">{g.title}</h4>
            {g.note && <p className="mt-0.5 text-[11px] text-muted">{g.note}</p>}
            <ul className="mt-3 space-y-2.5">
              {[...g.rows]
                .sort((a, b) => b.value - a.value)
                .map((r) => (
                  <li key={r.name}>
                    <div className="flex items-baseline justify-between gap-3 text-[13px]">
                      <a href={r.src} target="_blank" rel="noreferrer" className="min-w-0 truncate text-ink hover:text-clover hover:underline" title={`${r.name}: ${r.what}, ${r.year}`}>
                        {r.name}
                      </a>
                      <span className="num shrink-0 font-semibold">
                        {fmtInt(r.value)}
                        {r.plus ? "+" : ""}
                      </span>
                    </div>
                    <div className="relative mt-1 h-2 rounded-r-[3px] bg-ice/70">
                      <div className="h-full rounded-r-[3px] bg-navy" style={{ width: `${Math.min((r.value / SCALE) * 100, 100)}%` }} />
                      <div className="absolute -top-0.5 -bottom-0.5 w-[2px] bg-gold" style={{ left: mark }} title={`ASF today: ${fmtInt(companies)}`} />
                    </div>
                    <div className="mt-0.5 text-[10.5px] text-muted">
                      {r.what} · {r.year}
                    </div>
                  </li>
                ))}
            </ul>
          </div>
        ))}
      </div>

      <p className="mt-6 text-[11px] leading-relaxed text-muted">
        The gold line on each bar marks ASF today. Click a name for its source. Funds publish different things: companies held, companies voted at,
        or shareholder meetings voted (a company usually holds one meeting a year), so treat these as approximate company counts.
      </p>
    </div>
  );
}
