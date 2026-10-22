import { i18n } from "./i18n.svelte";

/** Server timestamps are ISO; tolerate a human-formatted fallback too. */
export function parseTime(s: string | undefined): number {
  if (!s) return NaN;
  const d = Date.parse(s);
  if (!Number.isNaN(d)) return d;
  const m = s.match(/(\d{4})-(\d{2})-(\d{2})\s+(\d{1,2}):(\d{2})\s*(AM|PM)?/i);
  if (!m) return NaN;
  let h = Number(m[4]);
  if (m[6]) h = (h % 12) + (m[6].toUpperCase() === "PM" ? 12 : 0);
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]), h, Number(m[5])).getTime();
}

export function relTime(s: string | undefined, now = Date.now()): string {
  const ms = parseTime(s);
  if (Number.isNaN(ms)) return "";
  const rtf = new Intl.RelativeTimeFormat(i18n.locale, { numeric: "auto", style: "short" });
  const sec = Math.round((ms - now) / 1000);
  const abs = Math.abs(sec);
  if (abs < 60) return rtf.format(0, "minute");
  if (abs < 3600) return rtf.format(Math.round(sec / 60), "minute");
  if (abs < 86400) return rtf.format(Math.round(sec / 3600), "hour");
  if (abs < 86400 * 7) return rtf.format(Math.round(sec / 86400), "day");
  return new Date(ms).toLocaleDateString(i18n.locale, { day: "numeric", month: "short" });
}

export function basename(p: string): string {
  const parts = p.replace(/[\\/]+$/, "").split(/[\\/]/);
  return parts[parts.length - 1] || p;
}

/** 66800 → "66.8K", 1000000 → "1M". */
export function compact(n: number): string {
  return new Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 }).format(n);
}

/** 9300 → "9.3s", 125000 → "2m 5s". */
export function duration(ms: number): string {
  if (!Number.isFinite(ms) || ms < 0) return "";
  if (ms < 60_000) return `${(ms / 1000).toFixed(ms < 10_000 ? 1 : 0)}s`;
  const m = Math.floor(ms / 60_000);
  const s = Math.round((ms % 60_000) / 1000);
  return m < 60 ? `${m}m ${s}s` : `${Math.floor(m / 60)}h ${m % 60}m`;
}
