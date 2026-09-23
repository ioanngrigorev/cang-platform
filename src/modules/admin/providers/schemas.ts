import { z } from "zod";
import { checkbox, idSchema, jsonText, listText, optionalNumber, optionalText } from "../shared";

export const PAYMENT_PROVIDER_TYPES = ["BANK_TRANSFER", "GATEWAY", "ESCROW_PARTNER", "VIRTUAL_ACCOUNT", "CARD_ACQUIRER", "WIRE"] as const;
export const PAYMENT_METHODS = ["BANK_TRANSFER", "LOCAL_BANK_TRANSFER_VN", "CARD", "INTERNATIONAL_WIRE", "GATEWAY", "VIRTUAL_ACCOUNT", "ESCROW", "OTHER"] as const;
export const FINANCING_PROVIDER_TYPES = ["BANK", "NON_BANK_LENDER", "FINTECH", "FACTORING_COMPANY", "EXPORT_CREDIT_AGENCY"] as const;
export const FINANCING_PRODUCTS = ["INVOICE_FINANCING", "PURCHASE_FINANCING", "BNPL", "IMPORT_FINANCING", "WORKING_CAPITAL", "PRODUCTION_FINANCING", "INVOICE_FACTORING", "RECEIVABLES_FINANCING", "PURCHASE_ORDER_FINANCING"] as const;
export const INSPECTION_TYPES = ["FACTORY_AUDIT", "PRE_PRODUCTION", "DURING_PRODUCTION", "PRE_SHIPMENT", "CONTAINER_LOADING"] as const;

const multi = <T extends readonly [string, ...string[]]>(values: T) =>
  z
    .union([z.string(), z.array(z.string())])
    .optional()
    .transform((v) => (v === undefined ? [] : Array.isArray(v) ? v : [v]))
    .pipe(z.array(z.enum(values)));

const code = z.string().trim().min(2, "Enter a code").max(60).transform((v) => v.toUpperCase().replace(/[^A-Z0-9_]+/g, "_"));

export const paymentProviderSchema = z.object({
  providerId: z.string().trim().optional().transform((v) => (v ? v : null)),
  code,
  name: z.string().trim().min(2, "Enter a name").max(160),
  type: z.enum(PAYMENT_PROVIDER_TYPES),
  description: optionalText(2000),
  adapterCode: z.string().trim().max(60).optional().transform((v) => (v ? v : "manual_bank_transfer")),
  supportedMethods: multi(PAYMENT_METHODS),
  supportedCurrencies: listText,
  supportedCountries: listText,
  supportsEscrow: checkbox,
  licenseInfo: optionalText(500),
  publicConfig: jsonText(),
  feePercent: optionalNumber,
  feeFixed: optionalNumber,
  feeCurrency: optionalText(3),
  isActive: checkbox,
  isDefault: checkbox,
  sortOrder: z.coerce.number().int().default(0),
});

export const financingProviderSchema = z.object({
  providerId: z.string().trim().optional().transform((v) => (v ? v : null)),
  code,
  name: z.string().trim().min(2, "Enter a name").max(160),
  type: z.enum(FINANCING_PROVIDER_TYPES),
  description: optionalText(2000),
  licenseNumber: optionalText(120),
  regulator: optionalText(120),
  products: multi(FINANCING_PRODUCTS),
  countries: listText,
  currencies: listText,
  minAmount: optionalNumber,
  maxAmount: optionalNumber,
  minTenorDays: optionalNumber,
  maxTenorDays: optionalNumber,
  indicativeRate: optionalText(120),
  adapterCode: z.string().trim().max(60).optional().transform((v) => (v ? v : "manual")),
  apiConfig: jsonText(),
  routingRules: jsonText(),
  isActive: checkbox,
  sortOrder: z.coerce.number().int().default(0),
});

export const inspectionProviderSchema = z.object({
  providerId: z.string().trim().optional().transform((v) => (v ? v : null)),
  code,
  name: z.string().trim().min(2, "Enter a name").max(160),
  description: optionalText(2000),
  services: multi(INSPECTION_TYPES),
  countries: listText,
  adapterCode: z.string().trim().max(60).optional().transform((v) => (v ? v : "manual")),
  apiConfig: jsonText(),
  isActive: checkbox,
  sortOrder: z.coerce.number().int().default(0),
});

export const providerToggleSchema = z.object({ providerId: idSchema, kind: z.enum(["payment", "logistics", "financing", "inspection"]), isActive: z.enum(["true", "false"]) });
