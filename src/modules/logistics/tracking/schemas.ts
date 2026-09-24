import { z } from "zod";
import { CARRIERS } from "./carriers";
import { REASON_CODES, SHIPMENT_STATUSES } from "./statuses";

export const optionalText = (max = 2000) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((v) => (v ? v : null));

export const optionalNumber = z
  .union([z.string(), z.number()])
  .optional()
  .transform((v) => {
    if (v === undefined || v === "" || v === null) return null;
    const n = typeof v === "number" ? v : Number(String(v).replace(/,/g, ""));
    return Number.isFinite(n) ? n : NaN;
  })
  .refine((n) => n === null || (!Number.isNaN(n) && n >= 0), "Enter a valid number");

export const optionalDate = z
  .string()
  .trim()
  .optional()
  .transform((v) => (v ? new Date(v) : null))
  .refine((d) => d === null || !Number.isNaN(d.getTime()), "Enter a valid date");

export const optionalCarrierCode = z
  .string()
  .trim()
  .optional()
  .transform((v) => (v ? v : null))
  .refine((v) => v === null || CARRIERS.some((c) => c.code === v), "Choose a carrier");

/** A status report (seller, partner portal, admin). Which statuses are allowed is checked by the tracking service. */
export const shipmentUpdateSchema = z.object({
  shipmentId: z.string().min(1),
  status: z.enum(SHIPMENT_STATUSES),
  reasonCode: z
    .string()
    .trim()
    .optional()
    .transform((v) => (v ? v : null))
    .refine((v) => v === null || (REASON_CODES as string[]).includes(v), "Choose a reason"),
  location: optionalText(200),
  description: optionalText(1000),
  occurredAt: optionalDate,
  receiverName: optionalText(160),
  podUrl: optionalText(500),
  packages: optionalNumber,
  grossWeightKg: optionalNumber,
  vehiclePlate: optionalText(40),
  driverName: optionalText(120),
  driverPhone: optionalText(40),
  vesselOrFlight: optionalText(120),
  containerNumber: optionalText(60),
  customsDeclaration: optionalText(60),
});
export type ShipmentUpdateFormInput = z.infer<typeof shipmentUpdateSchema>;

export const shipmentTrackingSchema = z.object({
  shipmentId: z.string().min(1),
  carrierCode: optionalCarrierCode,
  carrier: optionalText(120),
  trackingNumber: optionalText(120),
  vesselOrFlight: optionalText(120),
  containerNumber: optionalText(60),
  etd: optionalDate,
  eta: optionalDate,
});
export type ShipmentTrackingInput = z.infer<typeof shipmentTrackingSchema>;
