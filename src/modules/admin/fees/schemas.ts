import { z } from "zod";
import { checkbox, idSchema, jsonText, optionalDate, optionalNumber, optionalText, requiredNumber } from "../shared";

export const FEE_TYPES = ["TRANSACTION_COMMISSION", "PAYMENT_ORCHESTRATION", "FINANCING_ORIGINATION", "LOGISTICS_COMMISSION", "INSPECTION_COMMISSION", "VERIFICATION_FEE", "ADVERTISING", "RFQ_PRIORITY", "API_ACCESS", "SUBSCRIPTION"] as const;
export const FEE_CALCS = ["PERCENTAGE", "FIXED", "TIERED"] as const;
export const PAID_BY = ["SELLER", "BUYER", "SPLIT"] as const;
export const COMMISSION_STATUSES = ["PENDING", "INVOICED", "COLLECTED", "WAIVED", "REFUNDED"] as const;

export const feeRuleSchema = z.object({
  feeRuleId: z.string().trim().optional().transform((v) => (v ? v : null)),
  code: z.string().trim().min(2, "Enter a code").max(60).transform((v) => v.toUpperCase().replace(/[^A-Z0-9_]+/g, "_")),
  name: z.string().trim().min(2, "Enter a name").max(160),
  type: z.enum(FEE_TYPES),
  calc: z.enum(FEE_CALCS),
  value: requiredNumber.refine((n) => n >= 0, "Enter a value"),
  tiers: jsonText("Tiers must be a JSON array like [{\"upTo\": 10000, \"percent\": 3}]"),
  currency: z.string().trim().min(3).max(3).transform((v) => v.toUpperCase()),
  minFee: optionalNumber,
  maxFee: optionalNumber,
  planId: z.string().trim().optional().transform((v) => (v ? v : null)),
  categorySlug: optionalText(120),
  countryCode: optionalText(2),
  paidBy: z.enum(PAID_BY),
  priority: z.coerce.number().int().default(0),
  isActive: checkbox,
  validFrom: optionalDate,
  validTo: optionalDate,
  description: optionalText(1000),
});

export const feeRuleToggleSchema = z.object({ feeRuleId: idSchema, isActive: z.enum(["true", "false"]) });
export const commissionStatusSchema = z.object({ commissionId: idSchema, status: z.enum(COMMISSION_STATUSES), note: optionalText(500) });
