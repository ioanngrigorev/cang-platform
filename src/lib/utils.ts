import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** URL-safe slug; handles Vietnamese diacritics. */
export function slugify(input: string): string {
  return input
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 96);
}

const currencyFormatters = new Map<string, Intl.NumberFormat>();

export function formatMoney(
  amount: number | string | null | undefined,
  currency = "USD",
  locale = "en",
  opts: { compact?: boolean; maxFractionDigits?: number } = {},
): string {
  if (amount === null || amount === undefined || amount === "") return "—";
  const value = typeof amount === "string" ? Number(amount) : amount;
  if (Number.isNaN(value)) return "—";
  const intlLocale = locale === "vi" ? "vi-VN" : "en-US";
  const isVnd = currency === "VND";
  const key = `${intlLocale}:${currency}:${opts.compact ? 1 : 0}:${opts.maxFractionDigits ?? ""}`;
  let fmt = currencyFormatters.get(key);
  if (!fmt) {
    fmt = new Intl.NumberFormat(intlLocale, {
      style: "currency",
      currency,
      currencyDisplay: isVnd ? "code" : "symbol",
      minimumFractionDigits: isVnd ? 0 : 0,
      maximumFractionDigits: opts.maxFractionDigits ?? (isVnd ? 0 : 2),
      notation: opts.compact ? "compact" : "standard",
    });
    currencyFormatters.set(key, fmt);
  }
  return fmt.format(value).replace("VND", "₫").trim();
}

export function formatNumber(value: number | string | null | undefined, locale = "en"): string {
  if (value === null || value === undefined) return "—";
  const n = typeof value === "string" ? Number(value) : value;
  if (Number.isNaN(n)) return "—";
  return new Intl.NumberFormat(locale === "vi" ? "vi-VN" : "en-US").format(n);
}

export function formatCompact(value: number, locale = "en"): string {
  return new Intl.NumberFormat(locale === "vi" ? "vi-VN" : "en-US", { notation: "compact", maximumFractionDigits: 1 }).format(value);
}

export function formatDate(
  value: Date | string | null | undefined,
  locale = "en",
  opts: Intl.DateTimeFormatOptions = { year: "numeric", month: "short", day: "numeric" },
): string {
  if (!value) return "—";
  const d = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(d.getTime())) return "—";
  return new Intl.DateTimeFormat(locale === "vi" ? "vi-VN" : "en-US", opts).format(d);
}

export function formatDateTime(value: Date | string | null | undefined, locale = "en"): string {
  return formatDate(value, locale, { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

export function timeAgo(value: Date | string, locale = "en"): string {
  const d = typeof value === "string" ? new Date(value) : value;
  const diff = (Date.now() - d.getTime()) / 1000;
  const rtf = new Intl.RelativeTimeFormat(locale === "vi" ? "vi" : "en", { numeric: "auto" });
  const units: [Intl.RelativeTimeFormatUnit, number][] = [
    ["year", 31536000],
    ["month", 2592000],
    ["week", 604800],
    ["day", 86400],
    ["hour", 3600],
    ["minute", 60],
  ];
  for (const [unit, secs] of units) {
    if (Math.abs(diff) >= secs) return rtf.format(-Math.round(diff / secs), unit);
  }
  return rtf.format(0, "second");
}

export function truncate(text: string | null | undefined, max = 140): string {
  if (!text) return "";
  return text.length > max ? `${text.slice(0, max - 1).trimEnd()}…` : text;
}

export function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");
}

/** Pick localized field: `nameVi` for vi if present, else `name`. */
export function localized<T extends Record<string, unknown>>(obj: T, field: string, locale: string): string {
  const viKey = `${field}Vi`;
  if (locale === "vi") {
    const vi = obj[viKey];
    if (typeof vi === "string" && vi.trim()) return vi;
  }
  const base = obj[field];
  return typeof base === "string" ? base : "";
}

export function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

export function toNumber(v: unknown, fallback = 0): number {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : fallback;
}

export function employeeRangeLabel(range: string | null | undefined): string {
  const map: Record<string, string> = {
    R_1_10: "1–10",
    R_11_50: "11–50",
    R_51_200: "51–200",
    R_201_500: "201–500",
    R_501_1000: "501–1,000",
    R_1001_5000: "1,001–5,000",
    R_5000_PLUS: "5,000+",
  };
  return range ? (map[range] ?? range) : "—";
}

export function humanize(code: string | null | undefined): string {
  if (!code) return "";
  return code
    .toLowerCase()
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

export function absoluteUrl(path: string): string {
  const base = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  return `${base.replace(/\/$/, "")}${path.startsWith("/") ? path : `/${path}`}`;
}
