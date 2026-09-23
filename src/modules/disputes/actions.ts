"use server";

import { revalidatePath } from "next/cache";
import { getLocale } from "next-intl/server";
import { z } from "zod";
import { redirect } from "@/i18n/navigation";
import { formDataToObject, ok, parseInput, runAction, type ActionResult } from "@/lib/action";
import { requireCompany } from "@/modules/auth/current-user";
import { disputeIdSchema, disputeReplySchema, openDisputeSchema } from "./schemas";
import { closeDispute, openDispute, replyToDispute } from "./service";

function revalidate(disputeId?: string, orderId?: string) {
  revalidatePath("/[locale]/buyer/disputes", "page");
  revalidatePath("/[locale]/buyer/orders", "page");
  if (disputeId) revalidatePath(`/[locale]/buyer/disputes/${disputeId}`, "page");
  if (orderId) revalidatePath(`/[locale]/buyer/orders/${orderId}`, "page");
  // The supplier dashboard renders the same dispute thread.
  revalidatePath("/[locale]/seller/disputes", "page");
  revalidatePath("/[locale]/seller/orders", "page");
  if (disputeId) revalidatePath(`/[locale]/seller/disputes/${disputeId}`, "page");
  if (orderId) revalidatePath(`/[locale]/seller/orders/${orderId}`, "page");
}

export async function openDisputeAction(_prev: ActionResult<{ id: string }> | null, formData: FormData): Promise<ActionResult<{ id: string }>> {
  return runAction(async () => {
    const { user, company } = await requireCompany({ permission: "disputes.manage", buyer: true });
    const parsed = parseInput(openDisputeSchema, formDataToObject(formData));
    if (!parsed.success) return parsed.result;
    const dispute = await openDispute(company.id, user.id, parsed.data);
    revalidate(dispute.id, parsed.data.orderId);
    redirect({ href: `/buyer/disputes/${dispute.id}`, locale: await getLocale() });
    return ok({ id: dispute.id }, `Dispute ${dispute.disputeNumber} opened. The supplier and our team have been notified.`);
  });
}

export async function replyDisputeAction(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  return runAction(async () => {
    const { user, company } = await requireCompany({ permission: "disputes.manage" });
    const parsed = parseInput(disputeReplySchema, formDataToObject(formData));
    if (!parsed.success) return parsed.result;
    await replyToDispute(company.id, user.id, parsed.data.disputeId, parsed.data.body, parsed.data.documentIds);
    revalidate(parsed.data.disputeId);
    return ok(undefined, "Message sent.");
  });
}

export async function closeDisputeAction(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  return runAction(async () => {
    const { user, company } = await requireCompany({ permission: "disputes.manage" });
    const parsed = parseInput(disputeIdSchema.extend({ resolution: z.string().trim().max(1000).optional() }), formDataToObject(formData));
    if (!parsed.success) return parsed.result;
    await closeDispute(company.id, user.id, parsed.data.disputeId, parsed.data.resolution);
    revalidate(parsed.data.disputeId);
    return ok(undefined, "Dispute closed.");
  });
}
