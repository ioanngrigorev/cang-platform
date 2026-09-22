import "server-only";
import { and, count, desc, eq, inArray, isNull } from "drizzle-orm";
import { db } from "@/db";
import { logisticsProviders, logisticsRequests, orders, shipments } from "@/db/schema";

export async function listBuyerLogisticsRequests(companyId: string, opts: { page?: number; pageSize?: number } = {}) {
  const page = Math.max(1, opts.page ?? 1);
  const pageSize = opts.pageSize ?? 20;
  const where = eq(logisticsRequests.requesterCompanyId, companyId);
  const [rows, [{ total }]] = await Promise.all([
    db.query.logisticsRequests.findMany({
      where,
      with: {
        order: { columns: { id: true, orderNumber: true } },
        quotes: { columns: { id: true, status: true, amount: true, currency: true, transitDays: true, mode: true } },
      },
      orderBy: [desc(logisticsRequests.createdAt)],
      limit: pageSize,
      offset: (page - 1) * pageSize,
    }),
    db.select({ total: count() }).from(logisticsRequests).where(where),
  ]);
  return { rows, total, page, pageSize, totalPages: Math.max(1, Math.ceil(total / pageSize)) };
}

export async function getBuyerLogisticsRequest(companyId: string, requestId: string) {
  const row = await db.query.logisticsRequests.findFirst({
    where: and(eq(logisticsRequests.id, requestId), eq(logisticsRequests.requesterCompanyId, companyId)),
    with: {
      order: { columns: { id: true, orderNumber: true, statusCode: true } },
      quotes: { with: { provider: true }, orderBy: (t, { asc }) => [asc(t.amount)] },
    },
  });
  return row ?? null;
}

/** Shipments on the buyer's orders. */
export async function listBuyerShipments(companyId: string, opts: { page?: number; pageSize?: number; status?: string } = {}) {
  const page = Math.max(1, opts.page ?? 1);
  const pageSize = opts.pageSize ?? 20;
  const orderIds = await db
    .select({ id: orders.id })
    .from(orders)
    .where(and(eq(orders.buyerCompanyId, companyId), isNull(orders.deletedAt)));
  const ids = orderIds.map((o) => o.id);
  if (!ids.length) return { rows: [], total: 0, page, pageSize, totalPages: 1 };
  const where = and(inArray(shipments.orderId, ids), opts.status ? eq(shipments.status, opts.status as typeof shipments.$inferSelect.status) : undefined);
  const [rows, [{ total }]] = await Promise.all([
    db.query.shipments.findMany({
      where,
      with: {
        order: { columns: { id: true, orderNumber: true }, with: { supplierCompany: { columns: { id: true, name: true, slug: true } } } },
        provider: { columns: { id: true, name: true } },
        events: { orderBy: (t, { desc: d }) => [d(t.occurredAt)], limit: 1 },
      },
      orderBy: [desc(shipments.createdAt)],
      limit: pageSize,
      offset: (page - 1) * pageSize,
    }),
    db.select({ total: count() }).from(shipments).where(where),
  ]);
  return { rows, total, page, pageSize, totalPages: Math.max(1, Math.ceil(total / pageSize)) };
}

export async function getBuyerShipment(companyId: string, shipmentId: string) {
  const shipment = await db.query.shipments.findFirst({
    where: eq(shipments.id, shipmentId),
    with: {
      order: { columns: { id: true, orderNumber: true, buyerCompanyId: true, incoterm: true }, with: { supplierCompany: { columns: { id: true, name: true, slug: true, logoUrl: true } } } },
      provider: true,
      events: { orderBy: (t, { asc }) => [asc(t.occurredAt)] },
      documents: { where: (t, { isNull: n }) => n(t.deletedAt) },
    },
  });
  if (!shipment || shipment.order?.buyerCompanyId !== companyId) return null;
  return shipment;
}

export async function activeLogisticsProviders() {
  return db.select().from(logisticsProviders).where(eq(logisticsProviders.isActive, true)).orderBy(logisticsProviders.sortOrder);
}
