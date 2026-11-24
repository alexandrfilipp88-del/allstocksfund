// Derives the "first bought" date of each current holding from IBKR trade exports.
//
//   node scripts/import-trades.mjs            (reads raw/trades_*.json + raw/positions.json)
//
// A holding counts as "new" on its first BUY date when the trades in the exported window add
// up to its whole current position (otherwise it already existed before the window).
// Output data/first_bought.json holds only { ticker: "YYYY-MM-DD" } - no trade ids, prices or account data.
// Existing dates are kept, so the file keeps growing as daily exports are added.
import fs from "node:fs";
import path from "node:path";
import { ROOT, DATA_DIR, readJson } from "./lib.mjs";

const rawDir = path.join(ROOT, "raw");
const files = fs.readdirSync(rawDir).filter((f) => /^trades_.*\.json$/i.test(f));
if (!files.length) {
  console.log("[trades] no raw/trades_*.json files - nothing to do");
  process.exit(0);
}

const trades = new Map();
for (const f of files) {
  const j = JSON.parse(fs.readFileSync(path.join(rawDir, f), "utf8"));
  for (const t of j.trades || j) trades.set(t.trade_id ?? `${f}:${trades.size}`, t);
}
const list = [...trades.values()].filter((t) => t.symbol && t.trade_time).sort((a, b) => a.trade_time.localeCompare(b.trade_time));
const windowStart = list[0]?.trade_time.slice(0, 10);

const positions = JSON.parse(fs.readFileSync(path.join(rawDir, "positions.json"), "utf8")).positions;
const held = new Map(positions.map((p) => [String(p.contract_description).split(/\s+@/)[0].trim().toUpperCase(), p.position]));

const net = new Map();
const firstBuy = new Map();
for (const t of list) {
  const s = t.symbol.trim().toUpperCase();
  net.set(s, (net.get(s) || 0) + (t.side === "BUY" ? 1 : -1) * t.size);
  if (t.side === "BUY" && !firstBuy.has(s)) firstBuy.set(s, t.trade_time.slice(0, 10));
}

const file = path.join(DATA_DIR, "first_bought.json");
const prev = readJson(file, { tickers: {} });
const tickers = { ...prev.tickers };
let added = 0;
for (const [s, qty] of held) {
  if (tickers[s] || !firstBuy.has(s)) continue;
  const n = net.get(s) || 0;
  if (Math.abs(n - qty) <= Math.max(1e-4, 0.02 * qty)) {
    tickers[s] = firstBuy.get(s);
    added++;
  }
}
const sorted = Object.fromEntries(Object.entries(tickers).sort(([a], [b]) => a.localeCompare(b)));
const windowFrom = [prev.window_from, windowStart].filter(Boolean).sort()[0];
fs.writeFileSync(
  file,
  JSON.stringify({ updated_at: new Date().toISOString(), window_from: windowFrom, tickers: sorted }, null, 0).replace(/,"/g, ',\n"') + "\n",
);
console.log(`[trades] ${list.length} trades since ${windowStart}; ${Object.keys(sorted).length} holdings dated (+${added} new)`);
