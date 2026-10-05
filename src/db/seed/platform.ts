import type { Db } from "@/db";
import {
  adProducts,
  badges,
  creditScoringRules,
  feeRules,
  financingProviders,
  homepageSections,
  inspectionProviders,
  logisticsProviders,
  orderStatuses,
  paymentProviders,
  plans,
  settings,
} from "@/db/schema";
import {
  AD_PRODUCTS,
  BADGES,
  CREDIT_SCORING_RULES,
  FEE_RULES,
  FINANCING_PROVIDERS,
  HOMEPAGE_SECTIONS,
  INSPECTION_PROVIDERS,
  LOGISTICS_PROVIDERS,
  ORDER_STATUSES,
  PAYMENT_PROVIDERS,
  PLANS,
  SETTINGS,
} from "./data/platform";

export async function seedPlatform(db: Db) {
  const planIds = new Map<string, string>();
  for (const p of PLANS) {
    const [row] = await db
      .insert(plans)
      .values({ ...p })
      .onConflictDoUpdate({ target: plans.code, set: { code: plans.code } })
      .returning({ id: plans.id });
    planIds.set(p.code, row.id);
  }
  const badgeIds = new Map<string, string>();
  for (const b of BADGES) {
    const [row] = await db
      .insert(badges)
      .values(b)
      .onConflictDoUpdate({ target: badges.code, set: { code: badges.code } })
      .returning({ id: badges.id });
    badgeIds.set(b.code, row.id);
  }
  for (const s of ORDER_STATUSES) {
    await db
      .insert(orderStatuses)
      .values(s)
      .onConflictDoUpdate({ target: orderStatuses.code, set: { code: orderStatuses.code } });
  }
  for (const f of FEE_RULES) {
    const values = { ...f, tiers: "tiers" in f ? [...f.tiers] : null, categorySlug: "categorySlug" in f ? f.categorySlug : null, minFee: "minFee" in f ? f.minFee : null, maxFee: "maxFee" in f ? f.maxFee : null };
    await db
      .insert(feeRules)
      .values(values)
      .onConflictDoUpdate({ target: feeRules.code, set: { code: feeRules.code } });
  }
  const paymentProviderIds = new Map<string, string>();
  for (const p of PAYMENT_PROVIDERS) {
    const [row] = await db
      .insert(paymentProviders)
      .values({ ...p, supportedMethods: [...p.supportedMethods], supportedCurrencies: [...p.supportedCurrencies], supportedCountries: [...p.supportedCountries] })
      .onConflictDoUpdate({ target: paymentProviders.code, set: { code: paymentProviders.code } })
      .returning({ id: paymentProviders.id });
    paymentProviderIds.set(p.code, row.id);
  }
  const financingProviderIds = new Map<string, string>();
  for (const p of FINANCING_PROVIDERS) {
    const [row] = await db
      .insert(financingProviders)
      .values({ ...p, products: [...p.products], countries: [...p.countries], currencies: [...p.currencies] })
      .onConflictDoUpdate({ target: financingProviders.code, set: { code: financingProviders.code } })
      .returning({ id: financingProviders.id });
    financingProviderIds.set(p.code, row.id);
  }
  const logisticsProviderIds = new Map<string, string>();
  for (const p of LOGISTICS_PROVIDERS) {
    const [row] = await db
      .insert(logisticsProviders)
      .values({ ...p, services: [...p.services], modes: [...p.modes], countries: [...p.countries] })
      .onConflictDoUpdate({ target: logisticsProviders.code, set: { code: logisticsProviders.code } })
      .returning({ id: logisticsProviders.id });
    logisticsProviderIds.set(p.code, row.id);
  }
  const inspectionProviderIds = new Map<string, string>();
  for (const p of INSPECTION_PROVIDERS) {
    const [row] = await db
      .insert(inspectionProviders)
      .values({ ...p, services: [...p.services], countries: [...p.countries] })
      .onConflictDoUpdate({ target: inspectionProviders.code, set: { code: inspectionProviders.code } })
      .returning({ id: inspectionProviders.id });
    inspectionProviderIds.set(p.code, row.id);
  }
  const adProductIds = new Map<string, string>();
  for (const [i, p] of AD_PRODUCTS.entries()) {
    const [row] = await db
      .insert(adProducts)
      .values({ ...p, sortOrder: i })
      .onConflictDoUpdate({ target: adProducts.code, set: { code: adProducts.code } })
      .returning({ id: adProducts.id });
    adProductIds.set(p.code, row.id);
  }
  for (const s of HOMEPAGE_SECTIONS) {
    await db
      .insert(homepageSections)
      .values(s)
      .onConflictDoUpdate({ target: homepageSections.key, set: { key: homepageSections.key } });
  }
  for (const s of SETTINGS) {
    await db
      .insert(settings)
      .values({ key: s.key, value: s.value, group: s.group, description: s.description, isPublic: s.isPublic ?? false })
      .onConflictDoUpdate({ target: settings.key, set: { key: settings.key } });
  }
  for (const r of CREDIT_SCORING_RULES) {
    await db
      .insert(creditScoringRules)
      .values({ code: r.code, name: r.name, feature: r.feature, weight: r.weight, config: r.config })
      .onConflictDoUpdate({ target: creditScoringRules.code, set: { code: creditScoringRules.code } });
  }
  return { planIds, badgeIds, paymentProviderIds, financingProviderIds, logisticsProviderIds, inspectionProviderIds, adProductIds };
}
