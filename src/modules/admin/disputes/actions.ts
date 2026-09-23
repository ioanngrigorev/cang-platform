"use server";

import { and, eq, inArray } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { disputeMessages, disputes, orderEvents, orders, payments } from "@/db/schema";
import { ActionError, formDataToObject, ok, parseInput, runAction, type ActionResult } from "@/lib/action";
import { notifyCompany } from "@/modules/notifications/service";
import { transitionOrder } from "@/modules/orders/service";
import { refundPayment } from "@/modules/payments/service";
import { adminActor, revalidateAdmin } from "../context";
import { checkbox, idSchema, optionalNumber, optionalText } from "../shared";

const OUTCOMES = ["RESOLVED_REFUND", "RESOLVED_PARTIAL_REFUND", "RESOLVED_NO_ACTION", "REJECTED"] as const;
const CLOSED = ["RESOLVED_REFUND", "RESOLVED_PARTIAL_REFUND", "RESOLVED_NO_ACTION", "REJECTED", "CLOSED"];

const idOnly = z.object({ disputeId: idSchema });
const messageSchema = z.object({ disputeId: idSchema, body: z.string().trim().min(2, "Write a message").max(8000), isInternal: checkbox });
const resolveSchema = z.object({
  disputeId: idSchema,
  outcome: z.enum(OUTCOMES),
  resolution: z.string().trim().min(10, "Describe the resolution (at least 10 characters)").max(4000),
  refundAmount: optionalNumber,
  refundPaymentId: optionalText(80),
  resumeStatus: optionalText(40),
});

async function load(disputeId: string) {
  const d = await db.query.disputes.findFirst({ where: eq(disputes.id, disputeId), with: { order: true } });
  if (!d) throw new ActionError("Dispute not found.", "NOT_FOUND");
  return d;
}

function revalidate(d: { id: string; orderId: string }) {
  revalidateAdmin("/admin/disputes", `/admin/disputes/${d.id}`, `/admin/orders/${d.orderId}`, "/admin", "/admin/payments");
}

async function notifyBoth(d: { id: string; disputeNumber: string; raisedByCompanyId: string; respondentCompanyId: string }, title: string, body?: string) {
  await notifyCompany(d.raisedByCompanyId, { type: "DISPUTE_UPDATE", title, body, link: `/buyer/disputes/${d.id}` });
  await notifyCompany(d.respondentCompanyId, { type: "DISPUTE_UPDATE", title, body, link: `/seller/disputes/${d.id}` });
}

export async function disputeUnderReviewAction(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  return runAction(async () => {
    const { log } = await adminActor("admin.disputes.resolve");
    const parsed = parseInput(idOnly, formDataToObject(formData));
    if (!parsed.success) return parsed.result;
    const d = await load(parsed.data.disputeId);
    if (CLOSED.includes(d.status)) throw new ActionError("This dispute is closed.", "INVALID_STATE");
    await db.update(disputes).set({ status: "UNDER_REVIEW" }).where(eq(disputes.id, d.id));
    await log({ action: "admin.dispute.under_review", entityType: "dispute", entityId: d.id, before: { status: d.status }, after: { status: "UNDER_REVIEW" } });
    await notifyBoth(d, `Dispute ${d.disputeNumber} is now under review by CANG`, "Our resolution team has taken over the case and will contact both parties.");
    revalidate(d);
    return ok(undefined, "Dispute moved to review.");
  });
}

export async function disputeAdminMessageAction(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  return runAction(async () => {
    const { user, log } = await adminActor("admin.disputes.resolve");
    const parsed = parseInput(messageSchema, formDataToObject(formData));
    if (!parsed.success) return parsed.result;
    const d = await load(parsed.data.disputeId);
    const [msg] = await db.insert(disputeMessages).values({ disputeId: d.id, authorId: user.id, body: parsed.data.body, isInternal: parsed.data.isInternal }).returning({ id: disputeMessages.id });
    if (!parsed.data.isInternal && (d.status === "OPEN" || d.status === "AWAITING_RESPONSE")) await db.update(disputes).set({ status: "MEDIATION" }).where(eq(disputes.id, d.id));
    await log({ action: parsed.data.isInternal ? "admin.dispute.internal_note" : "admin.dispute.message", entityType: "dispute", entityId: d.id, after: { messageId: msg.id } });
    if (!parsed.data.isInternal) await notifyBoth(d, `CANG posted a message in dispute ${d.disputeNumber}`, parsed.data.body.slice(0, 200));
    revalidate(d);
    return ok(undefined, parsed.data.isInternal ? "Internal note saved." : "Message posted to both parties.");
  });
}

export async function resolveDisputeAction(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  return runAction(async () => {
    const { user, log } = await adminActor("admin.disputes.resolve");
    const parsed = parseInput(resolveSchema, formDataToObject(formData));
    if (!parsed.success) return parsed.result;
    const d = await load(parsed.data.disputeId);
    if (CLOSED.includes(d.status)) throw new ActionError("This dispute is already closed.", "INVALID_STATE");
    const wantsRefund = parsed.data.outcome === "RESOLVED_REFUND" || parsed.data.outcome === "RESOLVED_PARTIAL_REFUND";
    let refundAmount = wantsRefund ? (parsed.data.refundAmount ?? null) : null;
    let refunded: { paymentId: string; amount: number } | null = null;
    if (wantsRefund) {
      if (parsed.data.outcome === "RESOLVED_PARTIAL_REFUND" && (!refundAmount || refundAmount <= 0)) throw new ActionError("Enter the partial refund amount.", "VALIDATION", { refundAmount: ["Enter the refund amount"] });
      if (parsed.data.refundPaymentId) {
        const [p] = await db.select().from(payments).where(and(eq(payments.id, parsed.data.refundPaymentId), eq(payments.orderId, d.orderId), inArray(payments.status, ["PAID", "SETTLED", "DISPUTED"]))).limit(1);
        if (!p) throw new ActionError("The selected payment cannot be refunded.", "INVALID_STATE");
        const amount = parsed.data.outcome === "RESOLVED_REFUND" && !refundAmount ? p.amount : Math.min(refundAmount ?? p.amount, p.amount);
        await refundPayment(p.id, user.id, amount, `Dispute ${d.disputeNumber}: ${parsed.data.resolution}`);
        refunded = { paymentId: p.id, amount };
        refundAmount = amount;
      }
    }
    await db.transaction(async (tx) => {
      await tx
        .update(disputes)
        .set({ status: parsed.data.outcome, resolution: parsed.data.resolution, resolutionAmount: refundAmount, resolvedById: user.id, resolvedAt: new Date(), closedAt: new Date() })
        .where(eq(disputes.id, d.id));
      await tx.insert(disputeMessages).values({ disputeId: d.id, authorId: user.id, body: `Resolution (${parsed.data.outcome.replace(/_/g, " ").toLowerCase()}): ${parsed.data.resolution}`, isInternal: false });
      await tx.insert(orderEvents).values({ orderId: d.orderId, type: "DISPUTE", title: `Dispute ${d.disputeNumber} resolved: ${parsed.data.outcome.replace(/_/g, " ").toLowerCase()}`, description: parsed.data.resolution, actorId: user.id, data: { disputeId: d.id, outcome: parsed.data.outcome, refundAmount } });
    });
    // Put the order back on track (or cancel it after a full refund).
    const [order] = await db.select({ statusCode: orders.statusCode, deliveredAt: orders.deliveredAt, shippedAt: orders.shippedAt }).from(orders).where(eq(orders.id, d.orderId)).limit(1);
    if (order?.statusCode === "DISPUTED") {
      const resume = parsed.data.resumeStatus || (parsed.data.outcome === "RESOLVED_REFUND" ? "CANCELLED" : order.deliveredAt ? "DELIVERY" : order.shippedAt ? "SHIPPING" : "PRODUCTION");
      try {
        await transitionOrder({ orderId: d.orderId, toStatus: resume, actorUserId: user.id, actorSide: "ADMIN", note: `Dispute ${d.disputeNumber} resolved by CANG — ${parsed.data.outcome.replace(/_/g, " ").toLowerCase()}.` });
      } catch (err) {
        console.error("[admin.dispute] could not resume order", err);
      }
    }
    await log({ action: "admin.dispute.resolve", entityType: "dispute", entityId: d.id, before: { status: d.status }, after: { status: parsed.data.outcome, resolution: parsed.data.resolution, refund: refunded } });
    await notifyBoth(d, `Dispute ${d.disputeNumber} resolved: ${parsed.data.outcome.replace(/_/g, " ").toLowerCase()}`, parsed.data.resolution);
    revalidate(d);
    return ok(undefined, refunded ? `Dispute resolved and ${refunded.amount} refunded.` : "Dispute resolved.");
  });
}

export async function closeDisputeAdminAction(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  return runAction(async () => {
    const { user, log } = await adminActor("admin.disputes.resolve");
    const parsed = parseInput(idOnly.extend({ resolution: optionalText(2000) }), formDataToObject(formData));
    if (!parsed.success) return parsed.result;
    const d = await load(parsed.data.disputeId);
    if (CLOSED.includes(d.status)) throw new ActionError("This dispute is already closed.", "INVALID_STATE");
    await db.update(disputes).set({ status: "CLOSED", resolution: parsed.data.resolution ?? "Closed by CANG.", resolvedById: user.id, resolvedAt: new Date(), closedAt: new Date() }).where(eq(disputes.id, d.id));
    await db.insert(orderEvents).values({ orderId: d.orderId, type: "DISPUTE", title: `Dispute ${d.disputeNumber} closed by CANG`, description: parsed.data.resolution, actorId: user.id });
    const [order] = await db.select({ statusCode: orders.statusCode, deliveredAt: orders.deliveredAt, shippedAt: orders.shippedAt }).from(orders).where(eq(orders.id, d.orderId)).limit(1);
    if (order?.statusCode === "DISPUTED") {
      const back = order.deliveredAt ? "DELIVERY" : order.shippedAt ? "SHIPPING" : "PRODUCTION";
      try {
        await transitionOrder({ orderId: d.orderId, toStatus: back, actorUserId: user.id, actorSide: "ADMIN", note: `Dispute ${d.disputeNumber} closed — order resumed.` });
      } catch (err) {
        console.error("[admin.dispute] could not restore order status", err);
      }
    }
    await log({ action: "admin.dispute.close", entityType: "dispute", entityId: d.id, before: { status: d.status }, after: { status: "CLOSED", resolution: parsed.data.resolution } });
    await notifyBoth(d, `Dispute ${d.disputeNumber} was closed`, parsed.data.resolution ?? undefined);
    revalidate(d);
    return ok(undefined, "Dispute closed.");
  });
}
