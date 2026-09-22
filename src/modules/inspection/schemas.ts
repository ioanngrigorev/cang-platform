import { z } from "zod";

export const INSPECTION_TYPES = ["FACTORY_AUDIT", "PRE_PRODUCTION", "DURING_PRODUCTION", "PRE_SHIPMENT", "CONTAINER_LOADING"] as const;

export const requestInspectionSchema = z.object({
  orderId: z
    .string()
    .trim()
    .optional()
    .transform((v) => (v ? v : null)),
  providerId: z
    .string()
    .trim()
    .optional()
    .transform((v) => (v ? v : null)),
  type: z.enum(INSPECTION_TYPES),
  requestedDate: z
    .string()
    .trim()
    .optional()
    .transform((v) => (v ? new Date(v) : null))
    .refine((d) => d === null || !Number.isNaN(d.getTime()), "Enter a valid date"),
  factoryAddress: z
    .string()
    .trim()
    .max(400)
    .optional()
    .transform((v) => (v ? v : null)),
  notes: z
    .string()
    .trim()
    .max(2000)
    .optional()
    .transform((v) => (v ? v : null)),
});
export type RequestInspectionInput = z.infer<typeof requestInspectionSchema>;

export const inspectionIdSchema = z.object({ inspectionId: z.string().min(1) });
