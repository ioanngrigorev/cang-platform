import { z } from "zod";
import { EMPLOYEE_RANGES } from "@/modules/company-profile/buyer-schemas";
import { INCOTERMS } from "@/modules/rfq/schemas";

export { EMPLOYEE_RANGES };

export const SELLER_BUSINESS_TYPES = [
  "MANUFACTURER",
  "OEM_MANUFACTURER",
  "ODM_MANUFACTURER",
  "EXPORTER",
  "WHOLESALER",
  "DISTRIBUTOR",
  "TRADING_COMPANY",
  "INDUSTRIAL_SUPPLIER",
  "SERVICE_PROVIDER",
  "OTHER",
] as const;

export const PAYMENT_TERMS = ["T/T", "L/C", "D/P", "D/A", "PayPal", "Escrow"] as const;
export const LANGUAGES = ["en", "vi", "zh", "ja", "ko", "fr", "de", "es"] as const;

const optionalText = (max = 1000) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((v) => (v ? v : null));

const optionalInt = (min = 0, max = 100000000, message = "Enter a whole number") =>
  z
    .union([z.string(), z.number()])
    .optional()
    .transform((v) => {
      if (v === undefined || v === null || v === "") return null;
      const n = Number(v);
      return Number.isFinite(n) ? Math.trunc(n) : NaN;
    })
    .refine((n) => n === null || (!Number.isNaN(n) && n >= min && n <= max), message);

const optionalMoney = z
  .union([z.string(), z.number()])
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

const stringList = z
  .union([z.string(), z.array(z.string())])
  .optional()
  .transform((v) => (v === undefined ? [] : Array.isArray(v) ? v : [v]))
  .transform((v) => Array.from(new Set(v.map((s) => s.trim()).filter(Boolean))));

/** Comma/newline separated list of ISO-3166 codes → upper-cased, de-duplicated. */
const codeList = z
  .string()
  .trim()
  .max(500)
  .optional()
  .transform((v) =>
    Array.from(
      new Set(
        (v ?? "")
          .split(/[,\s]+/)
          .map((s) => s.trim().toUpperCase())
          .filter((s) => /^[A-Z]{2}$/.test(s)),
      ),
    ),
  );

const lineList = (max = 2000) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((v) =>
      Array.from(
        new Set(
          (v ?? "")
            .split(/[,\n]/)
            .map((s) => s.trim())
            .filter(Boolean),
        ),
      ),
    );

export const sellerCompanySchema = z.object({
  name: z.string().trim().min(2, "Enter your company name").max(200),
  nameVi: optionalText(200),
  legalName: optionalText(200),
  businessType: z.enum(SELLER_BUSINESS_TYPES),
  employeeRange: z
    .enum(EMPLOYEE_RANGES)
    .or(z.literal(""))
    .optional()
    .transform((v) => (v ? v : null)),
  yearEstablished: optionalInt(1800, new Date().getFullYear(), "Enter a valid year"),
  tagline: optionalText(200),
  taglineVi: optionalText(200),
  description: optionalText(6000),
  descriptionVi: optionalText(6000),
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
  address: optionalText(300),
  city: optionalText(120),
  postalCode: optionalText(20),
  provinceId: optionalText(64),
  countryCode: z.string().trim().length(2, "Select a country").toUpperCase(),
  taxId: optionalText(60),
  registrationNumber: optionalText(60),
  languages: stringList,
  industryIds: stringList,
  primaryIndustryId: optionalText(64),
  logoDocumentId: optionalText(64),
  coverDocumentId: optionalText(64),

  // capabilities → manufacturer_profiles
  oemCapable: flag,
  odmCapable: flag,
  privateLabelCapable: flag,
  minOrderValueUsd: optionalMoney,
  avgLeadTimeDays: optionalInt(0, 3650),
  sampleLeadTimeDays: optionalInt(0, 365),
  exportCountries: codeList,
  mainMarkets: lineList(500),
  exportPercentage: optionalInt(0, 100, "Enter a percentage between 0 and 100"),
  exportExperienceYears: optionalInt(0, 200),
  paymentTermsAccepted: stringList,
  acceptedIncoterms: stringList.pipe(z.array(z.enum(INCOTERMS))),
  factoryTourAvailable: flag,
});
export type SellerCompanyInput = z.infer<typeof sellerCompanySchema>;

export const factoryProfileSchema = z.object({
  factoryAddress: optionalText(300),
  factorySizeSqm: optionalInt(0, 100000000),
  productionLines: optionalInt(0, 100000),
  annualCapacity: optionalText(200),
  annualCapacityValue: optionalMoney,
  annualCapacityUnit: optionalText(60),
  rdStaffCount: optionalInt(0, 1000000),
  qcStaffCount: optionalInt(0, 1000000),
  mainEquipment: optionalText(3000),
  mainMaterials: optionalText(3000),
  videoUrls: lineList(2000).pipe(z.array(z.string().url("Enter full video URLs, one per line")).max(10)),
  photoDocumentIds: stringList,
});
export type FactoryProfileInput = z.infer<typeof factoryProfileSchema>;

export const mediaIdSchema = z.object({ mediaId: z.string().trim().min(1) });

const optionalDate = z
  .string()
  .trim()
  .optional()
  .transform((v) => (v ? new Date(v) : null))
  .refine((d) => d === null || !Number.isNaN(d.getTime()), "Enter a valid date");

export const companyCertificationSchema = z
  .object({
    certificationId: z.string().trim().min(1, "Select a certification"),
    certificateNumber: optionalText(120),
    issuedAt: optionalDate,
    expiresAt: optionalDate,
    documentId: optionalText(64),
  })
  .refine((d) => !d.issuedAt || !d.expiresAt || d.expiresAt >= d.issuedAt, { path: ["expiresAt"], message: "Expiry must be after the issue date" });
export type CompanyCertificationInput = z.infer<typeof companyCertificationSchema>;

export const certificationIdSchema = z.object({ companyCertificationId: z.string().trim().min(1) });
