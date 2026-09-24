import "server-only";
import { and, asc, desc, eq, gte, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { companies, orderItems, orders, shipmentEvents, shipments } from "@/db/schema";
import { SHIPMENT_STATUSES } from "@/modules/logistics/tracking/statuses";

/** JSON shape of a shipment in the partner API (snake_case, ISO dates). */
export function shipmentJson(s: typeof shipments.$inferSelect, extra: Record<string, unknown> = {}) {
  const iso = (d: Date | null) => (d ? d.toISOString() : null);
  return {
    id: s.id,
    shipment_number: s.shipmentNumber,
    status: s.status,
    exception_reason: s.exceptionReason,
    mode: s.mode,
    carrier_code: s.carrierCode,
    carrier: s.carrier,
    tracking_number: s.trackingNumber,
    vessel_or_flight: s.vesselOrFlight,
    container_number: s.containerNumber,
    origin_port: s.originPort,
    destination_port: s.destinationPort,
    destination_address: s.destinationAddress,
    packages: s.packages,
    gross_weight_kg: s.grossWeightKg,
    volume_cbm: s.volumeCbm,
    etd: iso(s.etd),
    eta: iso(s.eta),
    delivered_at: iso(s.deliveredAt),
    receiver_name: s.receiverName,
    last_event_at: iso(s.lastEventAt),
    assigned_at: iso(s.assignedAt),
    created_at: iso(s.createdAt),
    ...extra,
  };
}

export async function apiListShipments(providerId: string, opts: { status?: string | null; updatedSince?: Date | null; limit: number; offset: number }) {
  const statusFilter =
    opts.status === "active"
      ? sql`${shipments.status} not in ('DELIVERED','RETURNED','LOST','DAMAGED','CANCELLED')`
      : opts.status && (SHIPMENT_STATUSES as readonly string[]).includes(opts.status)
        ? eq(shipments.status, opts.status as (typeof SHIPMENT_STATUSES)[number])
        : undefined;
  const rows = await db
    .select({ shipment: shipments, orderNumber: orders.orderNumber })
    .from(shipments)
    .innerJoin(orders, eq(orders.id, shipments.orderId))
    .where(and(eq(shipments.providerId, providerId), statusFilter, opts.updatedSince ? gte(shipments.updatedAt, opts.updatedSince) : undefined))
    .orderBy(desc(shipments.updatedAt))
    .limit(opts.limit)
    .offset(opts.offset);
  return rows.map((r) => shipmentJson(r.shipment, { order_number: r.orderNumber }));
}

export async function apiShipmentByNumber(providerId: string, number: string) {
  const [row] = await db
    .select({ shipment: shipments, order: { id: orders.id, orderNumber: orders.orderNumber, incoterm: orders.incoterm }, supplierName: companies.name, supplierPhone: companies.phone, supplierAddress: companies.address, supplierCity: companies.city })
    .from(shipments)
    .innerJoin(orders, eq(orders.id, shipments.orderId))
    .innerJoin(companies, eq(companies.id, orders.supplierCompanyId))
    .where(and(eq(shipments.providerId, providerId), eq(shipments.shipmentNumber, number)))
    .limit(1);
  return row ?? null;
}

export async function apiShipmentDetail(providerId: string, number: string) {
  const row = await apiShipmentByNumber(providerId, number);
  if (!row) return null;
  const [items, events] = await Promise.all([
    db.select({ description: orderItems.description, quantity: orderItems.quantity, unit: orderItems.unit, hs_code: orderItems.hsCode }).from(orderItems).where(eq(orderItems.orderId, row.order.id)).orderBy(asc(orderItems.sortOrder)),
    db
      .select({ status: shipmentEvents.status, reason_code: shipmentEvents.reasonCode, location: shipmentEvents.location, description: shipmentEvents.description, source: shipmentEvents.source, occurred_at: shipmentEvents.occurredAt })
      .from(shipmentEvents)
      .where(eq(shipmentEvents.shipmentId, row.shipment.id))
      .orderBy(asc(shipmentEvents.occurredAt)),
  ]);
  return shipmentJson(row.shipment, {
    order_number: row.order.orderNumber,
    incoterm: row.order.incoterm,
    pickup: { company: row.supplierName, phone: row.supplierPhone, address: row.supplierAddress, city: row.supplierCity },
    items,
    events: events.map((e) => ({ ...e, occurred_at: e.occurred_at.toISOString() })),
  });
}

const text = (max: number) => z.string().trim().max(max).optional().nullable().transform((v) => (v ? v : null));
const num = z.union([z.number(), z.string()]).optional().nullable().transform((v) => (v === null || v === undefined || v === "" ? null : Number(v))).refine((n) => n === null || (Number.isFinite(n) && n >= 0), "must be a non-negative number");

export const apiEventSchema = z.object({
  status: z.enum(SHIPMENT_STATUSES),
  reason_code: text(60),
  location: text(200),
  description: text(1000),
  occurred_at: z.string().optional().nullable().transform((v) => (v ? new Date(v) : null)).refine((d) => d === null || !Number.isNaN(d.getTime()), "must be an ISO 8601 date"),
  receiver_name: text(160),
  pod_url: z.string().url().optional().nullable().transform((v) => v ?? null),
  packages: num,
  gross_weight_kg: num,
  vehicle_plate: text(40),
  driver_name: text(120),
  driver_phone: text(40),
  vessel_or_flight: text(120),
  container_number: text(60),
  customs_declaration: text(60),
  external_id: text(120),
});

export const apiTrackingSchema = z.object({
  carrier_code: z.enum(["GHN", "GHTK", "VTP", "JT", "VNPOST", "OTHER"]).optional().nullable().transform((v) => v ?? null),
  carrier: text(120),
  tracking_number: text(120),
  vessel_or_flight: text(120).optional(),
  container_number: text(60).optional(),
  etd: z.string().optional().nullable().transform((v) => (v ? new Date(v) : v === null ? null : undefined)),
  eta: z.string().optional().nullable().transform((v) => (v ? new Date(v) : v === null ? null : undefined)),
});
