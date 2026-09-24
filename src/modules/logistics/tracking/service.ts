import "server-only";
import { and, asc, desc, eq, inArray, isNotNull, ne } from "drizzle-orm";
import { db } from "@/db";
import { companies, documents, logisticsProviders, orderEvents, orders, shipmentEvents, shipments } from "@/db/schema";
import { ActionError } from "@/lib/action";
import { audit } from "@/modules/audit/log";
import { notifyCompany } from "@/modules/notifications/service";
import { transitionOrder } from "@/modules/orders/service";
import { carrierByCode, carrierEventKey, fetchCarrierHistory, type MappedCarrierEvent } from "./carriers";
import {
  ALERT_STATUSES,
  FLOWS,
  REASON_CODES,
  REASON_REQUIRED,
  SIDE_STATUSES,
  STATUS_MILESTONE,
  allowedNextStatuses,
  flowFor,
  furthestProgress,
  isTerminal,
  type ActorKind,
  type ShipmentStatus,
} from "./statuses";

export type ShipmentActor =
  | { kind: "SELLER"; userId: string; companyId: string }
  | { kind: "PARTNER"; userId: string | null; companyId: string; via: "portal" | "api" }
  | { kind: "CARRIER"; carrierCode: string; source: "webhook" | "carrier-sync" }
  | { kind: "ADMIN"; userId: string };

export type Attachment = { url: string; name: string; kind?: string };

export type ShipmentUpdateInput = {
  shipmentId: string;
  status: ShipmentStatus;
  reasonCode?: string | null;
  location?: string | null;
  description?: string | null;
  occurredAt?: Date | null;
  attachments?: Attachment[];
  receiverName?: string | null;
  podUrl?: string | null;
  packages?: number | null;
  grossWeightKg?: number | null;
  volumeCbm?: number | null;
  vehiclePlate?: string | null;
  driverName?: string | null;
  driverPhone?: string | null;
  vesselOrFlight?: string | null;
  containerNumber?: string | null;
  customsDeclaration?: string | null;
  externalKey?: string | null;
  data?: Record<string, unknown>;
};

type Loaded = NonNullable<Awaited<ReturnType<typeof loadShipment>>>;

async function loadShipment(shipmentId: string) {
  const [row] = await db
    .select({
      shipment: shipments,
      order: { id: orders.id, orderNumber: orders.orderNumber, buyerCompanyId: orders.buyerCompanyId, supplierCompanyId: orders.supplierCompanyId, statusCode: orders.statusCode },
      provider: { id: logisticsProviders.id, name: logisticsProviders.name, companyId: logisticsProviders.companyId, apiConfig: logisticsProviders.apiConfig },
    })
    .from(shipments)
    .innerJoin(orders, eq(orders.id, shipments.orderId))
    .leftJoin(logisticsProviders, eq(logisticsProviders.id, shipments.providerId))
    .where(eq(shipments.id, shipmentId))
    .limit(1);
  return row ?? null;
}

function actorKind(actor: ShipmentActor): ActorKind {
  return actor.kind;
}

function assertAccess(actor: ShipmentActor, loaded: Loaded) {
  const { shipment, order, provider } = loaded;
  if (actor.kind === "SELLER" && order.supplierCompanyId !== actor.companyId) throw new ActionError("Shipment not found.", "NOT_FOUND");
  if (actor.kind === "PARTNER" && provider?.companyId !== actor.companyId) throw new ActionError("Shipment not found.", "NOT_FOUND");
  if (actor.kind === "CARRIER" && shipment.carrierCode !== actor.carrierCode) throw new ActionError("Shipment not found.", "NOT_FOUND");
}

/** Status history of a shipment, oldest first. */
async function statusHistory(shipmentId: string) {
  const rows = await db.select({ status: shipmentEvents.status }).from(shipmentEvents).where(eq(shipmentEvents.shipmentId, shipmentId)).orderBy(asc(shipmentEvents.occurredAt));
  return rows.map((r) => r.status);
}

/** Statuses this actor may report on this shipment now (drives the pickers in the portals). */
export async function nextStatusesFor(actor: ShipmentActor, shipmentId: string): Promise<ShipmentStatus[]> {
  const loaded = await loadShipment(shipmentId);
  if (!loaded) return [];
  const history = await statusHistory(shipmentId);
  return allowedNextStatuses({
    mode: loaded.shipment.mode,
    current: loaded.shipment.status,
    progress: furthestProgress(loaded.shipment.mode, [...history, loaded.shipment.status]),
    actor: actorKind(actor),
    managedByPartner: !!loaded.provider?.companyId,
  });
}

const who = (actor: ShipmentActor, providerName: string | null | undefined) =>
  actor.kind === "PARTNER" ? (providerName ?? "Logistics partner") : actor.kind === "CARRIER" ? (carrierByCode(actor.carrierCode)?.name ?? actor.carrierCode) : actor.kind === "ADMIN" ? "CANG operations" : "Supplier";

const human = (s: string) => s.replace(/_/g, " ").toLowerCase();

/**
 * Report a shipment status (milestone, failure, delivery…). The single entry point for sellers, logistics
 * partners (portal + API), carrier webhooks / sync and admins:
 *  - checks who may do what (see allowedNextStatuses) and the fields each status needs (reason, POD, vehicle);
 *  - appends the event (idempotent on externalKey), moves the shipment, writes the order timeline;
 *  - moves the order to SHIPPING on pickup and to DELIVERY once every shipment is delivered;
 *  - notifies buyer, supplier and partner (email for delivery and problems).
 */
export async function applyShipmentUpdate(actor: ShipmentActor, input: ShipmentUpdateInput) {
  const loaded = await loadShipment(input.shipmentId);
  if (!loaded) throw new ActionError("Shipment not found.", "NOT_FOUND");
  assertAccess(actor, loaded);
  const { shipment, order, provider } = loaded;

  if (input.externalKey) {
    const [dup] = await db.select({ id: shipmentEvents.id }).from(shipmentEvents).where(eq(shipmentEvents.externalKey, input.externalKey)).limit(1);
    if (dup) return { duplicate: true as const, changed: false, shipmentId: shipment.id };
  }

  const person = actor.kind === "SELLER" || actor.kind === "PARTNER" || actor.kind === "ADMIN";
  const occurredAt = input.occurredAt ?? new Date();
  if (occurredAt.getTime() > Date.now() + 10 * 60 * 1000) throw new ActionError("The event time cannot be in the future.", "VALIDATION", { occurredAt: ["Pick a time up to now"] });

  if (actor.kind !== "CARRIER") {
    const allowed = await nextStatusesFor(actor, shipment.id);
    if (!allowed.includes(input.status)) {
      if (actor.kind === "SELLER" && provider?.companyId) {
        throw new ActionError(`${provider.name} manages this shipment on CANG — it reports pickup, transit and delivery. You can still mark it ready for pickup or cancel it before pickup.`, "FORBIDDEN");
      }
      throw new ActionError(`A shipment that is "${human(shipment.status)}" cannot move to "${human(input.status)}".`, "INVALID_TRANSITION");
    }
  }
  let reasonCode = input.reasonCode && (REASON_CODES as string[]).includes(input.reasonCode) ? input.reasonCode : null;
  if (REASON_REQUIRED.has(input.status) && !reasonCode) {
    if (person && actor.kind !== "ADMIN") throw new ActionError("Choose a reason.", "VALIDATION", { reasonCode: ["Choose a reason"] });
    reasonCode = "OTHER";
  }
  if (input.status === "DELIVERED" && (actor.kind === "SELLER" || actor.kind === "PARTNER") && !input.receiverName) {
    throw new ActionError("Enter who received the goods (proof of delivery).", "VALIDATION", { receiverName: ["Enter the receiver's name"] });
  }
  if (input.status === "VEHICLE_ASSIGNED" && actor.kind === "PARTNER" && !input.vehiclePlate) {
    throw new ActionError("Enter the truck's plate number.", "VALIDATION", { vehiclePlate: ["Enter the plate number"] });
  }

  // Carriers deliver events out of order: an older event that would move the shipment backwards is only
  // recorded in the history. An older event that is still further along the flow (late webhook) applies.
  const flowList = FLOWS[flowFor(shipment.mode)];
  const aheadOfCurrent = flowList.indexOf(input.status) > flowList.indexOf(shipment.status as ShipmentStatus);
  const stale = actor.kind === "CARRIER" && shipment.lastEventAt != null && occurredAt < shipment.lastEventAt && !aheadOfCurrent;
  const statusChanges = !stale && input.status !== shipment.status;
  const source = actor.kind === "CARRIER" ? actor.source : actor.kind === "PARTNER" ? (actor.via === "api" ? "api" : "partner") : actor.kind === "ADMIN" ? "admin" : "manual";

  const data: Record<string, unknown> = { ...(input.data ?? {}) };
  for (const [k, v] of Object.entries({
    receiverName: input.receiverName,
    packages: input.packages,
    grossWeightKg: input.grossWeightKg,
    volumeCbm: input.volumeCbm,
    vehiclePlate: input.vehiclePlate,
    driverName: input.driverName,
    driverPhone: input.driverPhone,
    vesselOrFlight: input.vesselOrFlight,
    containerNumber: input.containerNumber,
    customsDeclaration: input.customsDeclaration,
  })) {
    if (v != null && v !== "") data[k] = v;
  }
  const attachments = [...(input.attachments ?? [])];
  if (input.podUrl) attachments.push({ url: input.podUrl, name: "Proof of delivery", kind: "POD" });

  const result = await db.transaction(async (tx) => {
    const [event] = await tx
      .insert(shipmentEvents)
      .values({
        shipmentId: shipment.id,
        milestone: STATUS_MILESTONE[input.status],
        status: input.status,
        location: input.location ?? null,
        description: input.description ?? null,
        source,
        reasonCode,
        attachments: attachments.length ? attachments : null,
        data: Object.keys(data).length ? data : null,
        actorUserId: "userId" in actor ? actor.userId : null,
        actorCompanyId: "companyId" in actor ? actor.companyId : null,
        externalKey: input.externalKey ?? null,
        occurredAt,
      })
      .onConflictDoNothing()
      .returning();
    if (!event) return null; // concurrent duplicate webhook

    const patch: Partial<typeof shipments.$inferInsert> = {};
    if (!stale) {
      patch.lastEventAt = occurredAt;
      patch.status = input.status;
      patch.exceptionReason = SIDE_STATUSES.has(input.status) ? reasonCode : null;
      if (input.status === "DEPARTED" && !shipment.actualDeparture) patch.actualDeparture = occurredAt;
      if (input.status === "AT_DESTINATION_PORT" && !shipment.actualArrival) patch.actualArrival = occurredAt;
      if (input.status === "DELIVERED") patch.deliveredAt = occurredAt;
    }
    if (input.receiverName) patch.receiverName = input.receiverName;
    if (input.podUrl) patch.podUrl = input.podUrl;
    if (input.packages != null) patch.packages = Math.trunc(input.packages);
    if (input.grossWeightKg != null) patch.grossWeightKg = input.grossWeightKg;
    if (input.volumeCbm != null) patch.volumeCbm = input.volumeCbm;
    if (input.vesselOrFlight) patch.vesselOrFlight = input.vesselOrFlight;
    if (input.containerNumber) patch.containerNumber = input.containerNumber;
    if (Object.keys(patch).length) await tx.update(shipments).set(patch).where(eq(shipments.id, shipment.id));

    if (statusChanges || person) {
      await tx.insert(orderEvents).values({
        orderId: order.id,
        type: "SHIPMENT",
        title: `${shipment.shipmentNumber}: ${human(input.status)}`,
        description: [who(actor, provider?.name), input.location, reasonCode ? human(reasonCode) : null, input.description].filter(Boolean).join(" · ") || null,
        actorId: "userId" in actor ? actor.userId : null,
        data: { shipmentId: shipment.id, shipmentEventId: event.id, status: input.status, reasonCode },
      });
    }
    return event;
  });
  if (!result) return { duplicate: true as const, changed: false, shipmentId: shipment.id };

  if (statusChanges) {
    await afterStatusChange({ actor, loaded, status: input.status, reasonCode, location: input.location ?? null, description: input.description ?? null, receiverName: input.receiverName ?? null });
  }
  await audit({
    actorId: "userId" in actor ? actor.userId : null,
    actorType: actor.kind === "ADMIN" ? "ADMIN" : actor.kind === "CARRIER" || (actor.kind === "PARTNER" && actor.via === "api") ? "API" : "USER",
    action: "shipment.event",
    entityType: "shipment",
    entityId: shipment.id,
    before: { status: shipment.status },
    after: { status: input.status, reasonCode, source, stale },
  });
  return { duplicate: false as const, changed: statusChanges, shipmentId: shipment.id, eventId: result.id };
}

async function afterStatusChange(ctx: { actor: ShipmentActor; loaded: Loaded; status: ShipmentStatus; reasonCode: string | null; location: string | null; description: string | null; receiverName: string | null }) {
  const { actor, loaded, status } = ctx;
  const { shipment, order, provider } = loaded;
  const flow = FLOWS[flowFor(shipment.mode)];
  const pickedUp = flow.indexOf(status) >= flow.indexOf("PICKED_UP");

  // Order lifecycle follows the goods.
  try {
    if (pickedUp && (order.statusCode === "PRODUCTION" || order.statusCode === "QUALITY_INSPECTION")) {
      await transitionOrder({ orderId: order.id, toStatus: "SHIPPING", actorUserId: null, actorSide: "SUPPLIER", note: `Shipment ${shipment.shipmentNumber} picked up${provider ? ` by ${provider.name}` : ""}.` });
    }
    if (status === "DELIVERED") {
      const siblings = await db.select({ status: shipments.status }).from(shipments).where(and(eq(shipments.orderId, order.id), ne(shipments.status, "CANCELLED")));
      const allDelivered = siblings.length > 0 && siblings.every((s) => s.status === "DELIVERED");
      const [fresh] = await db.select({ statusCode: orders.statusCode }).from(orders).where(eq(orders.id, order.id)).limit(1);
      if (allDelivered && fresh?.statusCode === "SHIPPING") {
        await transitionOrder({ orderId: order.id, toStatus: "DELIVERY", actorUserId: null, actorSide: "SUPPLIER", note: `All shipments delivered${ctx.receiverName ? ` — received by ${ctx.receiverName}` : ""}. Please inspect the goods and confirm receipt.` });
      }
    }
  } catch (err) {
    console.error("[shipments] order auto-transition skipped", err);
  }

  const alert = ALERT_STATUSES.has(status);
  const title = `Shipment ${shipment.shipmentNumber}: ${human(status)}`;
  const body = [who(actor, provider?.name), ctx.location, ctx.reasonCode ? human(ctx.reasonCode) : null, ctx.description].filter(Boolean).join(" · ") || undefined;
  const email = status === "DELIVERED" || alert;
  await notifyCompany(order.buyerCompanyId, { type: "SHIPMENT_UPDATE", title, body, link: `/buyer/shipments/${shipment.id}`, email });
  if (actor.kind !== "SELLER") await notifyCompany(order.supplierCompanyId, { type: "SHIPMENT_UPDATE", title, body, link: `/seller/shipments/${shipment.id}`, email });
  if (provider?.companyId && actor.kind !== "PARTNER" && (alert || status === "CANCELLED" || status === "READY_TO_PICK")) {
    await notifyCompany(provider.companyId, { type: "SHIPMENT_UPDATE", title, body, link: `/partner/shipments/${shipment.id}`, email: status === "CANCELLED" || status === "READY_TO_PICK" });
  }
}

/** Hand a shipment to a logistics partner (seller when booking, or admin re-assigning). */
export async function assignShipmentPartner(input: { shipmentId: string; providerId: string | null; actor: { kind: "SELLER"; userId: string; companyId: string } | { kind: "ADMIN"; userId: string } }) {
  const loaded = await loadShipment(input.shipmentId);
  if (!loaded) throw new ActionError("Shipment not found.", "NOT_FOUND");
  if (input.actor.kind === "SELLER" && loaded.order.supplierCompanyId !== input.actor.companyId) throw new ActionError("Shipment not found.", "NOT_FOUND");
  if (isTerminal(loaded.shipment.status)) throw new ActionError("This shipment is closed.", "INVALID_STATE");
  let provider: { id: string; name: string; companyId: string | null } | null = null;
  if (input.providerId) {
    const [p] = await db
      .select({ id: logisticsProviders.id, name: logisticsProviders.name, companyId: logisticsProviders.companyId })
      .from(logisticsProviders)
      .where(and(eq(logisticsProviders.id, input.providerId), eq(logisticsProviders.isActive, true)))
      .limit(1);
    if (!p) throw new ActionError("Choose an active logistics partner.", "VALIDATION", { providerId: ["Choose an active logistics partner"] });
    provider = p;
  }
  if ((provider?.id ?? null) === loaded.shipment.providerId) return loaded.shipment;
  const [row] = await db.update(shipments).set({ providerId: provider?.id ?? null, assignedAt: provider ? new Date() : null }).where(eq(shipments.id, loaded.shipment.id)).returning();
  await db.insert(orderEvents).values({
    orderId: loaded.order.id,
    type: "SHIPMENT",
    title: provider ? `${loaded.shipment.shipmentNumber} assigned to ${provider.name}` : `${loaded.shipment.shipmentNumber}: logistics partner removed`,
    actorId: input.actor.userId,
    data: { shipmentId: loaded.shipment.id, providerId: provider?.id ?? null },
  });
  if (provider?.companyId) {
    await notifyCompany(provider.companyId, {
      type: "SHIPMENT_ASSIGNED",
      title: `New shipment ${loaded.shipment.shipmentNumber} (order ${loaded.order.orderNumber})`,
      body: [loaded.shipment.mode.replace(/_/g, " "), loaded.shipment.originPort, loaded.shipment.destinationPort].filter(Boolean).join(" · ") || undefined,
      link: `/partner/shipments/${loaded.shipment.id}`,
      email: true,
    });
  }
  if (loaded.provider?.companyId && loaded.provider.companyId !== provider?.companyId) {
    await notifyCompany(loaded.provider.companyId, { type: "SHIPMENT_UPDATE", title: `Shipment ${loaded.shipment.shipmentNumber} was reassigned`, link: `/partner/shipments`, email: true });
  }
  await audit({ actorId: input.actor.userId, actorType: input.actor.kind === "ADMIN" ? "ADMIN" : "USER", action: "shipment.assign", entityType: "shipment", entityId: loaded.shipment.id, before: { providerId: loaded.shipment.providerId }, after: { providerId: provider?.id ?? null } });
  return row;
}

/** Carrier + tracking number (+ optional transport details) set by the partner, supplier or admin. */
export async function setShipmentTracking(actor: ShipmentActor, input: { shipmentId: string; carrierCode: string | null; carrier?: string | null; trackingNumber: string | null; vesselOrFlight?: string | null; containerNumber?: string | null; etd?: Date | null; eta?: Date | null }) {
  const loaded = await loadShipment(input.shipmentId);
  if (!loaded) throw new ActionError("Shipment not found.", "NOT_FOUND");
  assertAccess(actor, loaded);
  const { shipment, order } = loaded;
  const carrierName = input.carrier ?? (input.carrierCode && input.carrierCode !== "OTHER" ? carrierByCode(input.carrierCode)?.name : null) ?? shipment.carrier;
  const patch: Partial<typeof shipments.$inferInsert> = {
    carrierCode: input.carrierCode,
    carrier: carrierName ?? null,
    trackingNumber: input.trackingNumber,
    trackingSyncError: null,
  };
  if (input.vesselOrFlight !== undefined) patch.vesselOrFlight = input.vesselOrFlight;
  if (input.containerNumber !== undefined) patch.containerNumber = input.containerNumber;
  if (input.etd !== undefined) patch.etd = input.etd;
  if (input.eta !== undefined) patch.eta = input.eta;
  const [row] = await db.update(shipments).set(patch).where(eq(shipments.id, shipment.id)).returning();
  const trackingChanged = shipment.trackingNumber !== row.trackingNumber || shipment.carrierCode !== row.carrierCode;
  const etaChanged = (shipment.eta?.getTime() ?? 0) !== (row.eta?.getTime() ?? 0);
  if (trackingChanged || etaChanged) {
    const body = [row.carrier, row.trackingNumber ? `Tracking ${row.trackingNumber}` : null, etaChanged && row.eta ? `ETA ${row.eta.toISOString().slice(0, 10)}` : null].filter(Boolean).join(" · ") || undefined;
    await db.insert(orderEvents).values({ orderId: order.id, type: "SHIPMENT", title: `${shipment.shipmentNumber}: tracking updated`, description: body ?? null, actorId: "userId" in actor ? actor.userId : null, data: { shipmentId: shipment.id } });
    await notifyCompany(order.buyerCompanyId, { type: "SHIPMENT_UPDATE", title: `Shipment ${shipment.shipmentNumber} updated`, body, link: `/buyer/shipments/${shipment.id}`, email: false });
    if (actor.kind !== "SELLER") await notifyCompany(order.supplierCompanyId, { type: "SHIPMENT_UPDATE", title: `Shipment ${shipment.shipmentNumber} updated`, body, link: `/seller/shipments/${shipment.id}`, email: false });
  }
  await audit({ actorId: "userId" in actor ? actor.userId : null, action: "shipment.tracking", entityType: "shipment", entityId: shipment.id, before: { carrierCode: shipment.carrierCode, trackingNumber: shipment.trackingNumber }, after: { carrierCode: row.carrierCode, trackingNumber: row.trackingNumber } });
  return row;
}

/** Credentials for a carrier: the assigned provider's apiConfig[carrier] first, then a provider whose adapter is that carrier. */
async function carrierConfig(carrierCode: string, provider: { apiConfig: Record<string, unknown> | null } | null): Promise<Record<string, unknown>> {
  const own = provider?.apiConfig?.[carrierCode.toLowerCase()] ?? provider?.apiConfig?.[carrierCode];
  if (own && typeof own === "object") return own as Record<string, unknown>;
  const [p] = await db
    .select({ apiConfig: logisticsProviders.apiConfig })
    .from(logisticsProviders)
    .where(and(eq(logisticsProviders.adapterCode, carrierCode.toLowerCase()), eq(logisticsProviders.isActive, true)))
    .limit(1);
  return (p?.apiConfig as Record<string, unknown> | null) ?? {};
}

/** Apply carrier events (from a webhook or a sync) to the shipment with that tracking number. */
export async function ingestCarrierEvents(carrierCode: string, trackingNumber: string, events: MappedCarrierEvent[], source: "webhook" | "carrier-sync", opts: { providerId?: string } = {}) {
  const matches = await db
    .select({ id: shipments.id })
    .from(shipments)
    .where(and(eq(shipments.carrierCode, carrierCode), eq(shipments.trackingNumber, trackingNumber), opts.providerId ? eq(shipments.providerId, opts.providerId) : undefined))
    .orderBy(desc(shipments.createdAt))
    .limit(1);
  const target = matches[0];
  if (!target) return { matched: false, applied: 0 };
  let applied = 0;
  for (const e of [...events].sort((a, b) => a.occurredAt.getTime() - b.occurredAt.getTime())) {
    const loaded = await loadShipment(target.id);
    if (!loaded) break;
    const status = e.status ?? (loaded.shipment.status as ShipmentStatus); // informational → checkpoint on the current status
    const res = await applyShipmentUpdate(
      { kind: "CARRIER", carrierCode, source },
      {
        shipmentId: target.id,
        status,
        reasonCode: e.reasonCode,
        location: e.location,
        description: e.description ?? `${carrierByCode(carrierCode)?.name ?? carrierCode}: ${e.carrierStatus}`,
        occurredAt: e.occurredAt > new Date() ? new Date() : e.occurredAt,
        grossWeightKg: e.weightKg,
        externalKey: carrierEventKey(carrierCode, trackingNumber, e),
        data: { carrierStatus: e.carrierStatus, raw: e.raw },
      },
    );
    if (!res.duplicate) applied++;
  }
  await db.update(shipments).set({ trackingSyncedAt: new Date(), trackingSyncError: null }).where(eq(shipments.id, target.id));
  return { matched: true, applied };
}

/** Pull the latest status from the carrier's API ("sync by tracking number"). */
export async function syncShipmentTracking(shipmentId: string) {
  const loaded = await loadShipment(shipmentId);
  if (!loaded) throw new ActionError("Shipment not found.", "NOT_FOUND");
  const { shipment, provider } = loaded;
  if (!shipment.carrierCode || !shipment.trackingNumber) throw new ActionError("Add the carrier and tracking number first.", "INVALID_STATE");
  if (!carrierByCode(shipment.carrierCode)?.auto) throw new ActionError("Automatic tracking is available for GHN and GHTK. Update this shipment manually.", "INVALID_STATE");
  try {
    const config = await carrierConfig(shipment.carrierCode, provider);
    const events = await fetchCarrierHistory(shipment.carrierCode, shipment.trackingNumber, config);
    return await ingestCarrierEvents(shipment.carrierCode, shipment.trackingNumber, events, "carrier-sync");
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await db.update(shipments).set({ trackingSyncedAt: new Date(), trackingSyncError: message.slice(0, 300) }).where(eq(shipments.id, shipment.id));
    throw new ActionError(message, "INVALID_STATE");
  }
}

/** Open shipments with an automatic carrier, for the periodic sync (/api/logistics/sync). */
export async function shipmentsToSync(limit = 50) {
  const rows = await db
    .select({ id: shipments.id, status: shipments.status, carrierCode: shipments.carrierCode })
    .from(shipments)
    .where(and(isNotNull(shipments.trackingNumber), inArray(shipments.carrierCode, ["GHN", "GHTK"])))
    .orderBy(asc(shipments.trackingSyncedAt))
    .limit(limit * 3);
  return rows.filter((r) => !isTerminal(r.status)).slice(0, limit);
}

/** Company is an active logistics partner with a linked provider row. */
export async function partnerProviderFor(companyId: string) {
  const [row] = await db
    .select({ provider: logisticsProviders, company: { id: companies.id, name: companies.name, isLogisticsPartner: companies.isLogisticsPartner } })
    .from(logisticsProviders)
    .innerJoin(companies, eq(companies.id, logisticsProviders.companyId))
    .where(eq(logisticsProviders.companyId, companyId))
    .limit(1);
  return row ?? null;
}

/**
 * Link uploaded files (POD photo, B/L, customs declaration…) to a shipment so the buyer, supplier and
 * assigned partner can open them. Only files uploaded by this company can be attached.
 */
export async function attachShipmentDocuments(input: { shipmentId: string; documentIds: string[]; ownerCompanyId: string; kind?: string }): Promise<Attachment[]> {
  const ids = [...new Set(input.documentIds.filter(Boolean))].slice(0, 10);
  if (!ids.length) return [];
  const [ship] = await db.select({ orderId: shipments.orderId }).from(shipments).where(eq(shipments.id, input.shipmentId)).limit(1);
  if (!ship) return [];
  const docs = await db
    .select({ id: documents.id, url: documents.url, name: documents.name, mimeType: documents.mimeType })
    .from(documents)
    .where(and(inArray(documents.id, ids), eq(documents.ownerCompanyId, input.ownerCompanyId)));
  if (!docs.length) return [];
  await db
    .update(documents)
    .set({ shipmentId: input.shipmentId, orderId: ship.orderId, visibility: "COUNTERPARTY", type: input.kind === "POD" ? "PHOTO" : undefined })
    .where(inArray(documents.id, docs.map((d) => d.id)));
  return docs.map((d) => ({ url: d.url, name: d.name, kind: input.kind ?? (d.mimeType?.startsWith("image/") ? "PHOTO" : "DOCUMENT") }));
}
