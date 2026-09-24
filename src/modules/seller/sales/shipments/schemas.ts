import { z } from "zod";
import { SHIPMENT_MODES } from "@/modules/logistics/schemas";
import { optionalCarrierCode, optionalDate, optionalNumber, optionalText, shipmentUpdateSchema } from "@/modules/logistics/tracking/schemas";
import { SHIPMENT_STATUSES, STATUS_MILESTONE, type ShipmentStatus } from "@/modules/logistics/tracking/statuses";

export { SHIPMENT_MODES };

/** Every shipment status (the pickers only offer the ones allowed next — see modules/logistics/tracking/statuses.ts). */
export const SHIPMENT_EVENT_STATUSES = SHIPMENT_STATUSES;
export type ShipmentEventStatus = ShipmentStatus;
export { STATUS_MILESTONE };

/** Orders a shipment can be created for. */
export const SHIPPABLE_ORDER_STATUSES = ["PRODUCTION", "QUALITY_INSPECTION", "SHIPPING"];

export const shipmentFieldsSchema = z.object({
  mode: z.enum(SHIPMENT_MODES).default("SEA_FCL"),
  carrier: optionalText(120),
  carrierCode: optionalCarrierCode,
  providerId: optionalText(60),
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

export const shipmentEventSchema = shipmentUpdateSchema;
export type ShipmentEventInput = z.infer<typeof shipmentEventSchema>;
