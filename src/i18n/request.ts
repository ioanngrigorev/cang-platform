import { getRequestConfig } from "next-intl/server";
import { hasLocale } from "next-intl";
import { routing, type Locale } from "./routing";

/**
 * Messages are split by namespace so that feature modules own their own files.
 * Add a new namespace here and create matching files in src/messages/<locale>/.
 */
const namespaces = [
  "common",
  "nav",
  "home",
  "auth",
  "marketplace",
  "rfq",
  "dashboard",
  "buyer",
  "seller",
  "sales",
  "admin",
  "messaging",
  "orders",
  "payments",
  "logistics",
  "tracking",
  "partner",
  "financing",
  "content",
  "errors",
] as const;

async function loadMessages(locale: Locale) {
  const entries = await Promise.all(
    namespaces.map(async (ns) => {
      try {
        const mod = await import(`../messages/${locale}/${ns}.json`);
        return [ns, mod.default] as const;
      } catch {
        return [ns, {}] as const;
      }
    }),
  );
  return Object.fromEntries(entries);
}

export default getRequestConfig(async ({ requestLocale }) => {
  const requested = await requestLocale;
  const locale: Locale = hasLocale(routing.locales, requested) ? requested : routing.defaultLocale;
  const messages = await loadMessages(locale);
  // Fallback to English for missing keys in other locales.
  const fallback = locale === "en" ? {} : await loadMessages("en");
  return {
    locale,
    messages: deepMerge(fallback, messages),
    timeZone: "Asia/Ho_Chi_Minh",
    now: new Date(),
  };
});

function deepMerge(base: Record<string, unknown>, override: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = { ...base };
  for (const [k, v] of Object.entries(override)) {
    if (v && typeof v === "object" && !Array.isArray(v) && typeof out[k] === "object" && out[k] !== null) {
      out[k] = deepMerge(out[k] as Record<string, unknown>, v as Record<string, unknown>);
    } else {
      out[k] = v;
    }
  }
  return out;
}
