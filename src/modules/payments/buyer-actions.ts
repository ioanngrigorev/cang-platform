"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/db";
import { payments } from "@/db/schema";
import { ActionError, fail, formDataToObject, ok, parseInput, runAction, type ActionResult } from "@/lib/action";
import { requireCompany } from "@/modules/auth/current-user";
import { confirmPayment, initiatePayment } from "./service";

const paymentIdSchema = z.object({ paymentId: z.string().min(1) });

function revalidate(orderId?: string | null, paymentId?: string) {
  revalidatePath("/[locale]/buyer/payments", "page");
  revalidatePath("/[locale]/buyer/orders", "page");
  revalidatePath("/[locale]/buyer", "page");
  if (orderId) revalidatePath(`/[locale]/buyer/orders/${orderId}`, "page");
  if (paymentId) revalidatePath(`/[locale]/buyer/payments/${paymentId}`, "page");
}

/** The payment must belong to the acting buyer company. */
async function buyerPayment(companyId: string, paymentId: string) {
  const [row] = await db.select().from(payments).where(and(eq(payments.id, paymentId), eq(payments.payerCompanyId, companyId))).limit(1);
  if (!row) throw new ActionError("Payment not found.", "NOT_FOUND");
  return row;
}

/** Buyer starts a payment — the provider adapter returns the transfer instructions. */
export async function initiatePaymentAction(_prev: ActionResult<{ paymentId: string }> | null, formData: FormData): Promise<ActionResult<{ paymentId: string }>> {
  return runAction(async () => {
    const { user, company } = await requireCompany({ permission: "payments.write", buyer: true });
    const parsed = parseInput(paymentIdSchema, formDataToObject(formData));
    if (!parsed.success) return parsed.result;
    const payment = await buyerPayment(company.id, parsed.data.paymentId);
    const result = await initiatePayment(payment.id, user.id);
    revalidate(payment.orderId, payment.id);
    return ok({ paymentId: payment.id }, `Payment instructions generated for ${result.payment.milestoneLabel ?? result.payment.kind}.`);
  });
}

/**
 * Demo-only helper: simulate the bank confirming the transfer.
 * Never available in production — real confirmations arrive through the provider webhook.
 */
export async function simulateBankConfirmationAction(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  return runAction(async () => {
    if (process.env.NODE_ENV === "production") return fail("Not available.", { code: "FORBIDDEN" });
    const { user, company } = await requireCompany({ permission: "payments.write", buyer: true });
    const parsed = parseInput(paymentIdSchema, formDataToObject(formData));
    if (!parsed.success) return parsed.result;
    const payment = await buyerPayment(company.id, parsed.data.paymentId);
    if (payment.status === "CREATED") await initiatePayment(payment.id, user.id);
    await confirmPayment(payment.id, { actorUserId: user.id, source: "demo", evidence: { simulatedBy: user.id, reference: payment.paymentNumber } });
    revalidate(payment.orderId, payment.id);
    return ok(undefined, "Bank transfer confirmed (demo). Funds are now recorded against the order.");
  });
}
