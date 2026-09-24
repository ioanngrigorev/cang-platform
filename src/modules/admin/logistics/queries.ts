import "server-only";
import { asc, count, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { companies, logisticsProviders, logisticsRequests, orders, shipments } from "@/db/schema";
import { PAGE_SIZE, pageInfo } from "../shared";

export async function listAdminLogisticsRequests(page = 1) {
  const [rows, [{ total }]] = await Promise.all([
    db.query.logisticsRequests.findMany({
      with: { requesterCompany: { columns: { id: true, name: true } }, order: { columns: { id: true, orderNumber: true } }, quotes: { with: { provider: { columns: { id: true, name: true } } } } },
      orderBy: [desc(logisticsRequests.createdAt)],
      limit: PAGE_SIZE,
      offset: (page - 1) * PAGE_SIZE,
    }),
    db.select({ total: count() }).from(logisticsRequests),
  ]);
  return { rows, ...pageInfo(total, page) };
}

export async function listAdminShipments(page = 1) {
  const [rows, [{ total }]] = await Promise.all([
    db
      .select({
        id: shipments.id,
        shipmentNumber: shipments.shipmentNumber,
        status: shipments.status,
        mode: shipments.mode,
        carrier: shipments.carrier,
        trackingNumber: shipments.trackingNumber,
        originPort: shipments.originPort,
        destinationPort: shipments.destinationPort,
        etd: shipments.etd,
        eta: shipments.eta,
        createdAt: shipments.createdAt,
        order: { id: orders.id, orderNumber: orders.orderNumber },
        supplier: { id: companies.id, name: companies.name },
        provider: { id: logisticsProviders.id, name: logisticsProviders.name },
        exceptionReason: shipments.exceptionReason,
      })
      .from(shipments)
      .innerJoin(orders, eq(orders.id, shipments.orderId))
      .innerJoin(companies, eq(companies.id, orders.supplierCompanyId))
      .leftJoin(logisticsProviders, eq(logisticsProviders.id, shipments.providerId))
      .orderBy(desc(shipments.createdAt))
      .limit(PAGE_SIZE)
      .offset((page - 1) * PAGE_SIZE),
    db.select({ total: count() }).from(shipments),
  ]);
  return { rows, ...pageInfo(total, page) };
}

export async function listLogisticsProvidersAll() {
  const rows = await db
    .select({ provider: logisticsProviders, company: { id: companies.id, name: companies.name, slug: companies.slug } })
    .from(logisticsProviders)
    .leftJoin(companies, eq(companies.id, logisticsProviders.companyId))
    .orderBy(asc(logisticsProviders.isActive), asc(logisticsProviders.sortOrder), asc(logisticsProviders.name));
  return rows.map((r) => ({ ...r.provider, company: r.company?.id ? r.company : null }));
}
