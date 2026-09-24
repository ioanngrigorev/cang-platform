import "server-only";
import { aliasedTable, and, asc, count, desc, eq, ilike, inArray, isNotNull, lt, or, sql, type SQL } from "drizzle-orm";
import { db } from "@/db";
import { companies, orderItems, orders, provinces, shipments } from "@/db/schema";
import { shipmentTimeline } from "@/modules/logistics/tracking/queries";
import { ALERT_STATUSES, SHIPMENT_STATUSES, TERMINAL_STATUSES, type ShipmentStatus } from "@/modules/logistics/tracking/statuses";

const buyer = aliasedTable(companies, "buyer");
const supplier = aliasedTable(companies, "supplier");

/** Tabs of the partner shipment list. */
export const PARTNER_TABS = ["active", "pickup", "transit", "delivery", "problems", "done", "all"] as const;
export type PartnerTab = (typeof PARTNER_TABS)[number];

const PICKUP: ShipmentStatus[] = ["PENDING", "BOOKED", "READY_TO_PICK", "VEHICLE_ASSIGNED", "PICKUP_FAILED"];
const DELIVERY: ShipmentStatus[] = ["OUT_FOR_DELIVERY", "DELIVERY_FAILED"];
const DONE = [...TERMINAL_STATUSES] as ShipmentStatus[];
const PROBLEMS = [...ALERT_STATUSES].filter((s) => !["RETURNED", "LOST", "DAMAGED"].includes(s)) as ShipmentStatus[];
const TRANSIT = SHIPMENT_STATUSES.filter((s) => !PICKUP.includes(s) && !DELIVERY.includes(s) && !DONE.includes(s) && !PROBLEMS.includes(s)) as ShipmentStatus[];

function tabFilter(tab: PartnerTab): SQL | undefined {
  switch (tab) {
    case "active":
      return sql`${shipments.status} not in ('DELIVERED','RETURNED','LOST','DAMAGED','CANCELLED')`;
    case "pickup":
      return inArray(shipments.status, PICKUP);
    case "transit":
      return inArray(shipments.status, TRANSIT);
    case "delivery":
      return inArray(shipments.status, DELIVERY);
    case "problems":
      return inArray(shipments.status, PROBLEMS);
    case "done":
      return inArray(shipments.status, DONE);
    default:
      return undefined;
  }
}

/** A shipment is "stale" when a non-final shipment had no update for this long. */
export const STALE_HOURS = 48;

export async function partnerOverview(providerId: string) {
  const rows = await db.select({ status: shipments.status, n: count() }).from(shipments).where(eq(shipments.providerId, providerId)).groupBy(shipments.status);
  const by = new Map(rows.map((r) => [r.status as string, Number(r.n)]));
  const sum = (list: string[]) => list.reduce((a, s) => a + (by.get(s) ?? 0), 0);
  const now = Date.now();
  const staleBefore = new Date(now - STALE_HOURS * 3600 * 1000);
  const [overdue] = await db
    .select({ n: count() })
    .from(shipments)
    .where(and(eq(shipments.providerId, providerId), isNotNull(shipments.eta), lt(shipments.eta, new Date()), sql`${shipments.status} not in ('DELIVERED','RETURNED','LOST','DAMAGED','CANCELLED')`));
  const [stale] = await db
    .select({ n: count() })
    .from(shipments)
    .where(and(eq(shipments.providerId, providerId), sql`${shipments.status} not in ('DELIVERED','RETURNED','LOST','DAMAGED','CANCELLED')`, or(lt(shipments.lastEventAt, staleBefore), sql`${shipments.lastEventAt} is null and ${shipments.createdAt} < ${staleBefore}`)));
  const since = new Date(now - 30 * 86400 * 1000);
  const [delivered30] = await db.select({ n: count() }).from(shipments).where(and(eq(shipments.providerId, providerId), eq(shipments.status, "DELIVERED"), sql`${shipments.deliveredAt} >= ${since}`));
  return {
    pickup: sum(PICKUP),
    transit: sum(TRANSIT),
    delivery: sum(DELIVERY),
    problems: sum(PROBLEMS),
    done: sum(DONE),
    active: [...by.entries()].filter(([s]) => !DONE.includes(s as ShipmentStatus)).reduce((a, [, n]) => a + n, 0),
    overdue: Number(overdue?.n ?? 0),
    stale: Number(stale?.n ?? 0),
    delivered30: Number(delivered30?.n ?? 0),
  };
}

export async function listPartnerShipments(providerId: string, opts: { tab?: PartnerTab; q?: string | null; page?: number; pageSize?: number } = {}) {
  const page = Math.max(1, opts.page ?? 1);
  const pageSize = opts.pageSize ?? 25;
  const q = opts.q?.trim();
  const where = and(
    eq(shipments.providerId, providerId),
    tabFilter(opts.tab ?? "active"),
    q ? or(ilike(shipments.shipmentNumber, `%${q}%`), ilike(shipments.trackingNumber, `%${q}%`), ilike(orders.orderNumber, `%${q}%`), ilike(shipments.containerNumber, `%${q}%`), ilike(buyer.name, `%${q}%`), ilike(supplier.name, `%${q}%`)) : undefined,
  );
  const base = db
    .select({
      id: shipments.id,
      shipmentNumber: shipments.shipmentNumber,
      status: shipments.status,
      mode: shipments.mode,
      carrier: shipments.carrier,
      carrierCode: shipments.carrierCode,
      trackingNumber: shipments.trackingNumber,
      originPort: shipments.originPort,
      destinationPort: shipments.destinationPort,
      destinationAddress: shipments.destinationAddress,
      etd: shipments.etd,
      eta: shipments.eta,
      packages: shipments.packages,
      grossWeightKg: shipments.grossWeightKg,
      exceptionReason: shipments.exceptionReason,
      lastEventAt: shipments.lastEventAt,
      assignedAt: shipments.assignedAt,
      createdAt: shipments.createdAt,
      orderNumber: orders.orderNumber,
      buyerName: buyer.name,
      buyerCountry: buyer.countryCode,
      supplierName: supplier.name,
      supplierCity: supplier.city,
    })
    .from(shipments)
    .innerJoin(orders, eq(orders.id, shipments.orderId))
    .innerJoin(buyer, eq(buyer.id, orders.buyerCompanyId))
    .innerJoin(supplier, eq(supplier.id, orders.supplierCompanyId));
  const [rows, [total]] = await Promise.all([
    base
      .where(where)
      .orderBy(sql`case when ${shipments.status} in ('PICKUP_FAILED','DELIVERY_FAILED','EXCEPTION') then 0 else 1 end`, asc(sql`coalesce(${shipments.eta}, ${shipments.etd}, ${shipments.createdAt})`), desc(shipments.createdAt))
      .limit(pageSize)
      .offset((page - 1) * pageSize),
    db
      .select({ n: count() })
      .from(shipments)
      .innerJoin(orders, eq(orders.id, shipments.orderId))
      .innerJoin(buyer, eq(buyer.id, orders.buyerCompanyId))
      .innerJoin(supplier, eq(supplier.id, orders.supplierCompanyId))
      .where(where),
  ]);
  return { rows, total: Number(total?.n ?? 0), page, pageSize };
}
export type PartnerShipmentRow = Awaited<ReturnType<typeof listPartnerShipments>>["rows"][number];

/** Everything the partner needs to pick up, move and deliver one shipment. */
export async function getPartnerShipment(providerId: string, shipmentId: string) {
  const [row] = await db
    .select({
      shipment: shipments,
      order: { id: orders.id, orderNumber: orders.orderNumber, incoterm: orders.incoterm, statusCode: orders.statusCode, shippingAddress: orders.shippingAddress, currency: orders.currency },
      buyer: { id: buyer.id, name: buyer.name, countryCode: buyer.countryCode, phone: buyer.phone, email: buyer.email },
      supplier: { id: supplier.id, name: supplier.name, address: supplier.address, city: supplier.city, countryCode: supplier.countryCode, phone: supplier.phone, email: supplier.email, provinceId: supplier.provinceId },
    })
    .from(shipments)
    .innerJoin(orders, eq(orders.id, shipments.orderId))
    .innerJoin(buyer, eq(buyer.id, orders.buyerCompanyId))
    .innerJoin(supplier, eq(supplier.id, orders.supplierCompanyId))
    .where(and(eq(shipments.id, shipmentId), eq(shipments.providerId, providerId)))
    .limit(1);
  if (!row) return null;
  const [items, events, province] = await Promise.all([
    db.select({ description: orderItems.description, quantity: orderItems.quantity, unit: orderItems.unit, hsCode: orderItems.hsCode }).from(orderItems).where(eq(orderItems.orderId, row.order.id)).orderBy(asc(orderItems.sortOrder)),
    shipmentTimeline(row.shipment.id),
    row.supplier.provinceId ? db.select({ name: provinces.name, nameVi: provinces.nameVi }).from(provinces).where(eq(provinces.id, row.supplier.provinceId)).limit(1) : Promise.resolve([]),
  ]);
  return { ...row, items, events, supplierProvince: province[0] ?? null };
}

export { shipmentTimeline, type TimelineEvent } from "@/modules/logistics/tracking/queries";
