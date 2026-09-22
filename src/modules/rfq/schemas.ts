import { z } from "zod";

export const INCOTERMS = ["EXW", "FCA", "FAS", "FOB", "CFR", "CIF", "CPT", "CIP", "DAP", "DPU", "DDP"] as const;
export const RFQ_CURRENCIES = ["USD", "VND", "EUR"] as const;
export const RFQ_UNITS = ["pieces", "sets", "pairs", "kg", "tons", "meters", "rolls", "cartons", "containers", "units"] as const;

const optionalText = (max = 4000) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((v) => (v ? v : null));

const optionalDate = z
  .string()
  .trim()
  .optional()
  .transform((v) => (v ? new Date(v) : null))
  .refine((d) => d === null || !Number.isNaN(d.getTime()), "Enter a valid date");

const optionalMoney = z
  .union([z.string(), z.number()])
  .optional()
  .transform((v) => {
    if (v === undefined || v === "" || v === null) return null;
    const n = typeof v === "number" ? v : Number(String(v).replace(/,/g, ""));
    return Number.isFinite(n) ? n : NaN;
  })
  .refine((n) => n === null || (!Number.isNaN(n) && n >= 0), "Enter a valid amount");

export const rfqItemSchema = z.object({
  productName: z.string().trim().min(2, "Enter a product name").max(200),
  specifications: optionalText(2000),
  quantity: z.coerce.number().int("Whole number").positive("Quantity must be positive"),
  unit: z.string().trim().min(1).max(32).default("pieces"),
  targetPrice: optionalMoney,
});
export type RfqItemInput = z.infer<typeof rfqItemSchema>;

const idList = z
  .union([z.string(), z.array(z.string())])
  .optional()
  .transform((v) => (v === undefined ? [] : Array.isArray(v) ? v : [v]))
  .transform((v) => Array.from(new Set(v.map((s) => s.trim()).filter(Boolean))));

export const rfqFormSchema = z.object({
  title: z.string().trim().min(8, "Give your RFQ a descriptive title (at least 8 characters)").max(200),
  categoryId: z
    .string()
    .trim()
    .optional()
    .transform((v) => (v ? v : null)),
  description: z.string().trim().min(20, "Describe what you need in at least 20 characters").max(8000),
  quantity: z.coerce.number().int("Whole number").positive("Quantity must be positive"),
  unit: z.string().trim().min(1, "Select a unit").max(32),
  targetPrice: optionalMoney,
  targetCurrency: z.enum(RFQ_CURRENCIES).default("USD"),
  destinationCountryCode: z
    .string()
    .trim()
    .optional()
    .transform((v) => (v ? v.toUpperCase() : null)),
  destinationCity: optionalText(120),
  incoterm: z
    .enum(INCOTERMS)
    .or(z.literal(""))
    .optional()
    .transform((v) => (v ? v : null)),
  preferredPaymentTerms: optionalText(200),
  quoteDeadline: optionalDate,
  requiredDeliveryDate: optionalDate,
  certificationRequirements: optionalText(1000),
  customizationRequirements: optionalText(2000),
  packagingRequirements: optionalText(2000),
  sampleRequired: z
    .union([z.literal("on"), z.literal("true"), z.literal("false"), z.boolean()])
    .optional()
    .transform((v) => v === "on" || v === "true" || v === true),
  visibility: z.enum(["PUBLIC", "INVITED_ONLY"]).default("PUBLIC"),
  itemsJson: z
    .string()
    .optional()
    .transform((v, ctx) => {
      if (!v) return [] as RfqItemInput[];
      try {
        const parsed = JSON.parse(v);
        const res = z.array(rfqItemSchema).safeParse(parsed);
        if (!res.success) {
          ctx.addIssue({ code: z.ZodIssueCode.custom, message: res.error.issues[0]?.message ?? "Check the line items" });
          return z.NEVER;
        }
        return res.data;
      } catch {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Line items are invalid" });
        return z.NEVER;
      }
    }),
  documentIds: idList,
  invitedSupplierIds: idList,
  intent: z.enum(["draft", "publish"]).default("draft"),
});
export type RfqFormInput = z.infer<typeof rfqFormSchema>;

export const rejectQuotationSchema = z.object({
  quotationId: z.string().min(1),
  reason: z.string().trim().min(3, "Tell the supplier why (at least 3 characters)").max(1000),
});

export const revisionRequestSchema = z.object({
  quotationId: z.string().min(1),
  message: z.string().trim().min(5, "Describe what you would like changed").max(2000),
});

export const buyerNotesSchema = z.object({
  quotationId: z.string().min(1),
  buyerNotes: z.string().trim().max(2000).optional().default(""),
});

export const addressSchema = z.object({
  company: optionalText(200),
  contactName: optionalText(120),
  phone: optionalText(40),
  line1: z.string().trim().min(3, "Enter the street address").max(200),
  line2: optionalText(200),
  city: z.string().trim().min(1, "Enter the city").max(120),
  state: optionalText(120),
  postalCode: optionalText(20),
  countryCode: z.string().trim().length(2, "Select a country").toUpperCase(),
});
export type AddressInput = z.infer<typeof addressSchema>;

export const acceptQuotationSchema = addressSchema.extend({
  quotationId: z.string().min(1),
  tradeAssurance: z
    .union([z.literal("on"), z.literal("true"), z.literal("false"), z.boolean()])
    .optional()
    .transform((v) => v === "on" || v === "true" || v === true),
  buyerNotes: optionalText(2000),
});

export const rfqIdSchema = z.object({ rfqId: z.string().min(1) });
