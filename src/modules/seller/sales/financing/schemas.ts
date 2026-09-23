import { z } from "zod";

/** Products a supplier can apply for (working capital against orders and receivables). */
export const SELLER_FINANCING_PRODUCTS = ["PRODUCTION_FINANCING", "PURCHASE_ORDER_FINANCING", "INVOICE_FACTORING", "RECEIVABLES_FINANCING", "WORKING_CAPITAL"] as const;
export type SellerFinancingProduct = (typeof SELLER_FINANCING_PRODUCTS)[number];

/** Orders a production loan can be raised against. */
export const FINANCEABLE_ORDER_STATUSES = ["PAYMENT", "PRODUCTION", "QUALITY_INSPECTION", "SHIPPING"];

const money = z
  .union([z.string(), z.number()])
  .transform((v) => {
    const n = typeof v === "number" ? v : Number(String(v).replace(/,/g, ""));
    return Number.isFinite(n) ? n : NaN;
  })
  .refine((n) => !Number.isNaN(n) && n > 0, "Enter the amount you need");

export const sellerFinancingSchema = z.object({
  orderId: z
    .string()
    .trim()
    .optional()
    .transform((v) => (v ? v : null)),
  productType: z.enum(SELLER_FINANCING_PRODUCTS),
  amount: money,
  currency: z.enum(["USD", "VND", "EUR"]).default("USD"),
  requestedTenorDays: z.coerce.number().int().min(15, "Minimum 15 days").max(365, "Maximum 365 days"),
  purpose: z
    .string()
    .trim()
    .max(1000)
    .optional()
    .transform((v) => (v ? v : null)),
  consent: z
    .union([z.literal("on"), z.literal("true"), z.boolean()])
    .refine((v) => v === "on" || v === "true" || v === true, "You must authorise us to share your data with the partner"),
});
export type SellerFinancingInput = z.infer<typeof sellerFinancingSchema>;
