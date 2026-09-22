import { z } from "zod";
import type { Address } from "@/db/schema/orders";

export const LOGISTICS_SERVICES = [
  "FACTORY_PICKUP",
  "DOMESTIC_TRANSPORT",
  "WAREHOUSING",
  "FREIGHT_FORWARDING",
  "SEA_FREIGHT",
  "AIR_FREIGHT",
  "RAIL_FREIGHT",
  "CUSTOMS_BROKERAGE",
  "LAST_MILE",
  "CARGO_INSURANCE",
] as const;

export const SHIPMENT_MODES = ["SEA_FCL", "SEA_LCL", "AIR", "RAIL", "ROAD", "COURIER", "MULTIMODAL"] as const;

export const CONTAINER_TYPES = ["20GP", "40GP", "40HQ", "45HQ", "LCL", "REEFER_20", "REEFER_40"] as const;

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

const serviceList = z
  .union([z.string(), z.array(z.string())])
  .transform((v) => (Array.isArray(v) ? v : [v]))
  .transform((v) => v.map((s) => s.trim()).filter(Boolean))
  .pipe(z.array(z.enum(LOGISTICS_SERVICES)).min(1, "Choose at least one service"));

/** FormData is flat, so addresses use prefixed field names (originLine1, destinationCity …). */
export const logisticsRequestSchema = z.object({
  orderId: z
    .string()
    .trim()
    .optional()
    .transform((v) => (v ? v : null)),
  services: serviceList,
  preferredMode: z
    .enum(SHIPMENT_MODES)
    .or(z.literal(""))
    .optional()
    .transform((v) => (v ? v : null)),
  incoterm: z
    .string()
    .trim()
    .optional()
    .transform((v) => (v ? v : null)),

  originCompany: optionalText(200),
  originLine1: z.string().trim().min(3, "Enter the pickup address").max(200),
  originCity: z.string().trim().min(1, "Enter the pickup city").max(120),
  originPostalCode: optionalText(20),
  originCountryCode: z.string().trim().length(2, "Select a country").toUpperCase(),

  destinationCompany: optionalText(200),
  destinationLine1: z.string().trim().min(3, "Enter the delivery address").max(200),
  destinationCity: z.string().trim().min(1, "Enter the delivery city").max(120),
  destinationPostalCode: optionalText(20),
  destinationCountryCode: z.string().trim().length(2, "Select a country").toUpperCase(),

  cargoDescription: z.string().trim().min(5, "Describe the cargo").max(2000),
  hsCode: optionalText(40),
  packages: optionalNumber,
  grossWeightKg: optionalNumber,
  volumeCbm: optionalNumber,
  containerType: z
    .string()
    .trim()
    .optional()
    .transform((v) => (v ? v : null)),
  cargoValue: optionalNumber,
  currency: z.enum(["USD", "VND", "EUR"]).default("USD"),
  insuranceRequired: z
    .union([z.literal("on"), z.literal("true"), z.literal("false"), z.boolean()])
    .optional()
    .transform((v) => v === "on" || v === "true" || v === true),
  readyDate: optionalDate,
  requiredDeliveryDate: optionalDate,
  quoteDeadline: optionalDate,
  notes: optionalText(2000),
});
export type LogisticsRequestInput = z.infer<typeof logisticsRequestSchema>;

export function originAddressOf(input: LogisticsRequestInput): Address {
  return {
    company: input.originCompany ?? undefined,
    line1: input.originLine1,
    city: input.originCity,
    postalCode: input.originPostalCode ?? undefined,
    countryCode: input.originCountryCode,
  };
}

export function destinationAddressOf(input: LogisticsRequestInput): Address {
  return {
    company: input.destinationCompany ?? undefined,
    line1: input.destinationLine1,
    city: input.destinationCity,
    postalCode: input.destinationPostalCode ?? undefined,
    countryCode: input.destinationCountryCode,
  };
}

export const acceptLogisticsQuoteSchema = z.object({
  requestId: z.string().min(1),
  quoteId: z.string().min(1),
});

export const logisticsRequestIdSchema = z.object({ requestId: z.string().min(1) });
