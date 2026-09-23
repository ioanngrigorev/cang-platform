import { z } from "zod";
import { INCOTERMS, RFQ_CURRENCIES } from "@/modules/rfq/schemas";

export const QUOTATION_TABS = ["all", "draft", "submitted", "under_review", "revised", "accepted", "rejected", "expired", "withdrawn"] as const;
export type QuotationTab = (typeof QUOTATION_TABS)[number];

const optionalText = (max = 4000) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((v) => (v ? v : null));

const money = (message: string) =>
  z
    .union([z.string(), z.number()])
    .transform((v) => {
      const n = typeof v === "number" ? v : Number(String(v).replace(/,/g, ""));
      return Number.isFinite(n) ? n : NaN;
    })
    .refine((n) => !Number.isNaN(n) && n >= 0, message);

const optionalMoney = z
  .union([z.string(), z.number()])
  .optional()
  .transform((v) => {
    if (v === undefined || v === "" || v === null) return null;
    const n = typeof v === "number" ? v : Number(String(v).replace(/,/g, ""));
    return Number.isFinite(n) ? n : NaN;
  })
  .refine((n) => n === null || (!Number.isNaN(n) && n >= 0), "Enter a valid amount");

const optionalInt = z
  .union([z.string(), z.number()])
  .optional()
  .transform((v) => {
    if (v === undefined || v === "" || v === null) return null;
    const n = typeof v === "number" ? v : Number(String(v).replace(/,/g, ""));
    return Number.isFinite(n) ? Math.trunc(n) : NaN;
  })
  .refine((n) => n === null || (!Number.isNaN(n) && n >= 0), "Enter a whole number");

const flag = z
  .union([z.literal("on"), z.literal("true"), z.literal("false"), z.boolean()])
  .optional()
  .transform((v) => v === "on" || v === "true" || v === true);

const idList = z
  .union([z.string(), z.array(z.string())])
  .optional()
  .transform((v) => (v === undefined ? [] : Array.isArray(v) ? v : [v]))
  .transform((v) => Array.from(new Set(v.map((s) => s.trim()).filter(Boolean))));

export const quotationItemSchema = z.object({
  rfqItemId: z
    .string()
    .trim()
    .optional()
    .transform((v) => (v ? v : null)),
  description: z.string().trim().min(2, "Describe the item").max(300),
  quantity: z.coerce.number().int("Whole number").positive("Quantity must be positive"),
  unit: z.string().trim().min(1).max(32).default("pieces"),
  unitPrice: money("Enter a unit price"),
  notes: optionalText(500),
});
export type QuotationItemInput = z.infer<typeof quotationItemSchema>;

/** The quotation form (create draft, submit, revise) — line items travel as an `itemsJson` string. */
export const quotationFormSchema = z.object({
  rfqId: z.string().min(1),
  quotationId: z
    .string()
    .trim()
    .optional()
    .transform((v) => (v ? v : null)),
  currency: z.enum(RFQ_CURRENCIES).default("USD"),
  incoterm: z
    .enum(INCOTERMS)
    .or(z.literal(""))
    .optional()
    .transform((v) => (v ? v : null)),
  validityDays: z.coerce.number().int().min(1, "At least 1 day").max(365, "At most 365 days").default(14),
  paymentTerms: optionalText(200),
  shippingCost: optionalMoney,
  discount: optionalMoney,
  shippingMethod: optionalText(120),
  moq: optionalInt,
  leadTimeDays: optionalInt,
  productionTimeNote: optionalText(500),
  sampleAvailable: flag,
  samplePrice: optionalMoney,
  notes: optionalText(4000),
  documentIds: idList,
  itemsJson: z.string().transform((v, ctx) => {
    let parsed: unknown;
    try {
      parsed = JSON.parse(v || "[]");
    } catch {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Line items are invalid" });
      return z.NEVER;
    }
    const res = z.array(quotationItemSchema).min(1, "Add at least one line item").safeParse(parsed);
    if (!res.success) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: res.error.issues[0]?.message ?? "Check the line items" });
      return z.NEVER;
    }
    return res.data;
  }),
});
export type QuotationFormInput = z.infer<typeof quotationFormSchema>;

export const quotationIdSchema = z.object({ quotationId: z.string().min(1) });
export const withdrawQuotationSchema = quotationIdSchema.extend({ reason: optionalText(1000) });
