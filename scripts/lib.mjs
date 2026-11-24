// Shared data helpers for the All Stocks Fund site.
// Reads the uploaded portfolio file (xlsx / csv / json) from /portfolio,
// merges it with cached market prices (data/prices.json) and produces a
// sanitized, allowlisted dataset. No broker connection, no credentials.

import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import readXlsx from "read-excel-file/node";
import Papa from "papaparse";

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
export const PORTFOLIO_DIR = path.join(ROOT, "portfolio");
export const DATA_DIR = path.join(ROOT, "data");
export const PUBLIC_DATA_DIR = path.join(ROOT, "public", "data");

// ---------- column mapping ----------
// Header names are matched case-insensitively, ignoring spaces/underscores.
const ALIASES = {
  ticker: ["ticker", "symbol", "contractdescription", "contract_description", "stock"],
  name: ["name", "company", "description", "companyname"],
  exchange: ["exchange", "listingexchange", "mainexchange", "exch"],
  country: ["country", "countryofhq"],
  status: ["status"],
  buy_price: ["price", "buyprice", "avgprice", "averageprice", "average_price", "costprice", "avgcost"],
  quantity: ["quantity", "qty", "position", "shares"],
  invested: ["invested", "investment", "costbasis", "amount"],
  commission: ["comission", "commission", "commissions", "fees", "fee"],
  net_dividends: ["divnet", "netdividends", "dividends", "dividend", "divs"],
  market_price: ["marketprice", "market_price", "currentprice", "lastprice", "last", "mktprice"],
  first_bought: ["firstbought", "date", "buydate", "tradedate", "opened"],
};

const norm = (s) => String(s ?? "").toLowerCase().replace(/[\s_\-./()]/g, "");

function mapHeaders(headers) {
  const idx = {};
  headers.forEach((h, i) => {
    const n = norm(h);
    for (const [key, list] of Object.entries(ALIASES)) {
      if (idx[key] !== undefined) continue; // first matching column wins (e.g. the first "Price" = buy price)
      if (list.map(norm).includes(n)) {
        idx[key] = i;
        return;
      }
    }
  });
  return idx;
}

const num = (v) => {
  if (v === null || v === undefined || v === "") return null;
  if (typeof v === "number") return Number.isFinite(v) ? v : null;
  const n = Number(String(v).replace(/[$,%\s]/g, ""));
  return Number.isFinite(n) ? n : null;
};

const str = (v) => (v === null || v === undefined ? "" : String(v).trim());

function dateStr(v) {
  if (!v) return null;
  if (v instanceof Date && !isNaN(v)) return v.toISOString().slice(0, 10);
  const s = String(v).trim();
  const m = s.match(/^(\d{4})-?(\d{2})-?(\d{2})/);
  return m ? `${m[1]}-${m[2]}-${m[3]}` : null;
}

function rowsFromTable(table) {
  // table: array of arrays, first non-empty row is the header
  const start = table.findIndex((r) => r && r.some((c) => str(c) !== ""));
  if (start < 0) return [];
  const idx = mapHeaders(table[start]);
  if (idx.ticker === undefined) throw new Error("Portfolio file has no Ticker/Symbol column. Headers: " + table[start].join(", "));
  const get = (r, k) => (idx[k] === undefined ? null : r[idx[k]]);
  return table.slice(start + 1).map((r) => ({
    ticker: str(get(r, "ticker")),
    name: str(get(r, "name")),
    exchange: str(get(r, "exchange")),
    country: str(get(r, "country")),
    status: str(get(r, "status")),
    buy_price: num(get(r, "buy_price")),
    quantity: num(get(r, "quantity")),
    invested: num(get(r, "invested")),
    commission: num(get(r, "commission")),
    net_dividends: num(get(r, "net_dividends")),
    market_price: num(get(r, "market_price")),
    first_bought: dateStr(get(r, "first_bought")),
  }));
}

function rowsFromJson(json) {
  let arr = json;
  if (!Array.isArray(arr)) arr = json.holdings || json.positions || json.data || json.rows || [];
  if (!arr.length) return [];
  const headers = Array.from(new Set(arr.flatMap((o) => Object.keys(o))));
  return rowsFromTable([headers, ...arr.map((o) => headers.map((h) => o[h]))]);
}

// ---------- locate the uploaded file ----------
function gitTime(file) {
  try {
    const out = execFileSync("git", ["log", "-1", "--format=%ct", "--", file], { cwd: ROOT, stdio: ["ignore", "pipe", "ignore"] })
      .toString()
      .trim();
    return out ? Number(out) * 1000 : 0;
  } catch {
    return 0;
  }
}

export function findPortfolioFile() {
  if (!fs.existsSync(PORTFOLIO_DIR)) throw new Error("Missing /portfolio folder");
  const files = fs
    .readdirSync(PORTFOLIO_DIR)
    .filter((f) => /\.(xlsx|csv|json)$/i.test(f) && !f.startsWith("~$"))
    .map((f) => {
      const full = path.join(PORTFOLIO_DIR, f);
      return { full, name: f, time: gitTime(full) || fs.statSync(full).mtimeMs };
    });
  if (!files.length) throw new Error("No .xlsx, .csv or .json file found in /portfolio");
  // newest file wins (by git commit time when available, otherwise file time, then name)
  files.sort((a, b) => b.time - a.time || b.name.localeCompare(a.name));
  return { ...files[0], all: files };
}

export async function loadRawPortfolio() {
  const file = findPortfolioFile();
  const ext = path.extname(file.name).toLowerCase();
  let rows;
  if (ext === ".xlsx") {
    const sheets = await readXlsx(file.full);
    const sheet = Array.isArray(sheets) && sheets[0]?.data ? sheets[0].data : sheets;
    rows = rowsFromTable(sheet);
  } else if (ext === ".csv") {
    const text = fs.readFileSync(file.full, "utf8").replace(/^﻿/, "");
    const parsed = Papa.parse(text, { skipEmptyLines: true });
    rows = rowsFromTable(parsed.data);
  } else {
    rows = rowsFromJson(JSON.parse(fs.readFileSync(file.full, "utf8")));
  }
  rows = rows.filter((r) => r.ticker && !/^(sold|closed)$/i.test(r.status) && (r.quantity ?? 0) > 0);
  // merge duplicate tickers (e.g. the same stock bought twice on separate rows)
  const byTicker = new Map();
  for (const r of rows) {
    const k = r.ticker.toUpperCase();
    const prev = byTicker.get(k);
    if (!prev) {
      byTicker.set(k, { ...r, ticker: k });
      continue;
    }
    const add = (a, b) => (a ?? 0) + (b ?? 0);
    prev.quantity = add(prev.quantity, r.quantity);
    prev.invested = add(prev.invested, r.invested);
    prev.commission = add(prev.commission, r.commission);
    prev.net_dividends = add(prev.net_dividends, r.net_dividends);
    prev.buy_price = prev.quantity ? prev.invested / prev.quantity : prev.buy_price;
    if (r.first_bought && (!prev.first_bought || r.first_bought < prev.first_bought)) prev.first_bought = r.first_bought;
  }
  return { file: file.name, rows: [...byTicker.values()] };
}

// ---------- prices ----------
// Map a portfolio ticker to the symbol format of the price feed ("BRK B" -> "BRK/B").
export const feedSymbol = (t) => t.toUpperCase().trim().replace(/\s+/g, "/");

export function readJson(file, fallback) {
  try {
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch {
    return fallback;
  }
}

export async function fetchPrices() {
  const url = "https://api.nasdaq.com/api/screener/stocks?tableonly=true&download=true";
  const res = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36",
      Accept: "application/json, text/plain, */*",
      "Accept-Language": "en-US,en;q=0.9",
    },
    signal: AbortSignal.timeout(60000),
  });
  if (!res.ok) throw new Error(`Price feed HTTP ${res.status}`);
  const json = await res.json();
  const list = json?.data?.rows;
  if (!Array.isArray(list) || list.length < 1000) throw new Error("Price feed returned too few rows");
  const prices = {};
  for (const r of list) {
    const p = num(r.lastsale);
    if (!r.symbol || p === null) continue;
    prices[r.symbol.trim().toUpperCase()] = {
      p,
      n: str(r.name).replace(/\s+(Common Stock|Common Shares|Class [A-C] (Common Stock|Ordinary Shares)|Ordinary Shares|American Depositary Shares).*$/i, ""),
      s: str(r.sector),
      i: str(r.industry),
      c: str(r.country),
      m: num(r.marketCap),
    };
  }
  return { updated_at: new Date().toISOString(), source: "nasdaq.com screener (delayed)", count: Object.keys(prices).length, prices };
}

// ---------- build ----------
const COUNTRY_CODES = { US: "United States", USA: "United States" };
const r2 = (v, d = 2) => (v === null || v === undefined ? null : Math.round(v * 10 ** d) / 10 ** d);

// Strict allowlist: only these keys ever leave the build.
export const HOLDING_KEYS = [
  "ticker", "name", "exchange", "country", "sector", "industry",
  "quantity", "buy_price", "price", "invested", "commission", "cost",
  "market_value", "unrealized_pnl", "unrealized_pct", "net_dividends", "div_yield_pct", "first_bought",
];

export function buildPortfolio(raw, priceData) {
  const prices = priceData?.prices || {};
  const holdings = raw.rows.map((r) => {
    const feed = prices[feedSymbol(r.ticker)];
    const price = r.market_price ?? feed?.p ?? null;
    const invested = r.invested ?? (r.quantity && r.buy_price ? r.quantity * r.buy_price : 0);
    const commission = r.commission ?? 0;
    const market_value = price !== null ? r.quantity * price : null;
    const pnl = market_value !== null ? market_value - invested : null;
    const divs = r.net_dividends ?? 0;
    const h = {
      ticker: r.ticker,
      name: r.name || feed?.n || "",
      exchange: r.exchange || "",
      country: feed?.c || COUNTRY_CODES[r.country?.toUpperCase()] || r.country || "Unknown",
      sector: feed?.s || "Unknown",
      industry: feed?.i || "",
      quantity: r2(r.quantity, 6),
      buy_price: r2(r.buy_price ?? (r.quantity ? invested / r.quantity : null), 4),
      price: r2(price, 4),
      invested: r2(invested, 4),
      commission: r2(commission, 4),
      cost: r2(invested + commission, 4),
      market_value: r2(market_value, 4),
      unrealized_pnl: r2(pnl, 4),
      unrealized_pct: pnl !== null && invested > 0 ? r2((pnl / invested) * 100, 2) : null,
      net_dividends: r2(divs, 4),
      // yield on cost: net dividends received / pure invested amount
      div_yield_pct: invested > 0 ? r2((divs / invested) * 100, 2) : null,
      first_bought: r.first_bought || null,
    };
    return Object.fromEntries(HOLDING_KEYS.map((k) => [k, h[k]]));
  });

  const sum = (arr, k) => arr.reduce((a, h) => a + (h[k] ?? 0), 0);
  const priced = holdings.filter((h) => h.price !== null);
  const investedAll = sum(holdings, "invested");
  const investedPriced = sum(priced, "invested");
  const mv = sum(priced, "market_value");
  const pnl = sum(priced, "unrealized_pnl");
  const divs = sum(holdings, "net_dividends");
  const comm = sum(holdings, "commission");
  const totals = {
    companies: holdings.length,
    priced_count: priced.length,
    invested_usd: r2(investedAll),
    commissions_usd: r2(comm),
    cost_usd: r2(investedAll + comm),
    market_value_usd: r2(mv),
    unrealized_pnl_usd: r2(pnl),
    unrealized_pct: investedPriced > 0 ? r2((pnl / investedPriced) * 100) : null,
    net_dividends_usd: r2(divs),
    // total return on priced positions: value + dividends vs money spent incl. commissions
    total_return_pct:
      investedPriced > 0
        ? r2(((mv + sum(priced, "net_dividends") - investedPriced - sum(priced, "commission")) / (investedPriced + sum(priced, "commission"))) * 100)
        : null,
    profit_count: priced.filter((h) => h.unrealized_pnl > 0.00005).length,
    loss_count: priced.filter((h) => h.unrealized_pnl < -0.00005).length,
    flat_count: priced.filter((h) => Math.abs(h.unrealized_pnl) <= 0.00005).length,
    dividend_payers: holdings.filter((h) => h.net_dividends > 0).length,
    avg_invested_per_company_usd: holdings.length ? r2(investedAll / holdings.length) : 0,
  };

  // validation: totals must equal the sum of the rows
  const check = holdings.reduce((a, h) => a + h.invested, 0);
  if (Math.abs(check - investedAll) > 0.05) throw new Error("Totals do not match rows");
  for (const h of holdings) {
    for (const k of Object.keys(h)) if (!HOLDING_KEYS.includes(k)) throw new Error("Non-allowlisted key: " + k);
  }

  return {
    updated_at: new Date().toISOString(),
    prices_updated_at: priceData?.updated_at || null,
    source_file: raw.file,
    totals,
    holdings,
  };
}

export function toCsv(holdings) {
  return Papa.unparse(holdings, { columns: HOLDING_KEYS });
}
