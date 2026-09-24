"use server";

import { companyHome as homeFor } from "@/modules/auth/redirects";
import { and, eq, isNull } from "drizzle-orm";
import { db } from "@/db";
import { badges, companies, companyBadges, companyCertifications } from "@/db/schema";
import { ActionError, formDataToObject, ok, parseInput, runAction, type ActionResult } from "@/lib/action";
import { notifyCompany } from "@/modules/notifications/service";
import { adminActor, revalidateAdmin } from "../context";
import {
  certificationReviewSchema,
  companyBadgeRemoveSchema,
  companyBadgeSchema,
  companyFeaturedSchema,
  companyNoteSchema,
  companyStatusSchema,
  companyVerificationSchema,
} from "./schemas";

async function loadCompany(companyId: string) {
  const [c] = await db.select().from(companies).where(and(eq(companies.id, companyId), isNull(companies.deletedAt))).limit(1);
  if (!c) throw new ActionError("Company not found.", "NOT_FOUND");
  return c;
}

function revalidate(companyId: string) {
  revalidateAdmin("/admin/companies", `/admin/companies/${companyId}`, "/admin");
}

const companyHome = (c: { isSeller: boolean; isBuyer?: boolean; isLogisticsPartner?: boolean }) => homeFor(c);

export async function setCompanyStatusAction(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  return runAction(async () => {
    const { log } = await adminActor("admin.companies.write");
    const parsed = parseInput(companyStatusSchema, formDataToObject(formData));
    if (!parsed.success) return parsed.result;
    const c = await loadCompany(parsed.data.companyId);
    if (c.status === parsed.data.status) return ok(undefined, "Status unchanged.");
    await db.update(companies).set({ status: parsed.data.status }).where(eq(companies.id, c.id));
    await log({ action: `admin.company.status.${parsed.data.status.toLowerCase()}`, entityType: "company", entityId: c.id, before: { status: c.status }, after: { status: parsed.data.status, reason: parsed.data.reason } });
    const active = parsed.data.status === "ACTIVE";
    await notifyCompany(c.id, {
      type: "SYSTEM",
      title: active ? "Your company account is active again" : parsed.data.status === "BANNED" ? "Your company account has been banned" : "Your company account has been suspended",
      body: parsed.data.reason ?? undefined,
      link: `${companyHome(c)}/company`,
      email: true,
    });
    revalidate(c.id);
    return ok(undefined, "Company status updated.");
  });
}

export async function setCompanyVerificationAction(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  return runAction(async () => {
    const { log } = await adminActor("admin.companies.write");
    const parsed = parseInput(companyVerificationSchema, formDataToObject(formData));
    if (!parsed.success) return parsed.result;
    const c = await loadCompany(parsed.data.companyId);
    const vs = parsed.data.verificationStatus;
    await db
      .update(companies)
      .set({ verificationStatus: vs, kybStatus: vs, verifiedAt: vs === "VERIFIED" ? new Date() : c.verifiedAt })
      .where(eq(companies.id, c.id));
    await log({ action: "admin.company.verification", entityType: "company", entityId: c.id, before: { verificationStatus: c.verificationStatus }, after: { verificationStatus: vs, note: parsed.data.note } });
    await notifyCompany(c.id, {
      type: "VERIFICATION_STATUS",
      title: `Verification status: ${vs.replace(/_/g, " ").toLowerCase()}`,
      body: parsed.data.note ?? undefined,
      link: `${companyHome(c)}/company/verification`,
    });
    revalidate(c.id);
    return ok(undefined, "Verification status updated.");
  });
}

export async function toggleCompanyFeaturedAction(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  return runAction(async () => {
    const { log } = await adminActor("admin.companies.write");
    const parsed = parseInput(companyFeaturedSchema, formDataToObject(formData));
    if (!parsed.success) return parsed.result;
    const c = await loadCompany(parsed.data.companyId);
    const featured = parsed.data.featured === "true";
    await db.update(companies).set({ isFeatured: featured, featuredUntil: featured ? new Date(Date.now() + 30 * 86400000) : null }).where(eq(companies.id, c.id));
    await log({ action: "admin.company.featured", entityType: "company", entityId: c.id, before: { isFeatured: c.isFeatured }, after: { isFeatured: featured } });
    revalidate(c.id);
    return ok(undefined, featured ? "Company featured for 30 days." : "Company removed from featured.");
  });
}

export async function addCompanyBadgeAction(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  return runAction(async () => {
    const { user, log } = await adminActor("admin.companies.write");
    const parsed = parseInput(companyBadgeSchema, formDataToObject(formData));
    if (!parsed.success) return parsed.result;
    const c = await loadCompany(parsed.data.companyId);
    const [badge] = await db.select().from(badges).where(eq(badges.id, parsed.data.badgeId)).limit(1);
    if (!badge) throw new ActionError("Badge not found.", "NOT_FOUND");
    await db
      .insert(companyBadges)
      .values({ companyId: c.id, badgeId: badge.id, source: "MANUAL", grantedById: user.id, note: parsed.data.note })
      .onConflictDoUpdate({ target: [companyBadges.companyId, companyBadges.badgeId], set: { source: "MANUAL", grantedById: user.id, grantedAt: new Date(), note: parsed.data.note, expiresAt: null } });
    await log({ action: "admin.company.badge.grant", entityType: "company", entityId: c.id, after: { badge: badge.code, note: parsed.data.note } });
    await notifyCompany(c.id, { type: "SYSTEM", title: `You earned the "${badge.name}" badge`, body: parsed.data.note ?? undefined, link: `${companyHome(c)}/company`, email: false });
    revalidate(c.id);
    return ok(undefined, `Badge ${badge.name} granted.`);
  });
}

export async function removeCompanyBadgeAction(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  return runAction(async () => {
    const { log } = await adminActor("admin.companies.write");
    const parsed = parseInput(companyBadgeRemoveSchema, formDataToObject(formData));
    if (!parsed.success) return parsed.result;
    const c = await loadCompany(parsed.data.companyId);
    const [row] = await db.delete(companyBadges).where(and(eq(companyBadges.id, parsed.data.companyBadgeId), eq(companyBadges.companyId, c.id))).returning({ badgeId: companyBadges.badgeId, source: companyBadges.source });
    if (!row) throw new ActionError("Badge not found.", "NOT_FOUND");
    await log({ action: "admin.company.badge.revoke", entityType: "company", entityId: c.id, before: { badgeId: row.badgeId, source: row.source } });
    revalidate(c.id);
    return ok(undefined, "Badge removed.");
  });
}

export async function addCompanyNoteAction(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  return runAction(async () => {
    const { log } = await adminActor("admin.companies.write");
    const parsed = parseInput(companyNoteSchema, formDataToObject(formData));
    if (!parsed.success) return parsed.result;
    const c = await loadCompany(parsed.data.companyId);
    await log({ action: "admin.company.note", entityType: "company", entityId: c.id, after: { note: parsed.data.note } });
    revalidate(c.id);
    return ok(undefined, "Note added.");
  });
}

export async function reviewCertificationAction(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  return runAction(async () => {
    const { log } = await adminActor("admin.companies.write");
    const parsed = parseInput(certificationReviewSchema, formDataToObject(formData));
    if (!parsed.success) return parsed.result;
    const c = await loadCompany(parsed.data.companyId);
    const [row] = await db
      .update(companyCertifications)
      .set({ status: parsed.data.status })
      .where(and(eq(companyCertifications.id, parsed.data.companyCertificationId), eq(companyCertifications.companyId, c.id)))
      .returning({ id: companyCertifications.id, certificationId: companyCertifications.certificationId });
    if (!row) throw new ActionError("Certification not found.", "NOT_FOUND");
    await log({ action: "admin.company.certification", entityType: "company_certification", entityId: row.id, after: { companyId: c.id, status: parsed.data.status } });
    await notifyCompany(c.id, {
      type: "VERIFICATION_STATUS",
      title: parsed.data.status === "VERIFIED" ? "A certification was verified" : "A certification was rejected",
      link: `${companyHome(c)}/company/certifications`,
      email: false,
    });
    revalidate(c.id);
    return ok(undefined, "Certification updated.");
  });
}
