import "server-only";
import { and, count, desc, eq, inArray, isNull } from "drizzle-orm";
import { db } from "@/db";
import { orders, shipments } from "@/db/schema";

/** Shipments on the supplier's orders, newest first. */
export async function listSellerShipments(companyId: string, opts: { page?: number; pageSize?: number; status?: string } = {}) {
  const page = Math.max(1, opts.page ?? 1);
  const pageSize = opts.pageSize ?? 20;
  const orderIds = (await db.select({ id: orders.id }).from(orders).where(and(eq(orders.supplierCompanyId, companyId), isNull(orders.deletedAt)))).map((o) => o.id);
  if (!orderIds.length) return { rows: [], total: 0, page, pageSize, totalPages: 1 };
  const where = and(inArray(shipments.orderId, orderIds), opts.status ? eq(shipments.status, opts.status as typeof shipments.$inferSelect.status) : undefined);
  const [rows, [{ total }]] = await Promise.all([
    db.query.shipments.findMany({
      where,
      with: {
        order: { columns: { id: true, orderNumber: true, statusCode: true }, with: { buyerCompany: { columns: { id: true, name: true, slug: true, countryCode: true } } } },
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

export async function getSellerShipment(companyId: string, shipmentId: string) {
  const shipment = await db.query.shipments.findFirst({
    where: eq(shipments.id, shipmentId),
    with: {
      order: {
        columns: { id: true, orderNumber: true, supplierCompanyId: true, statusCode: true, incoterm: true, shippingAddress: true, deletedAt: true },
        with: { buyerCompany: { columns: { id: true, name: true, slug: true, logoUrl: true, countryCode: true } } },
      },
      provider: true,
      events: { orderBy: (t, { asc }) => [asc(t.occurredAt)] },
      documents: { where: (t, { isNull: n }) => n(t.deletedAt) },
    },
  });
  if (!shipment || shipment.order?.supplierCompanyId !== companyId || shipment.order.deletedAt) return null;
  const documents = shipment.documents.filter((d) => d.ownerCompanyId === companyId || d.visibility === "COUNTERPARTY" || d.visibility === "PUBLIC");
  return { ...shipment, documents };
}
