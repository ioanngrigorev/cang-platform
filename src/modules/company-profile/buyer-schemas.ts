import { z } from "zod";
import { INCOTERMS } from "@/modules/rfq/schemas";

export const EMPLOYEE_RANGES = ["R_1_10", "R_11_50", "R_51_200", "R_201_500", "R_501_1000", "R_1001_5000", "R_5000_PLUS"] as const;

export const BUYER_BUSINESS_TYPES = [
  "IMPORTER",
  "WHOLESALER",
  "DISTRIBUTOR",
  "RETAILER",
  "BRAND_OWNER",
  "TRADING_COMPANY",
  "INDUSTRIAL_SUPPLIER",
  "SERVICE_PROVIDER",
  "OTHER",
] as const;

const optionalText = (max = 1000) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((v) => (v ? v : null));

const stringList = z
  .union([z.string(), z.array(z.string())])
  .optional()
  .transform((v) => (v === undefined ? [] : Array.isArray(v) ? v : [v]))
  .transform((v) => Array.from(new Set(v.map((s) => s.trim()).filter(Boolean))));

export const buyerCompanySchema = z.object({
  name: z.string().trim().min(2, "Enter your company name").max(200),
  legalName: optionalText(200),
  businessType: z.enum(BUYER_BUSINESS_TYPES),
  countryCode: z.string().trim().length(2, "Select a country").toUpperCase(),
  city: optionalText(120),
  address: optionalText(300),
  postalCode: optionalText(20),
  website: z
    .string()
    .trim()
    .max(200)
    .optional()
    .transform((v) => (v ? v : null))
    .refine((v) => v === null || /^https?:\/\/\S+$/i.test(v), "Enter a full URL starting with http:// or https://"),
  email: z
    .string()
    .trim()
    .max(200)
    .optional()
    .transform((v) => (v ? v.toLowerCase() : null))
    .refine((v) => v === null || /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v), "Enter a valid email address"),
  phone: optionalText(40),
  taxId: optionalText(60),
  registrationNumber: optionalText(60),
  yearEstablished: z
    .union([z.string(), z.number()])
    .optional()
    .transform((v) => {
      if (v === undefined || v === "" || v === null) return null;
      const n = Number(v);
      return Number.isFinite(n) ? Math.trunc(n) : NaN;
    })
    .refine((n) => n === null || (!Number.isNaN(n) && n >= 1800 && n <= new Date().getFullYear()), "Enter a valid year"),
  employeeRange: z
    .enum(EMPLOYEE_RANGES)
    .or(z.literal(""))
    .optional()
    .transform((v) => (v ? v : null)),
  tagline: optionalText(200),
  description: optionalText(4000),
  logoDocumentId: optionalText(64),

  // buyer profile
  sourcingCategories: stringList,
  destinationCountries: stringList,
  preferredIncoterms: stringList.pipe(z.array(z.enum(INCOTERMS))),
  preferredCurrency: z.enum(["USD", "VND", "EUR"]).default("USD"),
  annualPurchasingVolumeUsd: z
    .union([z.string(), z.number()])
    .optional()
    .transform((v) => {
      if (v === undefined || v === "" || v === null) return null;
      const n = typeof v === "number" ? v : Number(String(v).replace(/,/g, ""));
      return Number.isFinite(n) ? n : NaN;
    })
    .refine((n) => n === null || (!Number.isNaN(n) && n >= 0), "Enter a valid amount"),
  companySizeNote: optionalText(500),
});
export type BuyerCompanyInput = z.infer<typeof buyerCompanySchema>;

const owner = z.object({
  fullName: z.string().trim().min(2).max(200),
  nationality: z.string().trim().max(80).optional().nullable(),
  ownershipPercent: z.coerce.number().min(0).max(100),
  role: z.string().trim().max(120).optional().nullable(),
  isPep: z.boolean().optional().default(false),
});
export type BeneficialOwnerInput = z.infer<typeof owner>;

export const kybSubmissionSchema = z.object({
  legalName: z.string().trim().min(2, "Enter the registered legal name").max(200),
  registrationNumber: z.string().trim().min(2, "Enter the business registration number").max(80),
  taxId: z.string().trim().min(2, "Enter the tax identification number").max(80),
  registeredAddress: z.string().trim().min(5, "Enter the registered address").max(300),
  countryCode: z.string().trim().length(2, "Select a country").toUpperCase(),
  representativeName: z.string().trim().min(2, "Enter the legal representative's name").max(200),
  representativeRole: z
    .string()
    .trim()
    .max(120)
    .optional()
    .transform((v) => (v ? v : null)),
  businessRegistrationDocumentId: z.string().trim().min(1, "Upload the business registration certificate"),
  taxCertificateDocumentId: z.string().trim().min(1, "Upload the tax registration certificate"),
  representativeIdDocumentId: z.string().trim().min(1, "Upload the legal representative's ID"),
  ownersJson: z
    .string()
    .optional()
    .transform((v, ctx) => {
      if (!v) return [] as BeneficialOwnerInput[];
      try {
        const res = z.array(owner).safeParse(JSON.parse(v));
        if (!res.success) {
          ctx.addIssue({ code: z.ZodIssueCode.custom, message: res.error.issues[0]?.message ?? "Check the beneficial owners" });
          return z.NEVER;
        }
        return res.data;
      } catch {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Beneficial owner details are invalid" });
        return z.NEVER;
      }
    })
    .refine((list) => list.length > 0, "Add at least one beneficial owner"),
  declaration: z
    .union([z.literal("on"), z.literal("true"), z.boolean()])
    .refine((v) => v === "on" || v === "true" || v === true, "Confirm that the information is accurate"),
});
export type KybSubmissionInput = z.infer<typeof kybSubmissionSchema>;
