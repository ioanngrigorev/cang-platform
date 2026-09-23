"use server";

import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { badges, companies, companyBadges, complianceChecks, verifications } from "@/db/schema";
import { ActionError, formDataToObject, ok, parseInput, runAction, type ActionResult } from "@/lib/action";
import { notifyCompany } from "@/modules/notifications/service";
import { adminActor, revalidateAdmin } from "../context";
import { complianceCheckSchema, verificationDecisionSchema, verificationIdSchema, verificationInfoSchema, verificationRejectSchema } from "./schemas";

async function load(verificationId: string) {
  const v = await db.query.verifications.findFirst({ where: eq(verifications.id, verificationId), with: { company: true } });
  if (!v) throw new ActionError("Verification not found.", "NOT_FOUND");
  return v;
}

const OPEN = ["PENDING", "IN_REVIEW"];

function revalidate(id: string, companyId: string) {
  revalidateAdmin("/admin/verification", `/admin/verification/${id}`, `/admin/companies/${companyId}`, "/admin");
}

const linkFor = (c: { isSeller: boolean }) => `${c.isSeller ? "/seller" : "/buyer"}/company/verification`;

export async function startVerificationReviewAction(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  return runAction(async () => {
    const { user, log } = await adminActor("admin.verification.review");
    const parsed = parseInput(verificationIdSchema, formDataToObject(formData));
    if (!parsed.success) return parsed.result;
    const v = await load(parsed.data.verificationId);
    if (v.status !== "PENDING") throw new ActionError("Only pending submissions can be moved to review.", "INVALID_STATE");
    await db.transaction(async (tx) => {
      await tx.update(verifications).set({ status: "IN_REVIEW", reviewedById: user.id }).where(eq(verifications.id, v.id));
      if (v.type === "KYB") await tx.update(companies).set({ kybStatus: "IN_REVIEW", verificationStatus: v.company.verificationStatus === "VERIFIED" ? "VERIFIED" : "IN_REVIEW" }).where(eq(companies.id, v.companyId));
    });
    await log({ action: "admin.verification.start_review", entityType: "verification", entityId: v.id, before: { status: v.status }, after: { status: "IN_REVIEW", companyId: v.companyId } });
    await notifyCompany(v.companyId, { type: "VERIFICATION_STATUS", title: "Your verification is now under review", body: "Our compliance team has started reviewing your submission.", link: linkFor(v.company), email: false });
    revalidate(v.id, v.companyId);
    return ok(undefined, "Submission moved to review.");
  });
}

export async function approveVerificationAction(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  return runAction(async () => {
    const { user, log } = await adminActor("admin.verification.review");
    const parsed = parseInput(verificationDecisionSchema, formDataToObject(formData));
    if (!parsed.success) return parsed.result;
    const v = await load(parsed.data.verificationId);
    if (!OPEN.includes(v.status)) throw new ActionError("This submission has already been decided.", "INVALID_STATE");
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 2 * 365 * 86400000);
    const badgeCode = v.company.isSeller ? "VERIFIED_MANUFACTURER" : "VERIFIED_BUYER";
    let grantedBadge: string | null = null;
    await db.transaction(async (tx) => {
      await tx.update(verifications).set({ status: "VERIFIED", reviewedAt: now, reviewedById: user.id, expiresAt, notes: parsed.data.notes ?? v.notes, rejectionReason: null }).where(eq(verifications.id, v.id));
      if (v.type === "KYB") {
        await tx.update(companies).set({ verificationStatus: "VERIFIED", kybStatus: "VERIFIED", verifiedAt: now, ...(v.company.status === "PENDING" ? { status: "ACTIVE" as const } : {}) }).where(eq(companies.id, v.companyId));
        const [badge] = await tx.select({ id: badges.id, code: badges.code }).from(badges).where(and(eq(badges.code, badgeCode), eq(badges.isActive, true))).limit(1);
        if (badge) {
          await tx.insert(companyBadges).values({ companyId: v.companyId, badgeId: badge.id, source: "RULE", grantedById: user.id, note: "KYB verified by compliance." }).onConflictDoNothing();
          grantedBadge = badge.code;
        }
      }
    });
    await log({ action: "admin.verification.approve", entityType: "verification", entityId: v.id, before: { status: v.status }, after: { status: "VERIFIED", companyId: v.companyId, badge: grantedBadge, notes: parsed.data.notes } });
    await notifyCompany(v.companyId, {
      type: "VERIFICATION_STATUS",
      title: v.type === "KYB" ? "Your company is now verified" : `${v.type.replace(/_/g, " ").toLowerCase()} verification approved`,
      body: parsed.data.notes ?? "Congratulations — your verification was approved.",
      link: linkFor(v.company),
    });
    revalidate(v.id, v.companyId);
    return ok(undefined, "Verification approved.");
  });
}

export async function rejectVerificationAction(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  return runAction(async () => {
    const { user, log } = await adminActor("admin.verification.review");
    const parsed = parseInput(verificationRejectSchema, formDataToObject(formData));
    if (!parsed.success) return parsed.result;
    const v = await load(parsed.data.verificationId);
    if (!OPEN.includes(v.status)) throw new ActionError("This submission has already been decided.", "INVALID_STATE");
    await db.transaction(async (tx) => {
      await tx.update(verifications).set({ status: "REJECTED", reviewedAt: new Date(), reviewedById: user.id, rejectionReason: parsed.data.reason }).where(eq(verifications.id, v.id));
      if (v.type === "KYB") await tx.update(companies).set({ kybStatus: "REJECTED", verificationStatus: v.company.verificationStatus === "VERIFIED" ? "VERIFIED" : "REJECTED" }).where(eq(companies.id, v.companyId));
    });
    await log({ action: "admin.verification.reject", entityType: "verification", entityId: v.id, before: { status: v.status }, after: { status: "REJECTED", companyId: v.companyId, reason: parsed.data.reason } });
    await notifyCompany(v.companyId, { type: "VERIFICATION_STATUS", title: "Your verification was not approved", body: parsed.data.reason, link: linkFor(v.company) });
    revalidate(v.id, v.companyId);
    return ok(undefined, "Verification rejected.");
  });
}

export async function requestVerificationInfoAction(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  return runAction(async () => {
    const { user, log } = await adminActor("admin.verification.review");
    const parsed = parseInput(verificationInfoSchema, formDataToObject(formData));
    if (!parsed.success) return parsed.result;
    const v = await load(parsed.data.verificationId);
    if (!OPEN.includes(v.status)) throw new ActionError("This submission has already been decided.", "INVALID_STATE");
    await db.update(verifications).set({ notes: parsed.data.notes, reviewedById: user.id, status: "IN_REVIEW" }).where(eq(verifications.id, v.id));
    if (v.type === "KYB" && v.status === "PENDING") await db.update(companies).set({ kybStatus: "IN_REVIEW" }).where(eq(companies.id, v.companyId));
    await log({ action: "admin.verification.request_info", entityType: "verification", entityId: v.id, after: { companyId: v.companyId, notes: parsed.data.notes } });
    await notifyCompany(v.companyId, { type: "VERIFICATION_STATUS", title: "More information needed for your verification", body: parsed.data.notes, link: linkFor(v.company) });
    revalidate(v.id, v.companyId);
    return ok(undefined, "The company has been asked for more information.");
  });
}

export async function recordComplianceCheckAction(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  return runAction(async () => {
    const { user, log } = await adminActor("admin.compliance.review");
    const parsed = parseInput(complianceCheckSchema, formDataToObject(formData));
    if (!parsed.success) return parsed.result;
    const v = await load(parsed.data.verificationId);
    const [row] = await db
      .insert(complianceChecks)
      .values({
        companyId: v.companyId,
        type: parsed.data.type,
        provider: "manual",
        status: parsed.data.status,
        riskScore: parsed.data.riskScore == null ? null : Math.round(parsed.data.riskScore),
        notes: parsed.data.notes,
        checkedAt: new Date(),
        reviewedById: user.id,
        nextReviewAt: new Date(Date.now() + 365 * 86400000),
        result: { source: "admin-console", verificationId: v.id },
      })
      .returning({ id: complianceChecks.id });
    if (parsed.data.type === "SANCTIONS") {
      const sanctions = parsed.data.status === "CLEARED" ? "CLEAR" : parsed.data.status === "FLAGGED" || parsed.data.status === "MANUAL_REVIEW" ? "POTENTIAL_MATCH" : parsed.data.status === "REJECTED" ? "MATCH" : "NOT_SCREENED";
      await db.update(companies).set({ sanctionsStatus: sanctions }).where(eq(companies.id, v.companyId));
    }
    await log({ action: "admin.compliance.check", entityType: "compliance_check", entityId: row.id, after: { companyId: v.companyId, type: parsed.data.type, status: parsed.data.status, riskScore: parsed.data.riskScore } });
    revalidate(v.id, v.companyId);
    revalidateAdmin("/admin/risk");
    return ok(undefined, "Compliance check recorded.");
  });
}
