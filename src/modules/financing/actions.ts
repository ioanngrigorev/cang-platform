"use server";

import { revalidatePath } from "next/cache";
import { getLocale } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import { formDataToObject, ok, parseInput, runAction, type ActionResult } from "@/lib/action";
import { requireCompany } from "@/modules/auth/current-user";
import { acceptOfferSchema, applicationIdSchema, financingApplicationSchema } from "./schemas";
import { acceptFinancingOffer, scoreCompany, submitFinancingApplication, withdrawFinancingApplication } from "./service";

function revalidate(applicationId?: string) {
  revalidatePath("/[locale]/buyer/financing", "page");
  revalidatePath("/[locale]/buyer", "page");
  if (applicationId) revalidatePath(`/[locale]/buyer/financing/${applicationId}`, "page");
}

export async function applyForFinancingAction(
  _prev: ActionResult<{ id: string; matched: boolean }> | null,
  formData: FormData,
): Promise<ActionResult<{ id: string; matched: boolean }>> {
  return runAction(async () => {
    const { user, company } = await requireCompany({ permission: "financing.apply", buyer: true });
    const parsed = parseInput(financingApplicationSchema, formDataToObject(formData));
    if (!parsed.success) return parsed.result;
    const { application, routing } = await submitFinancingApplication(company.id, user.id, {
      orderId: parsed.data.orderId,
      productType: parsed.data.productType,
      amount: parsed.data.amount,
      currency: parsed.data.currency,
      requestedTenorDays: parsed.data.requestedTenorDays,
      purpose: parsed.data.purpose,
      annualRevenue: parsed.data.annualRevenue,
      receivables: parsed.data.receivables,
      notes: parsed.data.notes,
      documentIds: parsed.data.documentIds,
    });
    revalidate(application.id);
    redirect({ href: `/buyer/financing/${application.id}`, locale: await getLocale() });
    return ok(
      { id: application.id, matched: routing.matched },
      routing.matched
        ? `Application ${application.applicationNumber} routed to ${routing.providerName} (credit score ${routing.score}, grade ${routing.grade}).`
        : `Application ${application.applicationNumber} submitted. ${routing.reason}`,
    );
  });
}

export async function acceptFinancingOfferAction(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  return runAction(async () => {
    const { user, company } = await requireCompany({ permission: "financing.apply", buyer: true });
    const parsed = parseInput(acceptOfferSchema, formDataToObject(formData));
    if (!parsed.success) return parsed.result;
    await acceptFinancingOffer(company.id, user.id, parsed.data.applicationId, parsed.data.offerId);
    revalidate(parsed.data.applicationId);
    return ok(undefined, "Offer accepted. The partner will contact you to complete the documentation.");
  });
}

export async function withdrawFinancingAction(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  return runAction(async () => {
    const { user, company } = await requireCompany({ permission: "financing.apply", buyer: true });
    const parsed = parseInput(applicationIdSchema, formDataToObject(formData));
    if (!parsed.success) return parsed.result;
    await withdrawFinancingApplication(company.id, user.id, parsed.data.applicationId);
    revalidate(parsed.data.applicationId);
    return ok(undefined, "Application withdrawn.");
  });
}

/** Recompute the company's credit score on demand (also refreshed automatically when routing). */
export async function refreshCreditScoreAction(_prev: ActionResult<{ score: number; grade: string }> | null): Promise<ActionResult<{ score: number; grade: string }>> {
  return runAction(async () => {
    const { company } = await requireCompany({ permission: "financing.apply", buyer: true });
    const snapshot = await scoreCompany(company.id);
    revalidate();
    return ok({ score: snapshot.score, grade: snapshot.grade }, `Credit score refreshed: ${snapshot.score}/100 (grade ${snapshot.grade}).`);
  });
}
