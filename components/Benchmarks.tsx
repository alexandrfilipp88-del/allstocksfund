import { fmtInt } from "@/lib/format";

// Every figure checked against its source (click a name). Order as chosen by the site owner.
const ROWS: { name: string; value: number; src: string }[] = [
  { name: "Florida State Board of Administration", value: 10300, src: "https://corpgov.law.harvard.edu/2016/12/26/2016-corporate-governance-annual-summary/" },
  { name: "CalPERS", value: 10000, src: "https://www.calpers.ca.gov/sites/default/files/spf/docs/forms-publications/annual-investment-report-2017.pdf" },
  { name: "CalSTRS", value: 10000, src: "https://www.calstrs.com/calstrs-protects-portfolio-members-pensions-by-diligently-voting-on-company-directors-shareholder-proposals" },
  { name: "Norway's oil fund (GPFG)", value: 7201, src: "https://www.nbim.no/en/news-and-insights/reports/" },
  { name: "Swiss National Bank", value: 6700, src: "https://www.snb.ch/public/asset/en/www-snb-ch/publications/communication/speeches/2019/ref_20191114_amrtmo/publications0_en/ref_20191114_amrtmo.en.pdf" },
  { name: "New Zealand Super Fund", value: 6000, src: "https://www.nzsuperfund.nz/news-and-media/nz-super-fund-takes-important-step-improve-transparency/" },
  { name: "State Street", value: 24600, src: "https://www.ssga.com/library-content/assets/pdf/global/asset-stewardship/stewardship-report-2025.pdf" },
  { name: "Dimensional", value: 23275, src: "https://corpgov.law.harvard.edu/2025/11/07/2025-annual-stewardship-report/" },
  { name: "Northern Trust AM", value: 15957, src: "https://www.northerntrust.com/content/dam/northerntrust/pws/nt/documents/investment-management/stewardship-report.pdf" },
  { name: "Vanguard", value: 13432, src: "https://corporate.vanguard.com/content/dam/corp/advocate/investment-stewardship/pdf/policies-and-reports/2025_investment_stewardship_annual_report.pdf" },
  { name: "Goldman Sachs AM", value: 12800, src: "https://am.gs.com/cms-assets/gsam-app/documents/evergreen/en/GS-Stewardship-Report-2025.pdf" },
  { name: "BlackRock", value: 12700, src: "https://corpgov.law.harvard.edu/2025/12/09/2025-global-voting-spotlight/" },
  { name: "UBS Asset Management", value: 12000, src: "https://www.ubs.com/global/en/assetmanagement/capabilities/sustainable-investing/stewardship-engagement.html" },
  { name: "Amundi", value: 7852, src: "https://www.amundi.com/institutional/article/discover-main-highlights-our-2025-stewardship-activity" },
  { name: "New York State Common", value: 3165, src: "https://www.quiverquant.com/institutions/NEW%20YORK%20STATE%20COMMON%20RETIREMENT%20FUND" },
  { name: "PGGM (Netherlands)", value: 2700, src: "https://pggm.nl/en/investment-management-overview/responsible-investment" },
  { name: "AP7 (Sweden)", value: 2000, src: "https://www.ap7.se/app/uploads/2025/12/climateactionplan_2025-final.pdf" },
];

export function Benchmarks({ companies, goal }: { companies: number; goal: number }) {
  // everything in one list, largest first; All Stocks Fund rows are highlighted
  const rows: { name: string; value: number; src?: string; me?: "now" | "goal" }[] = [
    ...ROWS,
    { name: "All Stocks Fund", value: companies, me: "now" as const },
    { name: "All Stocks Fund target", value: goal, me: "goal" as const },
  ].sort((a, b) => b.value - a.value);
  const scale = Math.max(...rows.map((r) => r.value));

  return (
    <div className="card mt-4 p-5 sm:p-6">
      <h3 className="font-display text-base font-bold text-ink">How broad is that?</h3>
      <p className="mt-0.5 text-xs text-muted">Number of companies, compared with some of the world&apos;s biggest investors.</p>

      <ul className="mt-5 gap-x-8 lg:columns-2">
        {rows.map((r) => (
          <li key={r.name} className="mb-3 break-inside-avoid">
            <div className="flex items-baseline justify-between gap-3 text-[13px]">
              {r.src ? (
                <a href={r.src} target="_blank" rel="noreferrer" className="min-w-0 truncate text-ink hover:text-clover hover:underline">
                  {r.name}
                </a>
              ) : (
                <span className="min-w-0 truncate font-bold text-ink">{r.name}</span>
              )}
              <span className={`num shrink-0 ${r.me ? "font-bold" : "font-semibold"}`}>{fmtInt(r.value)}</span>
            </div>
            <div className="mt-1 h-2 rounded-r-[3px] bg-ice/70">
              <div
                className={`h-full rounded-r-[3px] ${r.me === "goal" ? "bg-clover" : r.me === "now" ? "bg-gold" : "bg-navy"}`}
                style={{ width: `${Math.max((r.value / scale) * 100, 0.5)}%` }}
              />
            </div>
          </li>
        ))}
      </ul>

      <p className="mt-3 text-[11px] leading-relaxed text-muted">
        Click a name for its source. Investors publish different measures (companies held, companies voted at, or shareholder meetings voted),
        so treat these as approximate company counts.
      </p>
    </div>
  );
}
