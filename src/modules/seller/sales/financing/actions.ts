"use server";

import { revalidatePath } from "next/cache";
import { formDataToObject, ok, parseInput, runAction, type ActionResult } from "@/lib/action";
import { requireCompany } from "@/modules/auth/current-user";
import { acceptOfferSchema, applicationIdSchema } from "@/modules/financing/schemas";
import { acceptFinancingOffer, scoreCompany, withdrawFinancingApplication } from "@/modules/financing/service";
import { sellerFinancingSchema } from "./schemas";
import { submitSellerFinancingApplication } from "./service";

function revalidate(applicationId?: string) {
  revalidatePath("/[locale]/seller/financing", "page");
  revalidatePath("/[locale]/seller", "page");
  if (applicationId) revalidatePath(`/[locale]/seller/financing/${applicationId}`, "page");
}

export async function applySellerFinancingAction(_prev: ActionResult<{ id: string; matched: boolean }> | null, formData: FormData): Promise<ActionResult<{ id: string; matched: boolean }>> {
  return runAction(async () => {
    const { user, company } = await requireCompany({ permission: "financing.apply", seller: true });
    const parsed = parseInput(sellerFinancingSchema, formDataToObject(formData));
    if (!parsed.success) return parsed.result;
    const { application, routing } = await submitSellerFinancingApplication(company.id, user.id, parsed.data);
    revalidate(application.id);
    return ok(
      { id: application.id, matched: routing.matched },
      routing.matched
        ? `Application ${application.applicationNumber} routed to ${routing.providerName} (credit score ${routing.score}, grade ${routing.grade}).`
        : `Application ${application.applicationNumber} submitted. ${routing.reason}`,
    );
  });
}

export async function acceptSellerFinancingOfferAction(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  return runAction(async () => {
    const { user, company } = await requireCompany({ permission: "financing.apply", seller: true });
    const parsed = parseInput(acceptOfferSchema, formDataToObject(formData));
    if (!parsed.success) return parsed.result;
    await acceptFinancingOffer(company.id, user.id, parsed.data.applicationId, parsed.data.offerId);
    revalidate(parsed.data.applicationId);
    return ok(undefined, "Offer accepted. The partner will contact you to complete the documentation.");
  });
}

export async function withdrawSellerFinancingAction(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  return runAction(async () => {
    const { user, company } = await requireCompany({ permission: "financing.apply", seller: true });
    const parsed = parseInput(applicationIdSchema, formDataToObject(formData));
    if (!parsed.success) return parsed.result;
    await withdrawFinancingApplication(company.id, user.id, parsed.data.applicationId);
    revalidate(parsed.data.applicationId);
    return ok(undefined, "Application withdrawn.");
  });
}

/** Recompute the supplier's credit score on demand (also refreshed automatically when routing). */
export async function refreshSellerCreditScoreAction(_prev: ActionResult<{ score: number; grade: string }> | null): Promise<ActionResult<{ score: number; grade: string }>> {
  return runAction(async () => {
    const { company } = await requireCompany({ permission: "financing.apply", seller: true });
    const snapshot = await scoreCompany(company.id);
    revalidate();
    return ok({ score: snapshot.score, grade: snapshot.grade }, `Credit score refreshed: ${snapshot.score}/100 (grade ${snapshot.grade}).`);
  });
}
