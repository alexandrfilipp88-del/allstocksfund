// Runs before every build (`npm run build` / Vercel). Offline: reads only files in the repo.
import fs from "node:fs";
import path from "node:path";
import { loadRawPortfolio, buildPortfolio, toCsv, readJson, DATA_DIR, PUBLIC_DATA_DIR, EXTRAS_DIR } from "./lib.mjs";

const raw = await loadRawPortfolio();
const prices = readJson(path.join(DATA_DIR, "prices.json"), null);
const extras = await loadRawPortfolio(EXTRAS_DIR, false);
const portfolio = buildPortfolio(raw, prices, extras);
const history = readJson(path.join(DATA_DIR, "history.json"), []);

// add a live point for the current upload if history has no entry for today yet
const today = new Date().toISOString().slice(0, 10);
const t = portfolio.totals;
const live = {
  date: today,
  companies: t.companies,
  invested: t.invested_usd,
  value: t.market_value_usd,
  pnl: t.unrealized_pnl_usd,
  dividends: t.net_dividends_usd,
  source: "build",
};
const fullHistory = history.some((h) => h.date === today) ? history : [...history, live];

fs.mkdirSync(PUBLIC_DATA_DIR, { recursive: true });
fs.writeFileSync(path.join(PUBLIC_DATA_DIR, "portfolio.json"), JSON.stringify(portfolio));
fs.writeFileSync(path.join(PUBLIC_DATA_DIR, "history.json"), JSON.stringify(fullHistory));
fs.writeFileSync(path.join(PUBLIC_DATA_DIR, "holdings.csv"), toCsv(portfolio.holdings));

const missing = portfolio.holdings.filter((h) => h.price === null).map((h) => h.ticker);
console.log(`[data] ${raw.file}: ${t.companies} companies, ${t.priced_count} priced, invested $${t.invested_usd}, value $${t.market_value_usd}`);
if (missing.length) console.log(`[data] no price for ${missing.length}: ${missing.slice(0, 40).join(", ")}${missing.length > 40 ? " ..." : ""}`);
if (extras) console.log(`[data] merged dividends/commissions from extras/${extras.file}`);
if (!prices) console.log("[data] data/prices.json not found - run `npm run prices` to fetch market prices");
