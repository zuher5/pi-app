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
