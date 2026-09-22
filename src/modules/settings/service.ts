import { eq } from "drizzle-orm";
import { db } from "@/db";
import { settings } from "@/db/schema";

/**
 * Platform settings live in the `settings` table (admin-editable) with a short in-process cache.
 * Defaults below are used when a key has never been set.
 */
export const SETTING_DEFAULTS = {
  "site.name": "CANG",
  "site.tagline": "Source directly from verified Vietnamese manufacturers",
  "site.defaultCurrency": "USD",
  "site.supportEmail": "support@cang.vn",
  "seo.defaultTitleSuffix": " | CANG – Vietnam B2B Marketplace",
  "rfq.defaultValidityDays": 14,
  "rfq.maxOpenPerCompany": 50,
  "rfq.autoMatchLimit": 30,
  "quotation.defaultValidityDays": 14,
  "orders.defaultDepositPercent": 30,
  "tradeAssurance.enabled": true,
  "tradeAssurance.inspectionWindowDays": 7,
  "reviews.requireVerifiedPurchase": true,
  "reviews.autoPublishThreshold": 30, // fraudScore below → auto publish
  "search.provider": "postgres",
  "products.requireModeration": false,
  "uploads.maxSizeMb": 10,
  "compliance.sanctionsScreeningEnabled": true,
  "compliance.kybRequiredForOrders": false,
} as const;

export type SettingKey = keyof typeof SETTING_DEFAULTS;

const cache = new Map<string, { value: unknown; at: number }>();
const TTL = 30_000;

export async function getSetting<K extends SettingKey>(key: K): Promise<(typeof SETTING_DEFAULTS)[K]> {
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < TTL) return hit.value as (typeof SETTING_DEFAULTS)[K];
  const [row] = await db.select().from(settings).where(eq(settings.key, key)).limit(1);
  const value = row ? (row.value as (typeof SETTING_DEFAULTS)[K]) : SETTING_DEFAULTS[key];
  cache.set(key, { value, at: Date.now() });
  return value;
}

export async function setSetting(key: string, value: unknown, meta: { group?: string; description?: string; isPublic?: boolean } = {}) {
  await db
    .insert(settings)
    .values({ key, value, group: meta.group ?? key.split(".")[0], description: meta.description, isPublic: meta.isPublic ?? false })
    .onConflictDoUpdate({ target: settings.key, set: { value, ...(meta.description ? { description: meta.description } : {}) } });
  cache.delete(key);
}

export async function getAllSettings() {
  const rows = await db.select().from(settings).orderBy(settings.group, settings.key);
  const map = new Map(rows.map((r) => [r.key, r]));
  return (Object.keys(SETTING_DEFAULTS) as SettingKey[]).map((key) => ({
    key,
    group: key.split(".")[0],
    value: map.get(key)?.value ?? SETTING_DEFAULTS[key],
    default: SETTING_DEFAULTS[key],
    description: map.get(key)?.description ?? null,
    isOverridden: map.has(key),
  }));
}
