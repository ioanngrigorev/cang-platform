"use server";

import { and, eq, ne } from "drizzle-orm";
import { db } from "@/db";
import { financingProviders, inspectionProviders, logisticsProviders, paymentProviders } from "@/db/schema";
import { ActionError, formDataToObject, ok, parseInput, runAction, type ActionResult } from "@/lib/action";
import { adminActor, revalidateAdmin } from "../context";
import { maskSecrets, unmaskSecrets } from "../shared";
import { financingProviderSchema, inspectionProviderSchema, paymentProviderSchema, providerToggleSchema } from "./schemas";

/** No dedicated providers permission exists in rbac.ts: each provider family reuses its domain permission. */
const PERMISSIONS = { payment: "admin.payments.write", logistics: "admin.logistics.write", financing: "admin.financing.write", inspection: "admin.logistics.write" } as const;

function revalidate() {
  revalidateAdmin("/admin/providers", "/admin/logistics", "/admin/financing");
}

export async function savePaymentProviderAction(_prev: ActionResult<{ id: string }> | null, formData: FormData): Promise<ActionResult<{ id: string }>> {
  return runAction(async () => {
    const { log } = await adminActor(PERMISSIONS.payment);
    const parsed = parseInput(paymentProviderSchema, formDataToObject(formData));
    if (!parsed.success) return parsed.result;
    const d = parsed.data;
    const [dup] = await db.select({ id: paymentProviders.id }).from(paymentProviders).where(d.providerId ? and(eq(paymentProviders.code, d.code), ne(paymentProviders.id, d.providerId)) : eq(paymentProviders.code, d.code)).limit(1);
    if (dup) throw new ActionError("A provider with this code already exists.", "VALIDATION", { code: ["Code already in use"] });
    const previous = d.providerId ? (await db.select().from(paymentProviders).where(eq(paymentProviders.id, d.providerId)).limit(1))[0] : null;
    if (d.providerId && !previous) throw new ActionError("Provider not found.", "NOT_FOUND");
    const values = {
      code: d.code,
      name: d.name,
      type: d.type,
      description: d.description,
      adapterCode: d.adapterCode,
      supportedMethods: d.supportedMethods,
      supportedCurrencies: d.supportedCurrencies.map((c) => c.toUpperCase()),
      supportedCountries: d.supportedCountries.map((c) => c.toUpperCase()),
      supportsEscrow: d.supportsEscrow,
      licenseInfo: d.licenseInfo,
      publicConfig: (d.publicConfig ? unmaskSecrets(d.publicConfig, previous?.publicConfig ?? null) : null) as Record<string, unknown> | null,
      feeConfig: d.feePercent != null || d.feeFixed != null ? { percent: d.feePercent ?? 0, fixed: d.feeFixed ?? 0, currency: d.feeCurrency?.toUpperCase() ?? d.supportedCurrencies[0]?.toUpperCase() ?? "USD" } : (previous?.feeConfig ?? null),
      isActive: d.isActive,
      isDefault: d.isDefault,
      sortOrder: d.sortOrder,
    };
    const row = await db.transaction(async (tx) => {
      if (d.isDefault) await tx.update(paymentProviders).set({ isDefault: false }).where(previous ? ne(paymentProviders.id, previous.id) : eq(paymentProviders.isDefault, true));
      const [r] = previous ? await tx.update(paymentProviders).set(values).where(eq(paymentProviders.id, previous.id)).returning() : await tx.insert(paymentProviders).values(values).returning();
      return r;
    });
    await log({ action: previous ? "admin.provider.payment.update" : "admin.provider.payment.create", entityType: "payment_provider", entityId: row.id, before: previous ? { name: previous.name, isActive: previous.isActive, publicConfig: maskSecrets(previous.publicConfig) } : null, after: { code: row.code, name: row.name, isActive: row.isActive, isDefault: row.isDefault, publicConfig: maskSecrets(row.publicConfig) } });
    revalidate();
    return ok({ id: row.id }, previous ? "Payment provider updated." : "Payment provider created.");
  });
}

export async function saveFinancingProviderAction(_prev: ActionResult<{ id: string }> | null, formData: FormData): Promise<ActionResult<{ id: string }>> {
  return runAction(async () => {
    const { log } = await adminActor(PERMISSIONS.financing);
    const parsed = parseInput(financingProviderSchema, formDataToObject(formData));
    if (!parsed.success) return parsed.result;
    const d = parsed.data;
    const [dup] = await db.select({ id: financingProviders.id }).from(financingProviders).where(d.providerId ? and(eq(financingProviders.code, d.code), ne(financingProviders.id, d.providerId)) : eq(financingProviders.code, d.code)).limit(1);
    if (dup) throw new ActionError("A provider with this code already exists.", "VALIDATION", { code: ["Code already in use"] });
    const previous = d.providerId ? (await db.select().from(financingProviders).where(eq(financingProviders.id, d.providerId)).limit(1))[0] : null;
    if (d.providerId && !previous) throw new ActionError("Provider not found.", "NOT_FOUND");
    const values = {
      code: d.code,
      name: d.name,
      type: d.type,
      description: d.description,
      licenseNumber: d.licenseNumber,
      regulator: d.regulator,
      products: d.products,
      countries: d.countries.map((c) => c.toUpperCase()),
      currencies: d.currencies.map((c) => c.toUpperCase()),
      minAmount: d.minAmount,
      maxAmount: d.maxAmount,
      minTenorDays: d.minTenorDays == null ? null : Math.round(d.minTenorDays),
      maxTenorDays: d.maxTenorDays == null ? null : Math.round(d.maxTenorDays),
      indicativeRate: d.indicativeRate,
      adapterCode: d.adapterCode,
      apiConfig: (d.apiConfig ? unmaskSecrets(d.apiConfig, previous?.apiConfig ?? null) : null) as Record<string, unknown> | null,
      routingRules: (d.routingRules ?? null) as Record<string, unknown> | null,
      isActive: d.isActive,
      sortOrder: d.sortOrder,
    };
    const [row] = previous ? await db.update(financingProviders).set(values).where(eq(financingProviders.id, previous.id)).returning() : await db.insert(financingProviders).values(values).returning();
    await log({ action: previous ? "admin.provider.financing.update" : "admin.provider.financing.create", entityType: "financing_provider", entityId: row.id, before: previous ? { name: previous.name, isActive: previous.isActive } : null, after: { code: row.code, name: row.name, isActive: row.isActive, products: row.products } });
    revalidate();
    return ok({ id: row.id }, previous ? "Financing provider updated." : "Financing provider created.");
  });
}

export async function saveInspectionProviderAction(_prev: ActionResult<{ id: string }> | null, formData: FormData): Promise<ActionResult<{ id: string }>> {
  return runAction(async () => {
    const { log } = await adminActor(PERMISSIONS.inspection);
    const parsed = parseInput(inspectionProviderSchema, formDataToObject(formData));
    if (!parsed.success) return parsed.result;
    const d = parsed.data;
    const [dup] = await db.select({ id: inspectionProviders.id }).from(inspectionProviders).where(d.providerId ? and(eq(inspectionProviders.code, d.code), ne(inspectionProviders.id, d.providerId)) : eq(inspectionProviders.code, d.code)).limit(1);
    if (dup) throw new ActionError("A provider with this code already exists.", "VALIDATION", { code: ["Code already in use"] });
    const previous = d.providerId ? (await db.select().from(inspectionProviders).where(eq(inspectionProviders.id, d.providerId)).limit(1))[0] : null;
    if (d.providerId && !previous) throw new ActionError("Provider not found.", "NOT_FOUND");
    const values = {
      code: d.code,
      name: d.name,
      description: d.description,
      services: d.services,
      countries: d.countries.map((c) => c.toUpperCase()),
      adapterCode: d.adapterCode,
      apiConfig: (d.apiConfig ? unmaskSecrets(d.apiConfig, previous?.apiConfig ?? null) : null) as Record<string, unknown> | null,
      isActive: d.isActive,
      sortOrder: d.sortOrder,
    };
    const [row] = previous ? await db.update(inspectionProviders).set(values).where(eq(inspectionProviders.id, previous.id)).returning() : await db.insert(inspectionProviders).values(values).returning();
    await log({ action: previous ? "admin.provider.inspection.update" : "admin.provider.inspection.create", entityType: "inspection_provider", entityId: row.id, before: previous ? { name: previous.name, isActive: previous.isActive } : null, after: { code: row.code, name: row.name, isActive: row.isActive } });
    revalidate();
    return ok({ id: row.id }, previous ? "Inspection provider updated." : "Inspection provider created.");
  });
}

export async function toggleProviderAction(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  return runAction(async () => {
    const parsed = parseInput(providerToggleSchema, formDataToObject(formData));
    if (!parsed.success) return parsed.result;
    const { log } = await adminActor(PERMISSIONS[parsed.data.kind]);
    const active = parsed.data.isActive === "true";
    const table = { payment: paymentProviders, logistics: logisticsProviders, financing: financingProviders, inspection: inspectionProviders }[parsed.data.kind];
    const [row] = await db.update(table).set({ isActive: active }).where(eq(table.id, parsed.data.providerId)).returning({ id: table.id, code: table.code });
    if (!row) throw new ActionError("Provider not found.", "NOT_FOUND");
    await log({ action: `admin.provider.${parsed.data.kind}.toggle`, entityType: `${parsed.data.kind}_provider`, entityId: row.id, after: { code: row.code, isActive: active } });
    revalidate();
    return ok(undefined, active ? "Provider activated." : "Provider deactivated.");
  });
}
