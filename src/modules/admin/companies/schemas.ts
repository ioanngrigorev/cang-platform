import { z } from "zod";
import { idSchema, optionalText } from "../shared";

export const COMPANY_STATUSES = ["PENDING", "ACTIVE", "SUSPENDED", "BANNED"] as const;
export const VERIFICATION_STATUSES = ["UNVERIFIED", "PENDING", "IN_REVIEW", "VERIFIED", "REJECTED", "EXPIRED"] as const;

export const companyStatusSchema = z.object({ companyId: idSchema, status: z.enum(COMPANY_STATUSES), reason: optionalText(1000) });
export const companyVerificationSchema = z.object({ companyId: idSchema, verificationStatus: z.enum(VERIFICATION_STATUSES), note: optionalText(1000) });
export const companyFeaturedSchema = z.object({ companyId: idSchema, featured: z.enum(["true", "false"]) });
export const companyBadgeSchema = z.object({ companyId: idSchema, badgeId: idSchema, note: optionalText(500) });
export const companyBadgeRemoveSchema = z.object({ companyId: idSchema, companyBadgeId: idSchema });
export const companyNoteSchema = z.object({ companyId: idSchema, note: z.string().trim().min(2, "Write a note").max(2000) });
export const certificationReviewSchema = z.object({ companyId: idSchema, companyCertificationId: idSchema, status: z.enum(["VERIFIED", "REJECTED"]) });
