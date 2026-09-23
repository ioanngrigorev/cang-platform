import { z } from "zod";
import { idSchema, optionalNumber, optionalText, reasonSchema } from "../shared";

export const COMPLIANCE_CHECK_TYPES = ["KYC", "KYB", "AML", "SANCTIONS", "PEP", "UBO", "ADVERSE_MEDIA", "TRANSACTION_MONITORING"] as const;
export const COMPLIANCE_STATUSES = ["PENDING", "CLEARED", "FLAGGED", "REJECTED", "MANUAL_REVIEW"] as const;

export const verificationIdSchema = z.object({ verificationId: idSchema });
export const verificationDecisionSchema = z.object({ verificationId: idSchema, notes: optionalText(2000) });
export const verificationRejectSchema = z.object({ verificationId: idSchema, reason: reasonSchema });
export const verificationInfoSchema = z.object({ verificationId: idSchema, notes: z.string().trim().min(5, "Tell the company what is missing").max(2000) });
export const complianceCheckSchema = z.object({
  verificationId: idSchema,
  type: z.enum(COMPLIANCE_CHECK_TYPES),
  status: z.enum(COMPLIANCE_STATUSES),
  riskScore: optionalNumber,
  notes: optionalText(2000),
});
