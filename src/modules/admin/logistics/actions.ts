"use server";

import { and, eq, ne } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { companies, logisticsProviders, shipments } from "@/db/schema";
import { ActionError, formDataToObject, ok, parseInput, runAction, type ActionResult } from "@/lib/action";
import { notifyCompany } from "@/modules/notifications/service";
import { adminActor, revalidateAdmin } from "../context";
import { checkbox, idSchema, jsonText, listText, maskSecrets, optionalText, unmaskSecrets } from "../shared";
import { shipmentUpdateSchema } from "@/modules/logistics/tracking/schemas";
import { applyShipmentUpdate, assignShipmentPartner } from "@/modules/logistics/tracking/service";
import { LOGISTICS_SERVICES, SHIPMENT_MODES } from "./schemas";


const providerSchema = z.object({
  providerId: z.string().trim().optional().transform((v) => (v ? v : null)),
  code: z.string().trim().min(2, "Enter a code").max(60).transform((v) => v.toUpperCase().replace(/[^A-Z0-9_]+/g, "_")),
  name: z.string().trim().min(2, "Enter a name").max(160),
  description: optionalText(2000),
  services: z.union([z.string(), z.array(z.string())]).optional().transform((v) => (v === undefined ? [] : Array.isArray(v) ? v : [v])).pipe(z.array(z.enum(LOGISTICS_SERVICES))),
  modes: z.union([z.string(), z.array(z.string())]).optional().transform((v) => (v === undefined ? [] : Array.isArray(v) ? v : [v])).pipe(z.array(z.enum(SHIPMENT_MODES))),
  countries: listText,
  adapterCode: z.string().trim().max(60).optional().transform((v) => (v ? v : "manual")),
  apiConfig: jsonText(),
  sortOrder: z.coerce.number().int().default(0),
  isActive: checkbox,
  /** Company (slug) that works this provider's shipments in the partner portal. */
  companySlug: z.string().trim().max(160).optional().transform((v) => (v ? v : null)),
});
const toggleSchema = z.object({ providerId: idSchema, isActive: z.enum(["true", "false"]) });
const eventSchema = shipmentUpdateSchema;

export async function saveLogisticsProviderAction(_prev: ActionResult<{ id: string }> | null, formData: FormData): Promise<ActionResult<{ id: string }>> {
  return runAction(async () => {
    const { log } = await adminActor("admin.logistics.write");
    const parsed = parseInput(providerSchema, formDataToObject(formData));
    if (!parsed.success) return parsed.result;
    const d = parsed.data;
    const [dup] = await db
      .select({ id: logisticsProviders.id })
      .from(logisticsProviders)
      .where(d.providerId ? and(eq(logisticsProviders.code, d.code), ne(logisticsProviders.id, d.providerId)) : eq(logisticsProviders.code, d.code))
      .limit(1);
    if (dup) throw new ActionError("A provider with this code already exists.", "VALIDATION", { code: ["Code already in use"] });
    const previous = d.providerId ? (await db.select().from(logisticsProviders).where(eq(logisticsProviders.id, d.providerId)).limit(1))[0] : null;
    if (d.providerId && !previous) throw new ActionError("Provider not found.", "NOT_FOUND");
    let companyId: string | null = previous?.companyId ?? null;
    if (d.companySlug !== null || previous?.companyId) {
      if (!d.companySlug) companyId = null;
      else {
        const [c] = await db.select({ id: companies.id }).from(companies).where(eq(companies.slug, d.companySlug)).limit(1);
        if (!c) throw new ActionError("No company with this slug.", "VALIDATION", { companySlug: ["No company with this slug"] });
        const [taken] = await db.select({ id: logisticsProviders.id }).from(logisticsProviders).where(and(eq(logisticsProviders.companyId, c.id), previous ? ne(logisticsProviders.id, previous.id) : undefined)).limit(1);
        if (taken) throw new ActionError("This company already runs another provider.", "VALIDATION", { companySlug: ["Company already linked to another provider"] });
        companyId = c.id;
      }
    }
    const values = {
      companyId,
      code: d.code,
      name: d.name,
      description: d.description,
      services: d.services,
      modes: d.modes,
      countries: d.countries,
      adapterCode: d.adapterCode,
      apiConfig: (d.apiConfig ? unmaskSecrets(d.apiConfig, previous?.apiConfig ?? null) : null) as Record<string, unknown> | null,
      sortOrder: d.sortOrder,
      isActive: d.isActive,
    };
    const [row] = previous ? await db.update(logisticsProviders).set(values).where(eq(logisticsProviders.id, previous.id)).returning() : await db.insert(logisticsProviders).values(values).returning();
    if (companyId) await db.update(companies).set({ isLogisticsPartner: true }).where(eq(companies.id, companyId));
    await log({ action: previous ? "admin.logistics.provider.update" : "admin.logistics.provider.create", entityType: "logistics_provider", entityId: row.id, before: previous ? { name: previous.name, isActive: previous.isActive, apiConfig: maskSecrets(previous.apiConfig) } : null, after: { code: row.code, name: row.name, isActive: row.isActive, apiConfig: maskSecrets(row.apiConfig) } });
    revalidateAdmin("/admin/logistics", "/admin/providers");
    return ok({ id: row.id }, previous ? "Provider updated." : "Provider created.");
  });
}

export async function toggleLogisticsProviderAction(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  return runAction(async () => {
    const { log } = await adminActor("admin.logistics.write");
    const parsed = parseInput(toggleSchema, formDataToObject(formData));
    if (!parsed.success) return parsed.result;
    const active = parsed.data.isActive === "true";
    const [row] = await db.update(logisticsProviders).set({ isActive: active }).where(eq(logisticsProviders.id, parsed.data.providerId)).returning({ id: logisticsProviders.id, code: logisticsProviders.code, companyId: logisticsProviders.companyId });
    if (!row) throw new ActionError("Provider not found.", "NOT_FOUND");
    if (row.companyId) {
      if (active) await db.update(companies).set({ status: "ACTIVE" }).where(eq(companies.id, row.companyId));
      await notifyCompany(row.companyId, {
        type: "SYSTEM",
        title: active ? "Your logistics partner account is approved" : "Your logistics partner account was paused",
        body: active ? "Suppliers can now assign shipments to you. Open the partner portal to manage pickups and deliveries." : "Contact CANG support for details.",
        link: "/partner",
        email: true,
      });
    }
    await log({ action: "admin.logistics.provider.toggle", entityType: "logistics_provider", entityId: row.id, after: { code: row.code, isActive: active } });
    revalidateAdmin("/admin/logistics", "/admin/providers");
    return ok(undefined, active ? "Provider activated." : "Provider deactivated.");
  });
}

export async function addShipmentEventAction(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  return runAction(async () => {
    const { user } = await adminActor("admin.logistics.write");
    const parsed = parseInput(eventSchema, formDataToObject(formData));
    if (!parsed.success) return parsed.result;
    const [s] = await db.select({ id: shipments.id, orderId: shipments.orderId }).from(shipments).where(eq(shipments.id, parsed.data.shipmentId)).limit(1);
    if (!s) throw new ActionError("Shipment not found.", "NOT_FOUND");
    await applyShipmentUpdate({ kind: "ADMIN", userId: user.id }, parsed.data);
    revalidateAdmin("/admin/logistics", `/admin/orders/${s.orderId}`);
    return ok(undefined, "Shipment event added.");
  });
}

const assignSchema = z.object({ shipmentId: idSchema, providerId: z.string().trim().optional().transform((v) => (v ? v : null)) });

/** Hand a shipment to (or take it away from) a logistics partner. */
export async function assignShipmentPartnerAction(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  return runAction(async () => {
    const { user } = await adminActor("admin.logistics.write");
    const parsed = parseInput(assignSchema, formDataToObject(formData));
    if (!parsed.success) return parsed.result;
    const row = await assignShipmentPartner({ shipmentId: parsed.data.shipmentId, providerId: parsed.data.providerId, actor: { kind: "ADMIN", userId: user.id } });
    revalidateAdmin("/admin/logistics", `/admin/orders/${row.orderId}`);
    return ok(undefined, parsed.data.providerId ? "Logistics partner assigned — they have been notified." : "Logistics partner removed.");
  });
}
