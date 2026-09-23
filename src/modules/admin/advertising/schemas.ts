import { z } from "zod";
import { checkbox, idSchema, optionalNumber, optionalText, reasonSchema, requiredNumber } from "../shared";

export const AD_PLACEMENTS = ["FEATURED_PRODUCT", "FEATURED_SUPPLIER", "TOP_SEARCH", "CATEGORY_PROMOTION", "HOMEPAGE_PROMOTION", "RFQ_BOOST"] as const;
export const AD_PRICING = ["CPM", "CPC", "FLAT_DAILY", "FLAT_MONTHLY"] as const;

export const adProductSchema = z.object({
  adProductId: z.string().trim().optional().transform((v) => (v ? v : null)),
  code: z.string().trim().min(2, "Enter a code").max(60).transform((v) => v.toUpperCase().replace(/[^A-Z0-9_]+/g, "_")),
  placement: z.enum(AD_PLACEMENTS),
  name: z.string().trim().min(2, "Enter a name").max(120),
  nameVi: z.string().trim().min(2, "Enter the Vietnamese name").max(120),
  description: optionalText(1000),
  pricingModel: z.enum(AD_PRICING),
  price: requiredNumber.refine((n) => n >= 0, "Enter a price"),
  currency: z.string().trim().length(3).transform((v) => v.toUpperCase()),
  minBudget: optionalNumber,
  maxSlots: optionalNumber,
  sortOrder: z.coerce.number().int().default(0),
  isActive: checkbox,
});
export const adProductToggleSchema = z.object({ adProductId: idSchema, isActive: z.enum(["true", "false"]) });
export const campaignDecisionSchema = z.object({ campaignId: idSchema, decision: z.enum(["ACTIVE", "REJECTED", "PAUSED", "CANCELLED"]), reason: optionalText(1000) });
export { reasonSchema };
