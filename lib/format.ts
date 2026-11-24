export const fmtInt = (n: number | null | undefined) => (n == null ? "—" : Math.round(n).toLocaleString("en-US"));

/** Money with 2–4 decimals: positions can be worth cents. */
export function fmtUsd(n: number | null | undefined, opts: { sign?: boolean; compact?: boolean } = {}) {
  if (n == null) return "—";
  const abs = Math.abs(n);
  const digits = opts.compact ? 2 : abs !== 0 && abs < 1 ? 4 : 2;
  const s = abs.toLocaleString("en-US", { minimumFractionDigits: digits === 4 ? 2 : 2, maximumFractionDigits: digits });
  const sign = n < 0 ? "−" : opts.sign && n > 0 ? "+" : "";
  return `${sign}$${s}`;
}

export function fmtPct(n: number | null | undefined, opts: { sign?: boolean; digits?: number } = {}) {
  if (n == null) return "—";
  const d = opts.digits ?? 2;
  const sign = n < 0 ? "−" : opts.sign && n > 0 ? "+" : "";
  return `${sign}${Math.abs(n).toFixed(d)}%`;
}

export function fmtQty(n: number | null | undefined) {
  if (n == null) return "—";
  if (Number.isInteger(n)) return n.toLocaleString("en-US");
  return n.toLocaleString("en-US", { minimumFractionDigits: 4, maximumFractionDigits: 4 });
}

export function fmtPrice(n: number | null | undefined) {
  if (n == null) return "—";
  return "$" + n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: n < 1 ? 4 : 2 });
}

export const fmtDate = (iso: string | null | undefined) =>
  iso ? new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }) : "—";

export const pnlClass = (n: number | null | undefined) => (n == null || Math.abs(n) < 0.00005 ? "text-ink-2" : n > 0 ? "text-up-text" : "text-down-text");
