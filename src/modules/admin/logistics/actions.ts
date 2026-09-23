"use server";

import { and, eq, ne } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { logisticsProviders, orderEvents, orders, shipmentEvents, shipments } from "@/db/schema";
import { ActionError, formDataToObject, ok, parseInput, runAction, type ActionResult } from "@/lib/action";
import { notifyCompany } from "@/modules/notifications/service";
import { adminActor, revalidateAdmin } from "../context";
import { checkbox, idSchema, jsonText, listText, maskSecrets, optionalDate, optionalText, unmaskSecrets } from "../shared";
import { LOGISTICS_SERVICES, SHIPMENT_MODES, SHIPMENT_STATUSES } from "./schemas";


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
});
const toggleSchema = z.object({ providerId: idSchema, isActive: z.enum(["true", "false"]) });
const eventSchema = z.object({
  shipmentId: idSchema,
  milestone: z.string().trim().min(2, "Pick a milestone").max(60),
  status: z.enum(SHIPMENT_STATUSES),
  location: optionalText(200),
  description: optionalText(1000),
  occurredAt: optionalDate,
});

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
    const values = {
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
    const [row] = await db.update(logisticsProviders).set({ isActive: active }).where(eq(logisticsProviders.id, parsed.data.providerId)).returning({ id: logisticsProviders.id, code: logisticsProviders.code });
    if (!row) throw new ActionError("Provider not found.", "NOT_FOUND");
    await log({ action: "admin.logistics.provider.toggle", entityType: "logistics_provider", entityId: row.id, after: { code: row.code, isActive: active } });
    revalidateAdmin("/admin/logistics", "/admin/providers");
    return ok(undefined, active ? "Provider activated." : "Provider deactivated.");
  });
}

export async function addShipmentEventAction(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  return runAction(async () => {
    const { user, log } = await adminActor("admin.logistics.write");
    const parsed = parseInput(eventSchema, formDataToObject(formData));
    if (!parsed.success) return parsed.result;
    const [s] = await db.select().from(shipments).where(eq(shipments.id, parsed.data.shipmentId)).limit(1);
    if (!s) throw new ActionError("Shipment not found.", "NOT_FOUND");
    const occurredAt = parsed.data.occurredAt ?? new Date();
    const stamps: Partial<typeof shipments.$inferInsert> = { status: parsed.data.status };
    if (parsed.data.status === "DEPARTED") stamps.actualDeparture = occurredAt;
    if (parsed.data.status === "AT_DESTINATION_PORT") stamps.actualArrival = occurredAt;
    if (parsed.data.status === "DELIVERED") stamps.deliveredAt = occurredAt;
    await db.transaction(async (tx) => {
      await tx.insert(shipmentEvents).values({ shipmentId: s.id, milestone: parsed.data.milestone, status: parsed.data.status, location: parsed.data.location, description: parsed.data.description, source: "manual", occurredAt });
      await tx.update(shipments).set(stamps).where(eq(shipments.id, s.id));
      await tx.insert(orderEvents).values({ orderId: s.orderId, type: "SHIPMENT", title: `Shipment ${s.shipmentNumber}: ${parsed.data.milestone.replace(/_/g, " ").toLowerCase()}`, description: [parsed.data.location, parsed.data.description].filter(Boolean).join(" · ") || null, actorId: user.id, data: { shipmentId: s.id, status: parsed.data.status } });
    });
    const [order] = await db.select({ buyerCompanyId: orders.buyerCompanyId, supplierCompanyId: orders.supplierCompanyId, orderNumber: orders.orderNumber }).from(orders).where(eq(orders.id, s.orderId)).limit(1);
    if (order) {
      const title = `Shipment ${s.shipmentNumber}: ${parsed.data.status.replace(/_/g, " ").toLowerCase()}`;
      await notifyCompany(order.buyerCompanyId, { type: "SHIPMENT_UPDATE", title, body: parsed.data.location ?? undefined, link: `/buyer/shipments/${s.id}`, email: false });
      await notifyCompany(order.supplierCompanyId, { type: "SHIPMENT_UPDATE", title, body: parsed.data.location ?? undefined, link: `/seller/shipments/${s.id}`, email: false });
    }
    await log({ action: "admin.shipment.event", entityType: "shipment", entityId: s.id, before: { status: s.status }, after: { status: parsed.data.status, milestone: parsed.data.milestone, location: parsed.data.location } });
    revalidateAdmin("/admin/logistics", `/admin/orders/${s.orderId}`);
    return ok(undefined, "Shipment event added.");
  });
}
