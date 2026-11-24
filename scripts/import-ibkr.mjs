// Turns a raw IBKR positions export (connector `get_account_positions` JSON) into the
// sanitized portfolio/portfolio.json the site reads, and records today's snapshot.
//
//   node scripts/import-ibkr.mjs [raw/positions.json] [--force]
//
// The raw file stays in raw/ (git-ignored). Only allowlisted per-stock fields are written:
// no account id, cash, margin or any account-level figure ever leaves this script.
import fs from "node:fs";
import path from "node:path";
import {
  ROOT, DATA_DIR, PORTFOLIO_DIR, EXTRAS_DIR,
  readJson, fetchPrices, loadRawPortfolio, buildPortfolio,
} from "./lib.mjs";

const args = process.argv.slice(2);
const force = args.includes("--force");
const input = path.resolve(ROOT, args.find((a) => !a.startsWith("--")) || "raw/positions.json");

const raw = JSON.parse(fs.readFileSync(input, "utf8"));
const positions = Array.isArray(raw) ? raw : raw.positions;
if (!Array.isArray(positions)) throw new Error("Expected { positions: [...] } from the IBKR export");

const n = (v) => (typeof v === "number" && Number.isFinite(v) ? v : v == null || v === "" ? null : Number(v));
const holdings = [];
const skipped = [];
for (const p of positions) {
  const desc = String(p.contract_description ?? p.ticker ?? p.symbol ?? "").trim();
  const qty = n(p.position ?? p.quantity);
  if (!desc || !qty) {
    skipped.push(desc || `#${p.contract_id ?? "?"}`);
    continue;
  }
  if (p.asset_class && p.asset_class !== "STK") {
    skipped.push(desc);
    continue;
  }
  // "ALDFF @PINK" -> ticker ALDFF on PINK
  const [ticker, venue] = desc.split(/\s+@/);
  const avg = n(p.average_price ?? p.avg_cost);
  // strict allowlist of output fields
  holdings.push({
    ticker: ticker.trim(),
    exchange: venue ? venue.trim() : undefined,
    quantity: qty,
    average_price: avg,
    market_price: n(p.market_price),
    market_value: n(p.market_value),
    unrealized_pnl: n(p.unrealized_pnl),
    cost_basis: avg != null ? qty * avg : null,
    currency: p.currency || "USD",
  });
}

// sanity check vs the previous import: refuse big swings unless --force
const outFile = path.join(PORTFOLIO_DIR, "portfolio.json");
const prev = readJson(outFile, null);
const prevCount = prev?.holdings?.length;
if (prevCount && Math.abs(holdings.length - prevCount) / prevCount > 0.1 && !force) {
  console.error(`[ibkr] position count changed ${prevCount} -> ${holdings.length} (>10%). Re-run with --force if this is correct.`);
  process.exit(1);
}
if (holdings.length < 100 && !force) {
  console.error(`[ibkr] only ${holdings.length} positions - refusing to publish (use --force).`);
  process.exit(1);
}

const out = {
  source: "ibkr",
  as_of: new Date().toISOString(),
  note: "Per-stock positions exported from Interactive Brokers. average_price includes commissions (IBKR cost basis).",
  holdings,
};
fs.mkdirSync(PORTFOLIO_DIR, { recursive: true });
fs.writeFileSync(outFile, JSON.stringify(out, null, 0).replace(/\},\{/g, "},\n{") + "\n");
console.log(`[ibkr] wrote ${holdings.length} positions to portfolio/portfolio.json${skipped.length ? ` (skipped ${skipped.length})` : ""}`);

// refresh names / sectors / countries (best effort; prices come from IBKR)
let priceData = readJson(path.join(DATA_DIR, "prices.json"), null);
try {
  priceData = await fetchPrices();
  fs.writeFileSync(path.join(DATA_DIR, "prices.json"), JSON.stringify(priceData));
  console.log(`[ibkr] refreshed company metadata (${priceData.count} symbols)`);
} catch (e) {
  console.warn("[ibkr] metadata refresh skipped:", e.message);
}

// record today's snapshot (past days are never rewritten)
const rawP = await loadRawPortfolio();
const extras = await loadRawPortfolio(EXTRAS_DIR, false);
const t = buildPortfolio(rawP, priceData, extras).totals;
const histFile = path.join(DATA_DIR, "history.json");
const history = readJson(histFile, []);
const today = new Date().toISOString().slice(0, 10);
const snap = {
  date: today,
  companies: t.companies,
  invested: t.cost_usd,
  value: t.market_value_usd,
  pnl: t.unrealized_pnl_usd,
  dividends: t.net_dividends_usd,
  source: "ibkr",
};
const next = history.filter((h) => h.date !== today).concat(snap).sort((a, b) => a.date.localeCompare(b.date));
fs.writeFileSync(histFile, JSON.stringify(next, null, 2) + "\n");
console.log(`[ibkr] snapshot ${today}: ${t.companies} companies, cost $${t.cost_usd}, value $${t.market_value_usd}, P/L $${t.unrealized_pnl_usd} (${t.unrealized_pct}%)`);
