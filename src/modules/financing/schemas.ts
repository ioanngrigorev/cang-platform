import { z } from "zod";

/** Products a buyer can apply for (seller-side products are excluded from this form). */
export const BUYER_FINANCING_PRODUCTS = ["IMPORT_FINANCING", "PURCHASE_FINANCING", "BNPL", "WORKING_CAPITAL"] as const;

const money = z
  .union([z.string(), z.number()])
  .transform((v) => {
    const n = typeof v === "number" ? v : Number(String(v).replace(/,/g, ""));
    return Number.isFinite(n) ? n : NaN;
  })
  .refine((n) => !Number.isNaN(n) && n > 0, "Enter the amount you need");

const optionalMoney = z
  .union([z.string(), z.number()])
  .optional()
  .transform((v) => {
    if (v === undefined || v === "" || v === null) return null;
    const n = typeof v === "number" ? v : Number(String(v).replace(/,/g, ""));
    return Number.isFinite(n) ? n : NaN;
  })
  .refine((n) => n === null || (!Number.isNaN(n) && n >= 0), "Enter a valid amount");

export const financingApplicationSchema = z.object({
  orderId: z
    .string()
    .trim()
    .optional()
    .transform((v) => (v ? v : null)),
  productType: z.enum(BUYER_FINANCING_PRODUCTS),
  amount: money,
  currency: z.enum(["USD", "VND", "EUR"]).default("USD"),
  requestedTenorDays: z.coerce.number().int().min(15, "Minimum 15 days").max(365, "Maximum 365 days"),
  purpose: z
    .string()
    .trim()
    .max(1000)
    .optional()
    .transform((v) => (v ? v : null)),
  annualRevenue: optionalMoney,
  receivables: optionalMoney,
  notes: z
    .string()
    .trim()
    .max(2000)
    .optional()
    .transform((v) => (v ? v : null)),
  documentIds: z
    .union([z.string(), z.array(z.string())])
    .optional()
    .transform((v) => (v === undefined ? [] : Array.isArray(v) ? v : [v]))
    .transform((v) => v.map((s) => s.trim()).filter(Boolean)),
  consent: z
    .union([z.literal("on"), z.literal("true"), z.boolean()])
    .refine((v) => v === "on" || v === "true" || v === true, "You must authorise us to share your data with the partner"),
});
export type FinancingApplicationFormInput = z.infer<typeof financingApplicationSchema>;

export const acceptOfferSchema = z.object({ applicationId: z.string().min(1), offerId: z.string().min(1) });
export const applicationIdSchema = z.object({ applicationId: z.string().min(1) });
