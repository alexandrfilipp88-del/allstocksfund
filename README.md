# All Stocks Fund · Own Everything. Predict Nothing.

Public, transparent dashboard of the All Stocks Fund portfolio: thousands of tiny fractional positions, one per company.

Built with Next.js (App Router) + Tailwind and deployed on Vercel from `main`. Every page is static. The site never connects to the broker; it only reads files committed to this repo.

## Updating the portfolio (manual, for now)

1. Export the portfolio as **.xlsx, .csv or .json**.
2. On GitHub, open the **`portfolio/`** folder → **Add file → Upload files**, drop the file, and **Commit**.
   The file can have any name; the newest one is used, and the daily job removes older ones.
3. That's it. Vercel rebuilds the site in about a minute, and the **Update prices** action refreshes prices and history.

### Accepted columns

Headers are matched case-insensitively. Only **Ticker** is required.

| Column | Also accepted as | Meaning |
|---|---|---|
| Ticker | Symbol | e.g. `AAPL`, `BRK B` |
| Exchange | | NASDAQ, NYSE… |
| Country | | fallback if HQ country is unknown |
| Status | | rows with `sold`/`closed` are skipped |
| Price | Buy price, Avg price | average **buy** price per share |
| Quantity | Qty, Position | shares (fractional OK) |
| Invested | Cost basis | pure amount invested (no fees) |
| Comission | Commission, Fees | commissions paid |
| Div Net | Net dividends, Dividends | dividends received after tax |
| Market price | Current price, Last | optional: overrides the fetched price |
| First bought | Date, Buy date | optional |

Computed by the site: **current price** (delayed quote from nasdaq.com, refreshed daily), **market value**, **unrealized P/L $ and %**, and **dividend yield on cost** (net dividends ÷ invested).

A JSON upload can be an array of rows, or `{ "holdings": [...] }`, using the same column names as keys.

## How the data flows

```
portfolio/<file>.xlsx|csv|json ─┐
data/prices.json (daily action) ├─► scripts/build-data.mjs ─► public/data/portfolio.json, holdings.csv, history.json ─► static pages
data/history.json (daily action)┘
```

- `npm run prices` fetches prices and appends today's snapshot to `data/history.json`. Past entries are never rewritten.
- `npm run data` rebuilds the public JSON/CSV. It runs automatically before `dev` and `build`.
- Only an allowlist of per-stock fields is published (see `HOLDING_KEYS` in `scripts/lib.mjs`). There are no account numbers, cash, margin or personal data.

## Local development

```bash
npm install
npm run dev        # http://localhost:3000
```

## Public data

- `/data/portfolio.json`: totals and every holding
- `/data/holdings.csv`: the same holdings as CSV
- `/data/history.json`: daily snapshots and milestones

---

Personal portfolio experiment. Not a fund, not investment advice, no outside money accepted.
