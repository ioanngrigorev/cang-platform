import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { inspectionOrders, inspectionProviders, orderEvents, orders } from "@/db/schema";
import { ActionError } from "@/lib/action";
import { inspectionNumber } from "@/lib/ids";
import { audit } from "@/modules/audit/log";
import { notifyCompany } from "@/modules/notifications/service";
import type { RequestInspectionInput } from "./schemas";

/**
 * Buyer books a third-party inspection. CANG only originates the request; the licensed
 * inspection partner performs the work and uploads the report.
 */
export async function requestInspection(companyId: string, userId: string, input: RequestInspectionInput) {
  let order: typeof orders.$inferSelect | null = null;
  if (input.orderId) {
    const [row] = await db.select().from(orders).where(and(eq(orders.id, input.orderId), eq(orders.buyerCompanyId, companyId))).limit(1);
    if (!row) throw new ActionError("Order not found.", "NOT_FOUND");
    order = row;
  }
  let provider: typeof inspectionProviders.$inferSelect | null = null;
  if (input.providerId) {
    const [p] = await db.select().from(inspectionProviders).where(and(eq(inspectionProviders.id, input.providerId), eq(inspectionProviders.isActive, true))).limit(1);
    if (!p) throw new ActionError("Inspection provider not found.", "NOT_FOUND");
    provider = p;
  }

  const [row] = await db
    .insert(inspectionOrders)
    .values({
      inspectionNumber: inspectionNumber(),
      orderId: order?.id ?? null,
      requesterCompanyId: companyId,
      providerId: provider?.id ?? null,
      type: input.type,
      status: "REQUESTED",
      result: "PENDING",
      factoryAddress: input.factoryAddress,
      requestedDate: input.requestedDate,
      currency: order?.currency ?? "USD",
      notes: input.notes,
    })
    .returning();

  if (order) {
    await db.insert(orderEvents).values({
      orderId: order.id,
      type: "INSPECTION",
      title: `Inspection requested: ${input.type.replace(/_/g, " ").toLowerCase()}`,
      description: `${row.inspectionNumber}${provider ? ` · ${provider.name}` : ""}`,
      actorId: userId,
      data: { inspectionId: row.id },
    });
    await notifyCompany(order.supplierCompanyId, {
      type: "INSPECTION_UPDATE",
      title: `Buyer booked an inspection for order ${order.orderNumber}`,
      body: `${input.type.replace(/_/g, " ").toLowerCase()}${input.requestedDate ? ` around ${input.requestedDate.toISOString().slice(0, 10)}` : ""}. Please make the factory available.`,
      link: `/seller/orders/${order.id}`,
    });
  }
  if (provider?.companyId) {
    await notifyCompany(provider.companyId, {
      type: "INSPECTION_UPDATE",
      title: `New inspection request ${row.inspectionNumber}`,
      body: input.notes ?? undefined,
      link: `/seller/inspections/${row.id}`,
      email: false,
    });
  }
  await audit({ actorId: userId, action: "inspection.request", entityType: "inspectionOrder", entityId: row.id, after: { type: input.type, orderId: order?.id ?? null, providerId: provider?.id ?? null } });
  return row;
}

/** Buyer cancels an inspection that has not started yet. */
export async function cancelInspection(companyId: string, userId: string, inspectionId: string) {
  const [row] = await db
    .select()
    .from(inspectionOrders)
    .where(and(eq(inspectionOrders.id, inspectionId), eq(inspectionOrders.requesterCompanyId, companyId)))
    .limit(1);
  if (!row) throw new ActionError("Inspection not found.", "NOT_FOUND");
  if (!["REQUESTED", "QUOTED", "SCHEDULED"].includes(row.status)) throw new ActionError("This inspection can no longer be cancelled.", "INVALID_STATE");
  await db.update(inspectionOrders).set({ status: "CANCELLED" }).where(eq(inspectionOrders.id, inspectionId));
  if (row.orderId) {
    await db.insert(orderEvents).values({ orderId: row.orderId, type: "INSPECTION", title: `Inspection ${row.inspectionNumber} cancelled`, actorId: userId });
  }
  await audit({ actorId: userId, action: "inspection.cancel", entityType: "inspectionOrder", entityId: inspectionId });
}
