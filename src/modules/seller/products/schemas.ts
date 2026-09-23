import { z } from "zod";
import { RFQ_CURRENCIES, RFQ_UNITS } from "@/modules/rfq/schemas";

export const PRICE_TYPES = ["FIXED", "TIERED", "NEGOTIABLE", "CONTACT"] as const;
export const PRODUCT_CURRENCIES = RFQ_CURRENCIES;
export const PRODUCT_UNITS = RFQ_UNITS;
export type ProductListTab = "all" | "active" | "pending" | "draft" | "inactive" | "rejected";
export const PRODUCT_TABS: ProductListTab[] = ["all", "active", "pending", "draft", "inactive", "rejected"];
export const PRODUCT_TAB_STATUSES: Record<Exclude<ProductListTab, "all">, string[]> = {
  active: ["ACTIVE"],
  pending: ["PENDING_REVIEW"],
  draft: ["DRAFT"],
  inactive: ["INACTIVE", "ARCHIVED"],
  rejected: ["REJECTED"],
};

const optionalText = (max = 4000) =>
  z
    .string()
    .trim()
    .max(max)
    .nullable()
    .optional()
    .transform((v) => (v ? v : null));

const optionalInt = (min = 0, max = 100000, message = "Enter a whole number") =>
  z
    .union([z.string(), z.number(), z.null()])
    .optional()
    .transform((v) => {
      if (v === undefined || v === null || v === "") return null;
      const n = Number(v);
      return Number.isFinite(n) ? Math.trunc(n) : NaN;
    })
    .refine((n) => n === null || (!Number.isNaN(n) && n >= min && n <= max), message);

const optionalMoney = z
  .union([z.string(), z.number(), z.null()])
  .optional()
  .transform((v) => {
    if (v === undefined || v === "" || v === null) return null;
    const n = typeof v === "number" ? v : Number(String(v).replace(/,/g, ""));
    return Number.isFinite(n) ? n : NaN;
  })
  .refine((n) => n === null || (!Number.isNaN(n) && n >= 0), "Enter a valid amount");

const flag = z
  .union([z.literal("on"), z.literal("true"), z.literal("false"), z.boolean()])
  .optional()
  .transform((v) => v === "on" || v === "true" || v === true);

const idList = z
  .union([z.string(), z.array(z.string())])
  .optional()
  .transform((v) => (v === undefined ? [] : Array.isArray(v) ? v : [v]))
  .transform((v) => Array.from(new Set(v.map((s) => s.trim()).filter(Boolean))));

export const priceTierSchema = z.object({
  minQty: z.coerce.number().int("Whole number").positive("Minimum quantity must be positive"),
  maxQty: z
    .union([z.string(), z.number(), z.null()])
    .optional()
    .transform((v) => {
      if (v === undefined || v === null || v === "") return null;
      const n = Number(v);
      return Number.isFinite(n) ? Math.trunc(n) : NaN;
    })
    .refine((n) => n === null || (!Number.isNaN(n) && n > 0), "Enter a valid maximum quantity"),
  price: z.coerce.number().positive("Enter a unit price"),
});
export type PriceTierInput = z.infer<typeof priceTierSchema>;

export const variantSchema = z.object({
  name: z.string().trim().min(1, "Enter a variant name").max(120),
  sku: optionalText(80),
  attributes: z.record(z.string(), z.string()).default({}),
  price: optionalMoney,
  moq: optionalInt(1, 10000000),
});
export type VariantInput = z.infer<typeof variantSchema>;

export const specificationSchema = z.object({
  name: z.string().trim().min(1, "Enter a specification name").max(120),
  value: z.string().trim().min(1, "Enter a value").max(500),
  unit: optionalText(32),
});
export type SpecificationInput = z.infer<typeof specificationSchema>;

function jsonList<T extends z.ZodTypeAny>(item: T, label: string) {
  return z
    .string()
    .optional()
    .transform((v, ctx) => {
      if (!v) return [] as z.infer<T>[];
      try {
        const res = z.array(item).safeParse(JSON.parse(v));
        if (!res.success) {
          ctx.addIssue({ code: z.ZodIssueCode.custom, message: res.error.issues[0]?.message ?? `Check the ${label}` });
          return z.NEVER;
        }
        return res.data as z.infer<T>[];
      } catch {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: `The ${label} could not be read` });
        return z.NEVER;
      }
    });
}

export const productFormSchema = z
  .object({
    title: z.string().trim().min(4, "Give the product a descriptive title (at least 4 characters)").max(200),
    titleVi: optionalText(200),
    categoryId: z.string().trim().min(1, "Select a category"),
    sku: optionalText(80),
    shortDescription: optionalText(400),
    description: optionalText(12000),
    descriptionVi: optionalText(12000),
    priceType: z.enum(PRICE_TYPES).default("TIERED"),
    currency: z.enum(PRODUCT_CURRENCIES).default("USD"),
    basePrice: optionalMoney,
    unit: z.string().trim().min(1, "Select a unit").max(32),
    moq: z.coerce.number().int("Whole number").positive("MOQ must be at least 1"),
    leadTimeDays: optionalInt(0, 3650),
    leadTimeNote: optionalText(300),
    hasSample: flag,
    samplePrice: optionalMoney,
    sampleLeadDays: optionalInt(0, 365),
    customizable: flag,
    oemAvailable: flag,
    odmAvailable: flag,
    packagingDetails: optionalText(2000),
    shippingInfo: optionalText(2000),
    hsCode: optionalText(20),
    originCountry: z.string().trim().length(2, "Select a country of origin").toUpperCase().default("VN"),
    brand: optionalText(120),
    model: optionalText(120),
    videoUrl: z
      .string()
      .trim()
      .max(300)
      .optional()
      .transform((v) => (v ? v : null))
      .refine((v) => v === null || /^https?:\/\/\S+$/i.test(v), "Enter a full URL starting with http:// or https://"),
    keywords: z
      .string()
      .trim()
      .max(1000)
      .optional()
      .transform((v) =>
        Array.from(
          new Set(
            (v ?? "")
              .split(/[,\n]/)
              .map((s) => s.trim().toLowerCase())
              .filter(Boolean),
          ),
        ).slice(0, 30),
      ),
    tiersJson: jsonList(priceTierSchema, "price tiers"),
    variantsJson: jsonList(variantSchema, "variants"),
    specsJson: jsonList(specificationSchema, "specifications"),
    certificationIds: idList,
    imageDocumentIds: idList,
    keepImageIds: idList,
    intent: z.enum(["save", "publish"]).optional().default("save"),
  })
  .superRefine((d, ctx) => {
    if (d.priceType === "FIXED" && d.basePrice === null) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["basePrice"], message: "Enter the unit price" });
    }
    if (d.priceType === "TIERED" && d.tiersJson.length === 0 && d.basePrice === null) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["tiersJson"], message: "Add at least one price tier or a base price" });
    }
    const sorted = [...d.tiersJson].sort((a, b) => a.minQty - b.minQty);
    for (const t of sorted) {
      if (t.maxQty !== null && t.maxQty < t.minQty) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["tiersJson"], message: "A tier's maximum quantity must be at least its minimum" });
        break;
      }
    }
    if (d.hasSample && d.samplePrice !== null && d.samplePrice < 0) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["samplePrice"], message: "Enter a valid sample price" });
    }
  });
export type ProductFormInput = z.infer<typeof productFormSchema>;

export const productIdSchema = z.object({ productId: z.string().trim().min(1) });
export const productImageSchema = z.object({ productId: z.string().trim().min(1), imageId: z.string().trim().min(1) });
