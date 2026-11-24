// Daily job (GitHub Action or manual `npm run prices`): fetch delayed market prices,
// store them in data/prices.json and record one snapshot per day in data/history.json.
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fetchPrices, loadRawPortfolio, buildPortfolio, readJson, findPortfolioFile, DATA_DIR, ROOT } from "./lib.mjs";

// In CI only: keep just the newest uploaded portfolio file so the site never reads a stale one.
const { all } = findPortfolioFile();
if (all.length > 1 && process.env.CI) {
  for (const old of all.slice(1)) {
    console.log("[prices] removing older portfolio file", old.name);
    execFileSync("git", ["rm", "-q", "--", path.relative(ROOT, old.full)], { cwd: ROOT });
  }
}

let priceData;
try {
  priceData = await fetchPrices();
  fs.writeFileSync(path.join(DATA_DIR, "prices.json"), JSON.stringify(priceData));
  console.log(`[prices] fetched ${priceData.count} prices`);
} catch (e) {
  console.error("[prices] fetch failed:", e.message);
  priceData = readJson(path.join(DATA_DIR, "prices.json"), null);
  if (!priceData) process.exit(1);
}

const raw = await loadRawPortfolio();
const p = buildPortfolio(raw, priceData);
const t = p.totals;
const histFile = path.join(DATA_DIR, "history.json");
const history = readJson(histFile, []);
const today = new Date().toISOString().slice(0, 10);
const last = [...history].reverse().find((h) => h.source === "daily");
if (last && Math.abs(t.companies - last.companies) / last.companies > 0.1) {
  console.warn(`[prices] WARNING: company count changed >10% (${last.companies} -> ${t.companies}). Check the uploaded file.`);
}
const snap = {
  date: today,
  companies: t.companies,
  invested: t.invested_usd,
  value: t.market_value_usd,
  pnl: t.unrealized_pnl_usd,
  dividends: t.net_dividends_usd,
  source: "daily",
};
// past entries are never rewritten; only today's entry is replaced by a later run on the same day
const next = history
  .filter((h) => h.date !== today)
  .concat(snap)
  .sort((a, b) => a.date.localeCompare(b.date));
fs.writeFileSync(histFile, JSON.stringify(next, null, 2) + "\n");
console.log(`[prices] snapshot ${today}: ${t.companies} companies, value $${t.market_value_usd}, P/L $${t.unrealized_pnl_usd}`);
