import { and, eq, isNull } from "drizzle-orm";
import { db, type Tx } from "@/db";
import { logisticsProviders, orderEvents, orders, shipmentEvents, shipments } from "@/db/schema";
import { ActionError } from "@/lib/action";
import { shipmentNumber } from "@/lib/ids";
import { audit } from "@/modules/audit/log";
import { carrierByCode } from "@/modules/logistics/tracking/carriers";
import { applyShipmentUpdate, assignShipmentPartner } from "@/modules/logistics/tracking/service";
import { notifyCompany } from "@/modules/notifications/service";
import { SHIPPABLE_ORDER_STATUSES, type CreateShipmentInput, type ShipmentEventInput, type UpdateShipmentInput } from "./schemas";

type ShipmentRow = typeof shipments.$inferSelect;

async function supplierOrder(companyId: string, orderId: string, tx?: Tx) {
  const [order] = await (tx ?? db)
    .select()
    .from(orders)
    .where(and(eq(orders.id, orderId), eq(orders.supplierCompanyId, companyId), isNull(orders.deletedAt)))
    .limit(1);
  if (!order) throw new ActionError("Order not found.", "NOT_FOUND");
  return order;
}

/** A shipment on one of the supplier's orders. */
export async function supplierShipment(companyId: string, shipmentId: string) {
  const [row] = await db
    .select({ shipment: shipments, order: { id: orders.id, orderNumber: orders.orderNumber, buyerCompanyId: orders.buyerCompanyId, statusCode: orders.statusCode } })
    .from(shipments)
    .innerJoin(orders, eq(orders.id, shipments.orderId))
    .where(and(eq(shipments.id, shipmentId), eq(orders.supplierCompanyId, companyId), isNull(orders.deletedAt)))
    .limit(1);
  if (!row) throw new ActionError("Shipment not found.", "NOT_FOUND");
  return row;
}

function shipmentColumns(input: CreateShipmentInput | UpdateShipmentInput) {
  const carrierName = input.carrier ?? (input.carrierCode && input.carrierCode !== "OTHER" ? carrierByCode(input.carrierCode)?.name ?? null : null);
  return {
    mode: input.mode,
    carrier: carrierName,
    carrierCode: input.carrierCode,
    trackingNumber: input.trackingNumber,
    vesselOrFlight: input.vesselOrFlight,
    containerNumber: input.containerNumber,
    originPort: input.originPort,
    destinationPort: input.destinationPort,
    packages: input.packages == null ? null : Math.trunc(input.packages),
    grossWeightKg: input.grossWeightKg,
    volumeCbm: input.volumeCbm,
    etd: input.etd,
    eta: input.eta,
    notes: input.notes,
  };
}

/**
 * Register a shipment on an order in production / inspection / shipping. Creates the first milestone
 * ("at factory"), a timeline entry on the order and notifies the buyer. Runs inside `tx` when given.
 */
export async function createShipment(companyId: string, userId: string, input: CreateShipmentInput, opts: { tx?: Tx; notify?: boolean } = {}): Promise<ShipmentRow> {
  const provider = input.providerId ? await activeProvider(input.providerId) : null;
  const run = async (tx: Tx) => {
    const order = await supplierOrder(companyId, input.orderId, tx);
    if (!SHIPPABLE_ORDER_STATUSES.includes(order.statusCode)) throw new ActionError("A shipment can only be created once the order is in production or shipping.", "INVALID_STATE");
    const [row] = await tx
      .insert(shipments)
      .values({
        shipmentNumber: shipmentNumber(),
        orderId: order.id,
        status: "BOOKED",
        incoterm: order.incoterm,
        destinationAddress: order.shippingAddress,
        currency: order.currency,
        ...shipmentColumns(input),
        providerId: provider?.id ?? null,
        assignedAt: provider ? new Date() : null,
        lastEventAt: new Date(),
      })
      .returning();
    await tx.insert(shipmentEvents).values({
      shipmentId: row.id,
      milestone: "FACTORY",
      status: "BOOKED",
      location: input.originPort,
      description: provider ? `Booked with ${provider.name}` : input.carrier ? `Booked with ${input.carrier}` : "Booking confirmed; cargo ready at factory",
      actorUserId: userId,
      actorCompanyId: companyId,
      source: "manual",
      occurredAt: new Date(),
    });
    await tx.insert(orderEvents).values({
      orderId: order.id,
      type: "SHIPMENT",
      title: `Shipment ${row.shipmentNumber} created`,
      description: [input.mode.replace(/_/g, " "), provider?.name, input.carrier, input.trackingNumber ? `tracking ${input.trackingNumber}` : null, input.eta ? `ETA ${input.eta.toISOString().slice(0, 10)}` : null].filter(Boolean).join(" · "),
      actorId: userId,
      data: { shipmentId: row.id },
    });
    return { row, order };
  };
  const { row, order } = opts.tx ? await run(opts.tx) : await db.transaction(run);
  if (opts.notify !== false) {
    await notifyCompany(order.buyerCompanyId, {
      type: "SHIPMENT_UPDATE",
      title: `Shipment ${row.shipmentNumber} booked for order ${order.orderNumber}`,
      body: [row.carrier, row.trackingNumber ? `Tracking ${row.trackingNumber}` : null, row.eta ? `ETA ${row.eta.toISOString().slice(0, 10)}` : null].filter(Boolean).join(" · ") || undefined,
      link: `/buyer/shipments/${row.id}`,
    });
  }
  if (provider?.companyId && opts.notify !== false) {
    await notifyCompany(provider.companyId, {
      type: "SHIPMENT_ASSIGNED",
      title: `New shipment ${row.shipmentNumber} (order ${order.orderNumber})`,
      body: [row.mode.replace(/_/g, " "), row.originPort, row.destinationPort, row.etd ? `ETD ${row.etd.toISOString().slice(0, 10)}` : null].filter(Boolean).join(" · ") || undefined,
      link: `/partner/shipments/${row.id}`,
      email: true,
    });
  }
  await audit({ actorId: userId, action: "shipment.create", entityType: "shipment", entityId: row.id, after: { orderId: order.id, mode: row.mode, carrier: row.carrier, providerId: provider?.id ?? null } });
  return row;
}

async function activeProvider(providerId: string) {
  const [p] = await db
    .select({ id: logisticsProviders.id, name: logisticsProviders.name, companyId: logisticsProviders.companyId })
    .from(logisticsProviders)
    .where(and(eq(logisticsProviders.id, providerId), eq(logisticsProviders.isActive, true)))
    .limit(1);
  if (!p) throw new ActionError("Choose an active logistics partner.", "VALIDATION", { providerId: ["Choose an active logistics partner"] });
  return p;
}

/** Report a milestone / problem (shared rules with the logistics partner portal — see logistics/tracking/service). */
export async function addShipmentEvent(companyId: string, userId: string, input: ShipmentEventInput) {
  return applyShipmentUpdate({ kind: "SELLER", userId, companyId }, input);
}

/** Carrier / tracking / schedule corrections. */
export async function updateShipment(companyId: string, userId: string, input: UpdateShipmentInput) {
  const { shipment, order } = await supplierShipment(companyId, input.shipmentId);
  if ((input.providerId ?? null) !== shipment.providerId) {
    await assignShipmentPartner({ shipmentId: shipment.id, providerId: input.providerId ?? null, actor: { kind: "SELLER", userId, companyId } });
  }
  const [row] = await db.update(shipments).set(shipmentColumns(input)).where(eq(shipments.id, shipment.id)).returning();
  const changedEta = (shipment.eta?.getTime() ?? 0) !== (row.eta?.getTime() ?? 0);
  const changedTracking = shipment.trackingNumber !== row.trackingNumber;
  if (changedEta || changedTracking) {
    await notifyCompany(order.buyerCompanyId, {
      type: "SHIPMENT_UPDATE",
      title: `Shipment ${shipment.shipmentNumber} updated`,
      body: [changedTracking && row.trackingNumber ? `Tracking ${row.trackingNumber}` : null, changedEta && row.eta ? `ETA ${row.eta.toISOString().slice(0, 10)}` : null].filter(Boolean).join(" · ") || undefined,
      link: `/buyer/shipments/${shipment.id}`,
      email: false,
    });
  }
  await audit({ actorId: userId, action: "shipment.update", entityType: "shipment", entityId: shipment.id, after: { trackingNumber: row.trackingNumber, eta: row.eta, carrier: row.carrier } });
  return row;
}
