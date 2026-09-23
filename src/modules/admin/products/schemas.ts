import { z } from "zod";
import { idSchema, optionalNumber, optionalText, reasonSchema } from "../shared";

export const productIdSchema = z.object({ productId: idSchema });
export const productRejectSchema = z.object({ productId: idSchema, reason: reasonSchema });
export const productUnpublishSchema = z.object({ productId: idSchema, reason: optionalText(1000) });
export const productFeatureSchema = z.object({
  productId: idSchema,
  featured: z.enum(["true", "false"]),
  days: optionalNumber,
  searchBoost: optionalNumber,
});
