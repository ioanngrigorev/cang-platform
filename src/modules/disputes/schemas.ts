import { z } from "zod";

export const DISPUTE_TYPES = ["QUALITY", "QUANTITY", "DELIVERY_DELAY", "NON_DELIVERY", "PAYMENT", "DAMAGE", "SPECIFICATION_MISMATCH", "OTHER"] as const;

export const openDisputeSchema = z.object({
  orderId: z.string().min(1),
  type: z.enum(DISPUTE_TYPES),
  title: z.string().trim().min(5, "Give the dispute a short title (at least 5 characters)").max(200),
  description: z.string().trim().min(20, "Describe the problem in at least 20 characters").max(8000),
  claimedAmount: z
    .union([z.string(), z.number()])
    .optional()
    .transform((v) => {
      if (v === undefined || v === "" || v === null) return null;
      const n = typeof v === "number" ? v : Number(String(v).replace(/,/g, ""));
      return Number.isFinite(n) ? n : NaN;
    })
    .refine((n) => n === null || (!Number.isNaN(n) && n >= 0), "Enter a valid amount"),
});
export type OpenDisputeInput = z.infer<typeof openDisputeSchema>;

export const disputeReplySchema = z.object({
  disputeId: z.string().min(1),
  body: z.string().trim().min(2, "Write a message").max(8000),
  documentIds: z
    .union([z.string(), z.array(z.string())])
    .optional()
    .transform((v) => (v === undefined ? [] : Array.isArray(v) ? v : [v]))
    .transform((v) => v.map((s) => s.trim()).filter(Boolean)),
});

export const disputeIdSchema = z.object({ disputeId: z.string().min(1) });
