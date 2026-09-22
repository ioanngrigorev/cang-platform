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
      .onConflictDoUpdate({ target: plans.code, set: { name: p.name, nameVi: p.nameVi, description: p.description, priceMonthly: p.priceMonthly, priceYearly: p.priceYearly, features: p.features, limits: p.limits, sortOrder: p.sortOrder, isPublic: p.isPublic } })
      .returning({ id: plans.id });
    planIds.set(p.code, row.id);
  }
  const badgeIds = new Map<string, string>();
  for (const b of BADGES) {
    const [row] = await db
      .insert(badges)
      .values(b)
      .onConflictDoUpdate({ target: badges.code, set: { name: b.name, nameVi: b.nameVi, description: b.description, icon: b.icon, color: b.color, ruleConfig: b.ruleConfig, isAutomatic: b.isAutomatic, sortOrder: b.sortOrder } })
      .returning({ id: badges.id });
    badgeIds.set(b.code, row.id);
  }
  for (const s of ORDER_STATUSES) {
    await db
      .insert(orderStatuses)
      .values(s)
      .onConflictDoUpdate({ target: orderStatuses.code, set: { name: s.name, nameVi: s.nameVi, sortOrder: s.sortOrder, color: s.color, allowedTransitions: s.allowedTransitions, isTerminal: s.isTerminal ?? false, isCancellable: s.isCancellable ?? true } });
  }
  for (const f of FEE_RULES) {
    const values = { ...f, tiers: "tiers" in f ? [...f.tiers] : null, categorySlug: "categorySlug" in f ? f.categorySlug : null, minFee: "minFee" in f ? f.minFee : null, maxFee: "maxFee" in f ? f.maxFee : null };
    await db
      .insert(feeRules)
      .values(values)
      .onConflictDoUpdate({ target: feeRules.code, set: { name: f.name, type: f.type, calc: f.calc, value: f.value, tiers: values.tiers, categorySlug: values.categorySlug, minFee: values.minFee, maxFee: values.maxFee, paidBy: f.paidBy, priority: f.priority, description: f.description } });
  }
  const paymentProviderIds = new Map<string, string>();
  for (const p of PAYMENT_PROVIDERS) {
    const [row] = await db
      .insert(paymentProviders)
      .values({ ...p, supportedMethods: [...p.supportedMethods], supportedCurrencies: [...p.supportedCurrencies], supportedCountries: [...p.supportedCountries] })
      .onConflictDoUpdate({ target: paymentProviders.code, set: { name: p.name, type: p.type, description: p.description, supportsEscrow: p.supportsEscrow, isActive: p.isActive, isDefault: p.isDefault, licenseInfo: p.licenseInfo, feeConfig: p.feeConfig } })
      .returning({ id: paymentProviders.id });
    paymentProviderIds.set(p.code, row.id);
  }
  const financingProviderIds = new Map<string, string>();
  for (const p of FINANCING_PROVIDERS) {
    const [row] = await db
      .insert(financingProviders)
      .values({ ...p, products: [...p.products], countries: [...p.countries], currencies: [...p.currencies] })
      .onConflictDoUpdate({ target: financingProviders.code, set: { name: p.name, type: p.type, description: p.description, indicativeRate: p.indicativeRate, minAmount: p.minAmount, maxAmount: p.maxAmount } })
      .returning({ id: financingProviders.id });
    financingProviderIds.set(p.code, row.id);
  }
  const logisticsProviderIds = new Map<string, string>();
  for (const p of LOGISTICS_PROVIDERS) {
    const [row] = await db
      .insert(logisticsProviders)
      .values({ ...p, services: [...p.services], modes: [...p.modes], countries: [...p.countries] })
      .onConflictDoUpdate({ target: logisticsProviders.code, set: { name: p.name, description: p.description } })
      .returning({ id: logisticsProviders.id });
    logisticsProviderIds.set(p.code, row.id);
  }
  const inspectionProviderIds = new Map<string, string>();
  for (const p of INSPECTION_PROVIDERS) {
    const [row] = await db
      .insert(inspectionProviders)
      .values({ ...p, services: [...p.services], countries: [...p.countries] })
      .onConflictDoUpdate({ target: inspectionProviders.code, set: { name: p.name, description: p.description } })
      .returning({ id: inspectionProviders.id });
    inspectionProviderIds.set(p.code, row.id);
  }
  const adProductIds = new Map<string, string>();
  for (const [i, p] of AD_PRODUCTS.entries()) {
    const [row] = await db
      .insert(adProducts)
      .values({ ...p, sortOrder: i })
      .onConflictDoUpdate({ target: adProducts.code, set: { name: p.name, nameVi: p.nameVi, description: p.description, price: p.price, pricingModel: p.pricingModel, minBudget: p.minBudget, maxSlots: p.maxSlots, sortOrder: i } })
      .returning({ id: adProducts.id });
    adProductIds.set(p.code, row.id);
  }
  for (const s of HOMEPAGE_SECTIONS) {
    await db
      .insert(homepageSections)
      .values(s)
      .onConflictDoUpdate({ target: homepageSections.key, set: { title: s.title, titleVi: s.titleVi, subtitle: s.subtitle ?? null, subtitleVi: s.subtitleVi ?? null, sortOrder: s.sortOrder, config: s.config } });
  }
  for (const s of SETTINGS) {
    await db
      .insert(settings)
      .values({ key: s.key, value: s.value, group: s.group, description: s.description, isPublic: s.isPublic ?? false })
      .onConflictDoUpdate({ target: settings.key, set: { description: s.description, group: s.group, isPublic: s.isPublic ?? false } });
  }
  for (const r of CREDIT_SCORING_RULES) {
    await db
      .insert(creditScoringRules)
      .values({ code: r.code, name: r.name, feature: r.feature, weight: r.weight, config: r.config })
      .onConflictDoUpdate({ target: creditScoringRules.code, set: { name: r.name, feature: r.feature, weight: r.weight, config: r.config } });
  }
  return { planIds, badgeIds, paymentProviderIds, financingProviderIds, logisticsProviderIds, inspectionProviderIds, adProductIds };
}
