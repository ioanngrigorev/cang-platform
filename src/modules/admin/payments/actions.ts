"use server";

import { z } from "zod";
import { formDataToObject, ok, parseInput, runAction, type ActionResult } from "@/lib/action";
import { confirmPayment, refundPayment, releasePayment } from "@/modules/payments/service";
import { adminActor, revalidateAdmin } from "../context";
import { idSchema, optionalNumber, optionalText, reasonSchema } from "../shared";

const confirmSchema = z.object({ paymentId: idSchema, bankReference: optionalText(200), note: optionalText(1000) });
const releaseSchema = z.object({ paymentId: idSchema, reason: reasonSchema });
const refundSchema = z.object({ paymentId: idSchema, amount: optionalNumber, reason: reasonSchema });

function revalidate() {
  revalidateAdmin("/admin/payments", "/admin/orders", "/admin", "/admin/fees");
}

export async function adminConfirmPaymentAction(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  return runAction(async () => {
    const { user, log } = await adminActor("admin.payments.write");
    const parsed = parseInput(confirmSchema, formDataToObject(formData));
    if (!parsed.success) return parsed.result;
    const p = await confirmPayment(parsed.data.paymentId, { actorUserId: user.id, source: "admin", evidence: { bankReference: parsed.data.bankReference ?? undefined, note: parsed.data.note ?? undefined, confirmedBy: user.id } });
    await log({ action: "admin.payment.confirm", entityType: "payment", entityId: p.id, after: { bankReference: parsed.data.bankReference, note: parsed.data.note, orderId: p.orderId } });
    revalidate();
    if (p.orderId) revalidateAdmin(`/admin/orders/${p.orderId}`);
    return ok(undefined, "Payment confirmed.");
  });
}

export async function adminReleasePaymentAction(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  return runAction(async () => {
    const { user, log } = await adminActor("admin.payments.write");
    const parsed = parseInput(releaseSchema, formDataToObject(formData));
    if (!parsed.success) return parsed.result;
    await releasePayment(parsed.data.paymentId, user.id, parsed.data.reason);
    await log({ action: "admin.payment.release", entityType: "payment", entityId: parsed.data.paymentId, after: { reason: parsed.data.reason } });
    revalidate();
    return ok(undefined, "Funds released to the supplier.");
  });
}

export async function adminRefundPaymentAction(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  return runAction(async () => {
    const { user, log } = await adminActor("admin.payments.write");
    const parsed = parseInput(refundSchema, formDataToObject(formData));
    if (!parsed.success) return parsed.result;
    const amount = parsed.data.amount && parsed.data.amount > 0 ? parsed.data.amount : undefined;
    await refundPayment(parsed.data.paymentId, user.id, amount, parsed.data.reason);
    await log({ action: "admin.payment.refund", entityType: "payment", entityId: parsed.data.paymentId, after: { amount: amount ?? "full", reason: parsed.data.reason } });
    revalidate();
    return ok(undefined, "Refund recorded.");
  });
}
