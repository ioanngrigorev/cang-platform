import { z } from "zod";
import { checkbox, idSchema, jsonText, optionalText, requiredNumber } from "../shared";

export const UPGRADE_REQUEST = "UPGRADE_REQUEST";
export const PLAN_TIERS = ["FREE", "PRO", "PREMIUM", "ENTERPRISE"] as const;

export const planSchema = z.object({
  planId: z.string().trim().optional().transform((v) => (v ? v : null)),
  code: z.string().trim().min(2, "Enter a code").max(40).transform((v) => v.toUpperCase().replace(/[^A-Z0-9_]+/g, "_")),
  tier: z.enum(PLAN_TIERS),
  name: z.string().trim().min(2, "Enter a name").max(120),
  nameVi: z.string().trim().min(2, "Enter the Vietnamese name").max(120),
  description: optionalText(1000),
  priceMonthly: requiredNumber.refine((n) => n >= 0, "Enter a price"),
  priceYearly: requiredNumber.refine((n) => n >= 0, "Enter a price"),
  currency: z.string().trim().length(3, "3-letter currency code").transform((v) => v.toUpperCase()),
  features: jsonText("Features must be a JSON array of strings"),
  limits: jsonText("Limits must be a JSON object"),
  isPublic: checkbox,
  isActive: checkbox,
  sortOrder: z.coerce.number().int().default(0),
});

export const subscriptionIdSchema = z.object({ subscriptionId: idSchema, note: optionalText(500) });
export const subscriptionCancelSchema = z.object({ subscriptionId: idSchema, mode: z.enum(["NOW", "PERIOD_END"]).default("NOW"), note: optionalText(500) });
