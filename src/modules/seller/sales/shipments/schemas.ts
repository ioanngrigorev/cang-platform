import { z } from "zod";
import { SHIPMENT_MODES } from "@/modules/logistics/schemas";

export { SHIPMENT_MODES };

/** Statuses a supplier can report on a shipment, in lifecycle order. */
export const SHIPMENT_EVENT_STATUSES = [
  "BOOKED",
  "PICKED_UP",
  "AT_WAREHOUSE",
  "AT_ORIGIN_PORT",
  "DEPARTED",
  "IN_TRANSIT",
  "AT_DESTINATION_PORT",
  "CUSTOMS_CLEARANCE",
  "OUT_FOR_DELIVERY",
  "DELIVERED",
  "EXCEPTION",
  "CANCELLED",
] as const;
export type ShipmentEventStatus = (typeof SHIPMENT_EVENT_STATUSES)[number];

/** shipment_events.milestone for each reported status (matches the canonical stepper chain). */
export const STATUS_MILESTONE: Record<ShipmentEventStatus, string> = {
  BOOKED: "FACTORY",
  PICKED_UP: "PICKUP",
  AT_WAREHOUSE: "WAREHOUSE",
  AT_ORIGIN_PORT: "ORIGIN_PORT",
  DEPARTED: "DEPARTED",
  IN_TRANSIT: "IN_TRANSIT",
  AT_DESTINATION_PORT: "DESTINATION_PORT",
  CUSTOMS_CLEARANCE: "CUSTOMS",
  OUT_FOR_DELIVERY: "LAST_MILE",
  DELIVERED: "DELIVERED",
  EXCEPTION: "EXCEPTION",
  CANCELLED: "CANCELLED",
};

/** Orders a shipment can be created for. */
export const SHIPPABLE_ORDER_STATUSES = ["PRODUCTION", "QUALITY_INSPECTION", "SHIPPING"];

const optionalText = (max = 2000) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((v) => (v ? v : null));

const optionalNumber = z
  .union([z.string(), z.number()])
  .optional()
  .transform((v) => {
    if (v === undefined || v === "" || v === null) return null;
    const n = typeof v === "number" ? v : Number(String(v).replace(/,/g, ""));
    return Number.isFinite(n) ? n : NaN;
  })
  .refine((n) => n === null || (!Number.isNaN(n) && n >= 0), "Enter a valid number");

const optionalDate = z
  .string()
  .trim()
  .optional()
  .transform((v) => (v ? new Date(v) : null))
  .refine((d) => d === null || !Number.isNaN(d.getTime()), "Enter a valid date");

export const shipmentFieldsSchema = z.object({
  mode: z.enum(SHIPMENT_MODES).default("SEA_FCL"),
  carrier: optionalText(120),
  trackingNumber: optionalText(120),
  vesselOrFlight: optionalText(120),
  containerNumber: optionalText(60),
  originPort: optionalText(120),
  destinationPort: optionalText(120),
  packages: optionalNumber,
  grossWeightKg: optionalNumber,
  volumeCbm: optionalNumber,
  etd: optionalDate,
  eta: optionalDate,
  notes: optionalText(2000),
});

export const createShipmentSchema = shipmentFieldsSchema.extend({
  orderId: z.string().min(1, "Choose an order"),
});
export type CreateShipmentInput = z.infer<typeof createShipmentSchema>;

export const updateShipmentSchema = shipmentFieldsSchema.extend({
  shipmentId: z.string().min(1),
});
export type UpdateShipmentInput = z.infer<typeof updateShipmentSchema>;

export const shipmentEventSchema = z.object({
  shipmentId: z.string().min(1),
  status: z.enum(SHIPMENT_EVENT_STATUSES),
  location: optionalText(200),
  description: optionalText(1000),
  occurredAt: optionalDate,
});
export type ShipmentEventInput = z.infer<typeof shipmentEventSchema>;
