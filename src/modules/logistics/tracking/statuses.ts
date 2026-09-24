/**
 * Shipment status model shared by sellers, logistics partners, carriers (webhook / tracking sync) and admins.
 *
 * Three flows, picked by shipment mode:
 *  - PARCEL  (COURIER): domestic express like GHN / GHTK / Viettel Post / J&T.
 *  - TRUCK   (ROAD): full / part truckload from the factory gate.
 *  - FREIGHT (SEA / AIR / RAIL / MULTIMODAL): export milestones (booking → customs → port → vessel → import → delivery).
 *
 * Progress statuses advance along the flow (skipping ahead is allowed: partners often report late).
 * Side statuses (failures, holds, returns, loss) can be entered from the progress state they apply to,
 * and carry a reason code. Pure module: safe to import from client components.
 */

export const SHIPMENT_STATUSES = [
  "PENDING",
  "BOOKED",
  "READY_TO_PICK",
  "VEHICLE_ASSIGNED",
  "PICKUP_FAILED",
  "PICKED_UP",
  "AT_WAREHOUSE",
  "EXPORT_CLEARED",
  "AT_ORIGIN_PORT",
  "DEPARTED",
  "IN_TRANSIT",
  "AT_DESTINATION_PORT",
  "CUSTOMS_CLEARANCE",
  "IMPORT_CLEARED",
  "OUT_FOR_DELIVERY",
  "DELIVERY_FAILED",
  "DELIVERED",
  "EXCEPTION",
  "RETURNING",
  "RETURNED",
  "LOST",
  "DAMAGED",
  "CANCELLED",
] as const;
export type ShipmentStatus = (typeof SHIPMENT_STATUSES)[number];

export const SHIPMENT_MODES = ["SEA_FCL", "SEA_LCL", "AIR", "RAIL", "ROAD", "COURIER", "MULTIMODAL"] as const;
export type ShipmentMode = (typeof SHIPMENT_MODES)[number];

export type FlowKind = "PARCEL" | "TRUCK" | "FREIGHT";

export function flowFor(mode: string | null | undefined): FlowKind {
  if (mode === "COURIER") return "PARCEL";
  if (mode === "ROAD") return "TRUCK";
  return "FREIGHT";
}

/** Progress statuses in order, per flow. */
export const FLOWS: Record<FlowKind, ShipmentStatus[]> = {
  PARCEL: ["BOOKED", "READY_TO_PICK", "PICKED_UP", "AT_WAREHOUSE", "IN_TRANSIT", "OUT_FOR_DELIVERY", "DELIVERED"],
  TRUCK: ["BOOKED", "READY_TO_PICK", "VEHICLE_ASSIGNED", "PICKED_UP", "IN_TRANSIT", "OUT_FOR_DELIVERY", "DELIVERED"],
  FREIGHT: ["BOOKED", "READY_TO_PICK", "PICKED_UP", "AT_WAREHOUSE", "EXPORT_CLEARED", "AT_ORIGIN_PORT", "DEPARTED", "IN_TRANSIT", "AT_DESTINATION_PORT", "CUSTOMS_CLEARANCE", "IMPORT_CLEARED", "OUT_FOR_DELIVERY", "DELIVERED"],
};

export const TERMINAL_STATUSES: ReadonlySet<ShipmentStatus> = new Set(["DELIVERED", "RETURNED", "LOST", "DAMAGED", "CANCELLED"]);
export const SIDE_STATUSES: ReadonlySet<ShipmentStatus> = new Set(["PICKUP_FAILED", "DELIVERY_FAILED", "EXCEPTION", "RETURNING", "RETURNED", "LOST", "DAMAGED", "CANCELLED"]);
/** Statuses that need a reason code when reported by a person. */
export const REASON_REQUIRED: ReadonlySet<ShipmentStatus> = new Set(["PICKUP_FAILED", "DELIVERY_FAILED", "EXCEPTION", "RETURNING", "LOST", "DAMAGED"]);
/** Problem states surfaced as alerts to buyer, seller and admin. */
export const ALERT_STATUSES: ReadonlySet<ShipmentStatus> = new Set(["PICKUP_FAILED", "DELIVERY_FAILED", "EXCEPTION", "RETURNING", "RETURNED", "LOST", "DAMAGED"]);

export function isTerminal(status: string): boolean {
  return TERMINAL_STATUSES.has(status as ShipmentStatus);
}

/** Legacy milestone code stored in shipment_events.milestone (kept for reports and older timelines). */
export const STATUS_MILESTONE: Record<ShipmentStatus, string> = {
  PENDING: "FACTORY",
  BOOKED: "FACTORY",
  READY_TO_PICK: "FACTORY",
  VEHICLE_ASSIGNED: "FACTORY",
  PICKUP_FAILED: "PICKUP",
  PICKED_UP: "PICKUP",
  AT_WAREHOUSE: "WAREHOUSE",
  EXPORT_CLEARED: "CUSTOMS",
  AT_ORIGIN_PORT: "ORIGIN_PORT",
  DEPARTED: "DEPARTED",
  IN_TRANSIT: "IN_TRANSIT",
  AT_DESTINATION_PORT: "DESTINATION_PORT",
  CUSTOMS_CLEARANCE: "CUSTOMS",
  IMPORT_CLEARED: "CUSTOMS",
  OUT_FOR_DELIVERY: "LAST_MILE",
  DELIVERY_FAILED: "LAST_MILE",
  DELIVERED: "DELIVERED",
  EXCEPTION: "EXCEPTION",
  RETURNING: "RETURN",
  RETURNED: "RETURN",
  LOST: "EXCEPTION",
  DAMAGED: "EXCEPTION",
  CANCELLED: "CANCELLED",
};

/** Reason codes, grouped for the pickers. Labels live in messages tracking.reasons.<CODE>. */
export const REASON_GROUPS = {
  pickup: ["SENDER_RESCHEDULED", "SENDER_UNREACHABLE", "CARGO_NOT_READY", "WRONG_PICKUP_INFO", "PACKAGING_VIOLATION", "PROHIBITED_GOODS", "CARRIER_OVERLOAD", "WEATHER"],
  delivery: ["RECEIVER_RESCHEDULED", "RECEIVER_UNREACHABLE", "WRONG_ADDRESS", "ADDRESS_CHANGED", "REFUSED_WRONG_ITEM", "REFUSED_DAMAGED", "REFUSED_COD", "REFUSED_CHANGED_MIND", "CONSIGNEE_CLOSED", "DAMAGED_IN_TRANSIT"],
  freight: ["WEIGHT_DISCREPANCY", "CUSTOMS_INSPECTION", "MISSING_DOCUMENTS", "ROLLED_OVER", "PORT_CONGESTION"],
  return: ["SENDER_REFUSED_RETURN"],
  other: ["OTHER"],
} as const;
export type ReasonCode = (typeof REASON_GROUPS)[keyof typeof REASON_GROUPS][number];
export const REASON_CODES: ReasonCode[] = Object.values(REASON_GROUPS).flat() as ReasonCode[];

/** Which reason groups make sense for a status (the picker shows these first, "other" always last). */
export function reasonGroupsFor(status: ShipmentStatus): Array<keyof typeof REASON_GROUPS> {
  switch (status) {
    case "PICKUP_FAILED":
      return ["pickup", "other"];
    case "DELIVERY_FAILED":
    case "RETURNING":
      return ["delivery", "return", "other"];
    case "EXCEPTION":
      return ["freight", "delivery", "pickup", "other"];
    case "LOST":
    case "DAMAGED":
      return ["delivery", "freight", "other"];
    case "CANCELLED":
      return ["pickup", "other"];
    default:
      return ["other"];
  }
}

export type ActorKind = "SELLER" | "PARTNER" | "CARRIER" | "ADMIN";

/**
 * Statuses the actor may report next.
 * @param current current shipment status
 * @param progress furthest progress status reached so far (from events), used to resume after holds
 * @param managedByPartner a platform logistics partner is assigned: the seller then only books / hands over / cancels
 */
export function allowedNextStatuses(opts: { mode: string | null | undefined; current: string; progress: string | null; actor: ActorKind; managedByPartner: boolean }): ShipmentStatus[] {
  const flow = FLOWS[flowFor(opts.mode)];
  const current = opts.current as ShipmentStatus;
  if (opts.actor === "ADMIN") return SHIPMENT_STATUSES.filter((s) => s !== "PENDING");
  if (isTerminal(current)) return [];

  const progress = (opts.progress && flow.includes(opts.progress as ShipmentStatus) ? opts.progress : flow.includes(current) ? current : "BOOKED") as ShipmentStatus;
  const at = flow.indexOf(progress);
  const pickedUpAt = flow.indexOf("PICKED_UP");
  const pickedUp = at >= pickedUpAt;
  const out = new Set<ShipmentStatus>();

  // Forward along the flow (a checkpoint may re-report the current in-transit style status).
  const checkpointable: ShipmentStatus[] = ["AT_WAREHOUSE", "IN_TRANSIT", "OUT_FOR_DELIVERY", "CUSTOMS_CLEARANCE"];
  const resumingFromHold = current === "EXCEPTION";
  flow.forEach((s, i) => {
    if (i > at || (i === at && (resumingFromHold || (checkpointable.includes(s) && current === s)))) out.add(s);
  });

  switch (current) {
    case "PICKUP_FAILED":
      out.clear();
      ["READY_TO_PICK", "VEHICLE_ASSIGNED", "PICKED_UP"].forEach((s) => flow.includes(s as ShipmentStatus) && out.add(s as ShipmentStatus));
      break;
    case "DELIVERY_FAILED":
      out.clear();
      ["AT_WAREHOUSE", "OUT_FOR_DELIVERY", "DELIVERED", "RETURNING"].forEach((s) => (flow.includes(s as ShipmentStatus) || s === "RETURNING") && out.add(s as ShipmentStatus));
      break;
    case "RETURNING":
      out.clear();
      out.add("RETURNED");
      break;
    default:
      break;
  }

  if (!pickedUp && current !== "PICKUP_FAILED" && at >= flow.indexOf("BOOKED")) out.add("PICKUP_FAILED");
  if (current === "OUT_FOR_DELIVERY") out.add("DELIVERY_FAILED");
  if (current !== "EXCEPTION") out.add("EXCEPTION");
  if (pickedUp && current !== "RETURNING") out.add("RETURNING");
  if (pickedUp) {
    out.add("LOST");
    out.add("DAMAGED");
  }
  if (!pickedUp) out.add("CANCELLED");

  let list = SHIPMENT_STATUSES.filter((s) => out.has(s));
  if (opts.actor === "PARTNER") list = list.filter((s) => s !== "CANCELLED");
  if (opts.actor === "SELLER" && opts.managedByPartner) list = list.filter((s) => s === "READY_TO_PICK" || s === "CANCELLED");
  return list;
}

/** Furthest progress status reached, given the status history (most recent last or any order). */
export function furthestProgress(mode: string | null | undefined, statuses: string[]): ShipmentStatus | null {
  const flow = FLOWS[flowFor(mode)];
  let best = -1;
  for (const s of statuses) best = Math.max(best, flow.indexOf(s as ShipmentStatus));
  return best >= 0 ? flow[best] : null;
}

/** Badge colour for a status. */
export function statusTone(status: string): "success" | "danger" | "warning" | "info" | "steel" {
  if (status === "DELIVERED") return "success";
  if (["LOST", "DAMAGED", "RETURNED", "CANCELLED"].includes(status)) return status === "CANCELLED" ? "steel" : "danger";
  if (ALERT_STATUSES.has(status as ShipmentStatus)) return "warning";
  if (status === "PENDING" || status === "BOOKED") return "steel";
  return "info";
}
