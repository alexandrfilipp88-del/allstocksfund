import type { Metadata, Viewport } from "next";
import { Montserrat, Space_Mono } from "next/font/google";
import Link from "next/link";
import "./globals.css";
import { Logo } from "@/components/Logo";

const montserrat = Montserrat({ subsets: ["latin"], variable: "--font-montserrat", weight: ["400", "500", "600", "700", "800"] });
const spaceMono = Space_Mono({ subsets: ["latin"], variable: "--font-space-mono", weight: ["400", "700"] });

export const metadata: Metadata = {
  title: { default: "All Stocks Fund · Own Everything. Predict Nothing.", template: "%s · All Stocks Fund" },
  description:
    "A public experiment to own a tiny slice of every listed company. Live, transparent portfolio of thousands of fractional positions.",
  openGraph: {
    title: "All Stocks Fund",
    description: "Own Everything. Predict Nothing. A transparent portfolio of thousands of companies.",
    type: "website",
  },
};

export const viewport: Viewport = { themeColor: "#f5f3ee", width: "device-width", initialScale: 1 };

const nav = [
  { href: "/#dashboard", label: "Dashboard" },
  { href: "/#about", label: "About" },
  { href: "/#holdings", label: "Holdings" },
];

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" style={{ scrollBehavior: "smooth" }} className={`${montserrat.variable} ${spaceMono.variable}`}>
      <body className="min-h-screen antialiased">
        <header className="sticky top-0 z-30 border-b border-line bg-paper/90 backdrop-blur">
          <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-4 px-4">
            <Link href="/" className="flex items-center gap-2.5" aria-label="All Stocks Fund home">
              <Logo className="h-7 w-7" />
              <span className="hidden font-display text-[13px] font-extrabold tracking-[0.18em] whitespace-nowrap text-ink uppercase sm:inline">
                All Stocks <span className="text-clover">Fund</span>
              </span>
            </Link>
            <nav className="flex items-center gap-0.5 text-sm font-semibold sm:gap-1">
              {nav.map((n) => (
                <Link key={n.href} href={n.href} className="rounded-lg px-2.5 py-1.5 text-ink-2 hover:bg-ice hover:text-ink sm:px-3">
                  {n.label}
                </Link>
              ))}
            </nav>
          </div>
        </header>

        <main>{children}</main>

        <footer className="mt-20 border-t border-line bg-cream/60">
          <div className="mx-auto grid max-w-6xl gap-6 px-4 py-10 sm:grid-cols-[1fr_auto]">
            <div>
              <div className="flex items-center gap-2.5">
                <Logo className="h-6 w-6" />
                <span className="tracked text-xs font-bold">All Stocks Fund</span>
              </div>
              <p className="mt-2 font-mono text-xs text-ink-2">Own Everything. Predict Nothing.</p>
              <p className="mt-4 max-w-xl text-xs leading-relaxed text-ink-2">
                Personal portfolio experiment. Not a fund, not investment advice, no outside money accepted. Prices are delayed
                market data and may be incomplete.
              </p>
            </div>
            <div className="flex flex-wrap items-start gap-2 text-sm font-semibold sm:justify-end">
              <a className="rounded-lg border border-line bg-card px-3 py-1.5 hover:border-clover" href="https://www.youtube.com/results?search_query=All+Stocks+Fund" target="_blank" rel="noreferrer">
                YouTube
              </a>
              <a className="rounded-lg border border-line bg-card px-3 py-1.5 hover:border-clover" href="https://t.me/allstocksfund" target="_blank" rel="noreferrer">
                Telegram
              </a>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
