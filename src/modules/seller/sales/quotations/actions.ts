"use server";

import { revalidatePath } from "next/cache";
import { getLocale } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import { formDataToObject, ok, parseInput, runAction, type ActionResult } from "@/lib/action";
import { requireCompany } from "@/modules/auth/current-user";
import { quotationFormSchema, quotationIdSchema, withdrawQuotationSchema } from "./schemas";
import { deleteDraftQuotation, reviseQuotation, saveQuotationDraft, submitQuotation, withdrawQuotation } from "./service";

type QuotationRef = { id: string; quotationNumber: string; status: string };

function revalidate(rfqId?: string, quotationId?: string) {
  revalidatePath("/[locale]/seller/quotations", "page");
  revalidatePath("/[locale]/seller/rfqs", "page");
  revalidatePath("/[locale]/seller", "page");
  if (rfqId) revalidatePath(`/[locale]/seller/rfqs/${rfqId}`, "page");
  if (quotationId) revalidatePath(`/[locale]/seller/quotations/${quotationId}`, "page");
}

export async function saveQuotationDraftAction(_prev: ActionResult<QuotationRef> | null, formData: FormData): Promise<ActionResult<QuotationRef>> {
  return runAction(async () => {
    const { user, company } = await requireCompany({ permission: "quotation.write", seller: true });
    const parsed = parseInput(quotationFormSchema, formDataToObject(formData));
    if (!parsed.success) return parsed.result;
    const q = await saveQuotationDraft(company.id, user.id, parsed.data);
    revalidate(q.rfqId, q.id);
    redirect({ href: `/seller/quotations/${q.id}?saved=draft`, locale: await getLocale() });
    return ok({ id: q.id, quotationNumber: q.quotationNumber, status: q.status }, "Draft saved.");
  });
}

export async function submitQuotationAction(_prev: ActionResult<QuotationRef> | null, formData: FormData): Promise<ActionResult<QuotationRef>> {
  return runAction(async () => {
    const { user, company } = await requireCompany({ permission: "quotation.write", seller: true });
    const parsed = parseInput(quotationFormSchema, formDataToObject(formData));
    if (!parsed.success) return parsed.result;
    const q = await submitQuotation(company.id, user.id, company.name, parsed.data);
    revalidate(q.rfqId, q.id);
    redirect({ href: `/seller/quotations/${q.id}?saved=submitted`, locale: await getLocale() });
    return ok({ id: q.id, quotationNumber: q.quotationNumber, status: q.status }, `Quotation ${q.quotationNumber} sent to the buyer.`);
  });
}

/** Submit a new revision of a quotation that is still with the buyer (parent id travels as `quotationId`). */
export async function reviseQuotationAction(_prev: ActionResult<QuotationRef> | null, formData: FormData): Promise<ActionResult<QuotationRef>> {
  return runAction(async () => {
    const { user, company } = await requireCompany({ permission: "quotation.write", seller: true });
    const parsed = parseInput(quotationFormSchema, formDataToObject(formData));
    if (!parsed.success) return parsed.result;
    if (!parsed.data.quotationId) return { ok: false, error: "Quotation not found.", code: "NOT_FOUND" };
    const q = await reviseQuotation(company.id, user.id, company.name, parsed.data.quotationId, parsed.data);
    revalidate(q.rfqId, q.id);
    revalidatePath(`/[locale]/seller/quotations/${parsed.data.quotationId}`, "page");
    redirect({ href: `/seller/quotations/${q.id}?saved=revised`, locale: await getLocale() });
    return ok({ id: q.id, quotationNumber: q.quotationNumber, status: q.status }, `Revision ${q.revisionNumber} sent to the buyer.`);
  });
}

export async function withdrawQuotationAction(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  return runAction(async () => {
    const { user, company } = await requireCompany({ permission: "quotation.write", seller: true });
    const parsed = parseInput(withdrawQuotationSchema, formDataToObject(formData));
    if (!parsed.success) return parsed.result;
    await withdrawQuotation(company.id, user.id, company.name, parsed.data.quotationId, parsed.data.reason);
    revalidate(undefined, parsed.data.quotationId);
    return ok(undefined, "Quotation withdrawn.");
  });
}

export async function deleteDraftQuotationAction(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  return runAction(async () => {
    const { user, company } = await requireCompany({ permission: "quotation.write", seller: true });
    const parsed = parseInput(quotationIdSchema, formDataToObject(formData));
    if (!parsed.success) return parsed.result;
    const q = await deleteDraftQuotation(company.id, user.id, parsed.data.quotationId);
    revalidate(q.rfqId, q.id);
    redirect({ href: "/seller/quotations?tab=draft", locale: await getLocale() });
    return ok(undefined, "Draft deleted.");
  });
}
