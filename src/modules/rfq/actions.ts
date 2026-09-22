"use server";

import { revalidatePath } from "next/cache";
import { getLocale } from "next-intl/server";
import { z } from "zod";
import { redirect } from "@/i18n/navigation";
import { fail, formDataToObject, ok, parseInput, runAction, type ActionResult } from "@/lib/action";
import { RATE_LIMITS, rateLimit } from "@/lib/rate-limit";
import { requireCompany } from "@/modules/auth/current-user";
import { createOrderFromQuotation } from "@/modules/orders/service";
import { acceptQuotationSchema, buyerNotesSchema, rejectQuotationSchema, revisionRequestSchema, rfqFormSchema, rfqIdSchema } from "./schemas";
import { orderForQuotation } from "./queries";
import { closeRfq, createRfq, duplicateRfq, publishBuyerRfq, rejectQuotation, requestQuotationRevision, saveQuotationBuyerNotes, updateDraftRfq } from "./service";

function revalidateRfqs(rfqId?: string) {
  revalidatePath("/[locale]/buyer/rfqs", "page");
  revalidatePath("/[locale]/buyer/quotations", "page");
  revalidatePath("/[locale]/buyer", "page");
  if (rfqId) revalidatePath(`/[locale]/buyer/rfqs/${rfqId}`, "page");
}

/** Create an RFQ from the multi-section form. `intent` = draft | publish. */
export async function createRfqAction(_prev: ActionResult<{ id: string }> | null, formData: FormData): Promise<ActionResult<{ id: string; matched: number; published: boolean }>> {
  return runAction(async () => {
    const { user, company } = await requireCompany({ permission: "rfq.write", buyer: true });
    const rl = await rateLimit(`rfq:${company.id}`, RATE_LIMITS.rfq);
    if (!rl.allowed) return fail("You have created too many RFQs recently. Please try again later.", { code: "RATE_LIMITED" });
    const parsed = parseInput(rfqFormSchema, formDataToObject(formData));
    if (!parsed.success) return parsed.result;
    const { rfq, matched } = await createRfq(company.id, user.id, parsed.data);
    revalidateRfqs(rfq.id);
    const published = parsed.data.intent === "publish";
    redirect({ href: `/buyer/rfqs/${rfq.id}?${published ? `published=1&matched=${matched}` : "draft=1"}`, locale: await getLocale() });
    return ok({ id: rfq.id, matched, published }, published ? `RFQ published — ${matched} matching suppliers notified.` : "Draft saved.");
  });
}

export async function updateRfqAction(_prev: ActionResult<{ id: string }> | null, formData: FormData): Promise<ActionResult<{ id: string; matched: number; published: boolean }>> {
  return runAction(async () => {
    const { user, company } = await requireCompany({ permission: "rfq.write", buyer: true });
    const rfqId = String(formData.get("rfqId") ?? "");
    if (!rfqId) return fail("Missing RFQ id.");
    const parsed = parseInput(rfqFormSchema, formDataToObject(formData));
    if (!parsed.success) return parsed.result;
    const { matched } = await updateDraftRfq(company.id, user.id, rfqId, parsed.data);
    revalidateRfqs(rfqId);
    const published = parsed.data.intent === "publish";
    redirect({ href: `/buyer/rfqs/${rfqId}?${published ? `published=1&matched=${matched}` : "draft=1"}`, locale: await getLocale() });
    return ok({ id: rfqId, matched, published }, published ? `RFQ published — ${matched} matching suppliers notified.` : "Draft updated.");
  });
}

export async function publishRfqAction(_prev: ActionResult<{ matched: number }> | null, formData: FormData): Promise<ActionResult<{ matched: number }>> {
  return runAction(async () => {
    const { user, company } = await requireCompany({ permission: "rfq.write", buyer: true });
    const parsed = parseInput(rfqIdSchema, formDataToObject(formData));
    if (!parsed.success) return parsed.result;
    const matched = await publishBuyerRfq(company.id, user.id, parsed.data.rfqId);
    revalidateRfqs(parsed.data.rfqId);
    return ok({ matched }, `RFQ published — ${matched} matching suppliers notified.`);
  });
}

export async function closeRfqAction(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  return runAction(async () => {
    const { user, company } = await requireCompany({ permission: "rfq.write", buyer: true });
    const parsed = parseInput(rfqIdSchema.extend({ reason: z.string().trim().max(500).optional() }), formDataToObject(formData));
    if (!parsed.success) return parsed.result;
    await closeRfq(company.id, user.id, parsed.data.rfqId, "CLOSED", parsed.data.reason);
    revalidateRfqs(parsed.data.rfqId);
    return ok(undefined, "RFQ closed.");
  });
}

export async function cancelRfqAction(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  return runAction(async () => {
    const { user, company } = await requireCompany({ permission: "rfq.write", buyer: true });
    const parsed = parseInput(rfqIdSchema.extend({ reason: z.string().trim().max(500).optional() }), formDataToObject(formData));
    if (!parsed.success) return parsed.result;
    await closeRfq(company.id, user.id, parsed.data.rfqId, "CANCELLED", parsed.data.reason);
    revalidateRfqs(parsed.data.rfqId);
    return ok(undefined, "RFQ cancelled.");
  });
}

export async function duplicateRfqAction(_prev: ActionResult<{ id: string }> | null, formData: FormData): Promise<ActionResult<{ id: string }>> {
  return runAction(async () => {
    const { user, company } = await requireCompany({ permission: "rfq.write", buyer: true });
    const parsed = parseInput(rfqIdSchema, formDataToObject(formData));
    if (!parsed.success) return parsed.result;
    const copy = await duplicateRfq(company.id, user.id, parsed.data.rfqId);
    revalidateRfqs();
    return ok({ id: copy.id }, "RFQ duplicated as a new draft.");
  });
}

/** Accept a quotation → creates the order (items, events, payment schedule) and awards the RFQ. */
export async function acceptQuotationAction(_prev: ActionResult<{ orderId: string }> | null, formData: FormData): Promise<ActionResult<{ orderId: string }>> {
  return runAction(async () => {
    const { user, company } = await requireCompany({ permission: "orders.write", buyer: true });
    const parsed = parseInput(acceptQuotationSchema, formDataToObject(formData));
    if (!parsed.success) return parsed.result;
    const { quotationId, tradeAssurance, buyerNotes, ...address } = parsed.data;
    // A double submit (or a stale tab) must not award the same quotation twice.
    const existing = await orderForQuotation(company.id, quotationId);
    if (existing) {
      redirect({ href: `/buyer/orders/${existing.id}`, locale: await getLocale() });
      return ok({ orderId: existing.id });
    }
    const order = await createOrderFromQuotation({
      quotationId,
      actorUserId: user.id,
      buyerCompanyId: company.id,
      tradeAssurance,
      shippingAddress: {
        company: address.company ?? undefined,
        contactName: address.contactName ?? undefined,
        phone: address.phone ?? undefined,
        line1: address.line1,
        line2: address.line2 ?? undefined,
        city: address.city,
        state: address.state ?? undefined,
        postalCode: address.postalCode ?? undefined,
        countryCode: address.countryCode,
      },
      buyerNotes,
    });
    revalidateRfqs();
    revalidatePath("/[locale]/buyer/orders", "page");
    // Redirect server-side: revalidation unmounts the dialog that triggered this action,
    // so a client-side push after the fact is not reliable.
    redirect({ href: `/buyer/orders/${order.id}`, locale: await getLocale() });
    return ok({ orderId: order.id }, `Order ${order.orderNumber} created.`);
  });
}

export async function rejectQuotationAction(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  return runAction(async () => {
    const { user, company } = await requireCompany({ permission: "rfq.write", buyer: true });
    const parsed = parseInput(rejectQuotationSchema, formDataToObject(formData));
    if (!parsed.success) return parsed.result;
    await rejectQuotation(company.id, user.id, parsed.data.quotationId, parsed.data.reason);
    revalidateRfqs();
    return ok(undefined, "Quotation rejected. The supplier has been notified.");
  });
}

export async function requestRevisionAction(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  return runAction(async () => {
    const { user, company } = await requireCompany({ permission: "rfq.write", buyer: true });
    const parsed = parseInput(revisionRequestSchema, formDataToObject(formData));
    if (!parsed.success) return parsed.result;
    await requestQuotationRevision(company.id, user.id, parsed.data.quotationId, parsed.data.message);
    revalidateRfqs();
    return ok(undefined, "Revision request sent to the supplier.");
  });
}

export async function saveBuyerNotesAction(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  return runAction(async () => {
    const { company } = await requireCompany({ permission: "quotation.read", buyer: true });
    const parsed = parseInput(buyerNotesSchema, formDataToObject(formData));
    if (!parsed.success) return parsed.result;
    await saveQuotationBuyerNotes(company.id, parsed.data.quotationId, parsed.data.buyerNotes);
    revalidateRfqs();
    return ok(undefined, "Notes saved.");
  });
}
