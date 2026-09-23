"use server";

import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { financingApplications, financingOffers, financingProviders } from "@/db/schema";
import { ActionError, formDataToObject, ok, parseInput, runAction, type ActionResult } from "@/lib/action";
import { notifyCompany } from "@/modules/notifications/service";
import { adminActor, revalidateAdmin } from "../context";
import { idSchema, optionalDate, optionalNumber, optionalText, requiredInt, requiredNumber } from "../shared";

const decisionSchema = z.object({ applicationId: idSchema, decision: z.enum(["UNDER_REVIEW", "DECLINED", "FUNDED", "REPAID"]), reason: optionalText(2000) });
const offerSchema = z.object({
  applicationId: idSchema,
  providerId: idSchema,
  amount: requiredNumber.refine((n) => n > 0, "Enter an amount"),
  interestRate: optionalNumber,
  feePercent: optionalNumber,
  tenorDays: requiredInt.min(1, "Enter the tenor in days"),
  validUntil: optionalDate,
  terms: optionalText(4000),
});
const providerToggleSchema = z.object({ providerId: idSchema, isActive: z.enum(["true", "false"]) });

async function load(id: string) {
  const app = await db.query.financingApplications.findFirst({ where: eq(financingApplications.id, id), with: { company: { columns: { id: true, isSeller: true, isBuyer: true } } } });
  if (!app) throw new ActionError("Application not found.", "NOT_FOUND");
  return app;
}

const linkFor = (app: { id: string; side: string }) => `/${app.side === "SELLER" ? "seller" : "buyer"}/financing/${app.id}`;

export async function financingDecisionAction(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  return runAction(async () => {
    const { log } = await adminActor("admin.financing.write");
    const parsed = parseInput(decisionSchema, formDataToObject(formData));
    if (!parsed.success) return parsed.result;
    const app = await load(parsed.data.applicationId);
    const d = parsed.data.decision;
    if (d === "DECLINED" && !parsed.data.reason) throw new ActionError("Give the applicant a reason.", "VALIDATION", { reason: ["Give the applicant a reason."] });
    const now = new Date();
    await db
      .update(financingApplications)
      .set({
        status: d,
        ...(d === "DECLINED" ? { declineReason: parsed.data.reason, decidedAt: now } : {}),
        ...(d === "FUNDED" ? { fundedAt: now, decidedAt: app.decidedAt ?? now } : {}),
        ...(d === "REPAID" ? { repaidAt: now } : {}),
        ...(parsed.data.reason && d !== "DECLINED" ? { notes: parsed.data.reason } : {}),
      })
      .where(eq(financingApplications.id, app.id));
    await log({ action: `admin.financing.${d.toLowerCase()}`, entityType: "financingApplication", entityId: app.id, before: { status: app.status }, after: { status: d, reason: parsed.data.reason } });
    const titles: Record<typeof d, string> = {
      UNDER_REVIEW: `Application ${app.applicationNumber} is under review`,
      DECLINED: `Application ${app.applicationNumber} was declined`,
      FUNDED: `Application ${app.applicationNumber} has been funded`,
      REPAID: `Application ${app.applicationNumber} is fully repaid`,
    };
    await notifyCompany(app.companyId, { type: "FINANCING_UPDATE", title: titles[d], body: parsed.data.reason ?? undefined, link: linkFor(app) });
    revalidateAdmin("/admin/financing", "/admin");
    return ok(undefined, "Application updated.");
  });
}

export async function recordFinancingOfferAction(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  return runAction(async () => {
    const { log } = await adminActor("admin.financing.write");
    const parsed = parseInput(offerSchema, formDataToObject(formData));
    if (!parsed.success) return parsed.result;
    const app = await load(parsed.data.applicationId);
    if (["FUNDED", "REPAYING", "REPAID", "DECLINED", "CANCELLED", "WITHDRAWN", "DEFAULTED"].includes(app.status)) throw new ActionError("This application no longer accepts offers.", "INVALID_STATE");
    const [provider] = await db.select({ id: financingProviders.id, name: financingProviders.name }).from(financingProviders).where(eq(financingProviders.id, parsed.data.providerId)).limit(1);
    if (!provider) throw new ActionError("Provider not found.", "NOT_FOUND");
    const feeAmount = parsed.data.feePercent != null ? Math.round(parsed.data.amount * (parsed.data.feePercent / 100) * 100) / 100 : null;
    const [offer] = await db
      .insert(financingOffers)
      .values({
        applicationId: app.id,
        providerId: provider.id,
        status: "OFFERED",
        amount: parsed.data.amount,
        currency: app.currency,
        interestRate: parsed.data.interestRate,
        feePercent: parsed.data.feePercent,
        feeAmount,
        tenorDays: parsed.data.tenorDays,
        terms: parsed.data.terms,
        validUntil: parsed.data.validUntil ?? new Date(Date.now() + 14 * 86400000),
      })
      .returning({ id: financingOffers.id });
    await db.update(financingApplications).set({ status: "OFFERED", providerId: app.providerId ?? provider.id, decidedAt: new Date() }).where(eq(financingApplications.id, app.id));
    await log({ action: "admin.financing.offer", entityType: "financingApplication", entityId: app.id, after: { offerId: offer.id, providerId: provider.id, amount: parsed.data.amount, tenorDays: parsed.data.tenorDays, interestRate: parsed.data.interestRate } });
    await notifyCompany(app.companyId, { type: "FINANCING_UPDATE", title: `Offer received for ${app.applicationNumber}`, body: `${provider.name} · ${app.currency} ${parsed.data.amount} over ${parsed.data.tenorDays} days.`, link: linkFor(app) });
    revalidateAdmin("/admin/financing");
    return ok(undefined, "Offer recorded and the applicant notified.");
  });
}

export async function toggleFinancingProviderAction(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  return runAction(async () => {
    const { log } = await adminActor("admin.financing.write");
    const parsed = parseInput(providerToggleSchema, formDataToObject(formData));
    if (!parsed.success) return parsed.result;
    const active = parsed.data.isActive === "true";
    const [row] = await db.update(financingProviders).set({ isActive: active }).where(eq(financingProviders.id, parsed.data.providerId)).returning({ id: financingProviders.id, code: financingProviders.code });
    if (!row) throw new ActionError("Provider not found.", "NOT_FOUND");
    await log({ action: "admin.financing.provider.toggle", entityType: "financing_provider", entityId: row.id, after: { code: row.code, isActive: active } });
    revalidateAdmin("/admin/financing", "/admin/providers");
    return ok(undefined, active ? "Provider activated." : "Provider deactivated.");
  });
}
