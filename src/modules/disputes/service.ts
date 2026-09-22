import { and, eq, inArray, isNull, or } from "drizzle-orm";
import { db } from "@/db";
import { disputeMessages, disputes, documents, orderEvents, orders, users } from "@/db/schema";
import { ActionError } from "@/lib/action";
import { disputeNumber } from "@/lib/ids";
import { audit } from "@/modules/audit/log";
import { notifyCompany, notifyUser } from "@/modules/notifications/service";
import { transitionOrder } from "@/modules/orders/service";
import type { OpenDisputeInput } from "./schemas";

const RESPONSE_WINDOW_DAYS = 5;

/** Notify platform staff who handle disputes (COMPLIANCE / ADMIN / SUPER_ADMIN). */
async function notifyDisputeStaff(input: { title: string; body?: string; link: string }) {
  const staff = await db.select({ id: users.id }).from(users).where(and(inArray(users.platformRole, ["COMPLIANCE", "ADMIN", "SUPER_ADMIN"]), eq(users.status, "ACTIVE"), isNull(users.deletedAt)));
  await Promise.all(staff.map((s) => notifyUser(s.id, { type: "DISPUTE_UPDATE", ...input, email: false })));
}

/**
 * Buyer raises a dispute on one of its orders:
 * disputes row (OPEN) + order → DISPUTED (freezes escrow release) + notifications to the supplier and staff.
 */
export async function openDispute(companyId: string, userId: string, input: OpenDisputeInput) {
  const [order] = await db.select().from(orders).where(and(eq(orders.id, input.orderId), eq(orders.buyerCompanyId, companyId), isNull(orders.deletedAt))).limit(1);
  if (!order) throw new ActionError("Order not found.", "NOT_FOUND");
  if (["COMPLETED", "CANCELLED", "DISPUTED", "PURCHASE_ORDER"].includes(order.statusCode)) {
    throw new ActionError("A dispute cannot be opened for an order in this status.", "INVALID_STATE");
  }
  const respondBy = new Date(Date.now() + RESPONSE_WINDOW_DAYS * 86400000);
  const dispute = await db.transaction(async (tx) => {
    const [row] = await tx
      .insert(disputes)
      .values({
        disputeNumber: disputeNumber(),
        orderId: order.id,
        raisedByCompanyId: companyId,
        respondentCompanyId: order.supplierCompanyId,
        type: input.type,
        status: "AWAITING_RESPONSE",
        title: input.title,
        description: input.description,
        claimedAmount: input.claimedAmount,
        currency: order.currency,
        respondBy,
      })
      .returning();
    await tx.insert(disputeMessages).values({ disputeId: row.id, authorId: userId, body: input.description });
    await tx.insert(orderEvents).values({
      orderId: order.id,
      type: "DISPUTE",
      title: `Dispute opened: ${input.title}`,
      description: `${row.disputeNumber} · ${input.type.replace(/_/g, " ").toLowerCase()}${input.claimedAmount ? ` · claimed ${order.currency} ${input.claimedAmount}` : ""}`,
      actorId: userId,
      data: { disputeId: row.id },
    });
    await transitionOrder({ orderId: order.id, toStatus: "DISPUTED", actorUserId: userId, actorSide: "BUYER", note: `Dispute ${row.disputeNumber}: ${input.title}`, tx });
    return row;
  });
  await notifyCompany(order.supplierCompanyId, {
    type: "DISPUTE_UPDATE",
    title: `Dispute opened on order ${order.orderNumber}`,
    body: `${input.title}. Please respond within ${RESPONSE_WINDOW_DAYS} days.`,
    link: `/seller/disputes/${dispute.id}`,
  });
  await notifyDisputeStaff({ title: `New dispute ${dispute.disputeNumber} on order ${order.orderNumber}`, body: input.title, link: `/admin/disputes/${dispute.id}` });
  await audit({ actorId: userId, action: "dispute.open", entityType: "dispute", entityId: dispute.id, after: { orderId: order.id, type: input.type, claimedAmount: input.claimedAmount } });
  return dispute;
}

async function partyDispute(companyId: string, disputeId: string) {
  const [d] = await db
    .select()
    .from(disputes)
    .where(and(eq(disputes.id, disputeId), or(eq(disputes.raisedByCompanyId, companyId), eq(disputes.respondentCompanyId, companyId))))
    .limit(1);
  if (!d) throw new ActionError("Dispute not found.", "NOT_FOUND");
  return d;
}

const CLOSED_STATUSES = ["RESOLVED_REFUND", "RESOLVED_PARTIAL_REFUND", "RESOLVED_NO_ACTION", "REJECTED", "CLOSED"];

/** Add a message to the dispute thread (either party); attaches uploaded documents. */
export async function replyToDispute(companyId: string, userId: string, disputeId: string, body: string, documentIds: string[]) {
  const d = await partyDispute(companyId, disputeId);
  if (CLOSED_STATUSES.includes(d.status)) throw new ActionError("This dispute is closed.", "INVALID_STATE");
  const [msg] = await db.insert(disputeMessages).values({ disputeId, authorId: userId, body }).returning();
  if (documentIds.length) {
    await db
      .update(documents)
      .set({ disputeId, orderId: d.orderId, visibility: "COUNTERPARTY" })
      .where(and(inArray(documents.id, documentIds), eq(documents.ownerCompanyId, companyId), isNull(documents.deletedAt)));
  }
  // The other side's turn.
  const isRaiser = d.raisedByCompanyId === companyId;
  if (isRaiser && d.status === "OPEN") await db.update(disputes).set({ status: "AWAITING_RESPONSE" }).where(eq(disputes.id, disputeId));
  if (!isRaiser && d.status === "AWAITING_RESPONSE") await db.update(disputes).set({ status: "UNDER_REVIEW" }).where(eq(disputes.id, disputeId));
  const counterparty = isRaiser ? d.respondentCompanyId : d.raisedByCompanyId;
  await notifyCompany(counterparty, {
    type: "DISPUTE_UPDATE",
    title: `New message in dispute ${d.disputeNumber}`,
    body: body.slice(0, 200),
    link: `/${isRaiser ? "seller" : "buyer"}/disputes/${disputeId}`,
    email: false,
  });
  await audit({ actorId: userId, action: "dispute.reply", entityType: "dispute", entityId: disputeId, after: { messageId: msg.id, documents: documentIds.length } });
  return msg;
}

/** The raising party withdraws / closes the dispute; order returns to DELIVERY (or stays disputed if it cannot). */
export async function closeDispute(companyId: string, userId: string, disputeId: string, resolution?: string | null) {
  const d = await partyDispute(companyId, disputeId);
  if (d.raisedByCompanyId !== companyId) throw new ActionError("Only the party that opened the dispute can close it.", "FORBIDDEN");
  if (CLOSED_STATUSES.includes(d.status)) throw new ActionError("This dispute is already closed.", "INVALID_STATE");
  await db.update(disputes).set({ status: "CLOSED", resolution: resolution ?? "Closed by the buyer.", resolvedById: userId, resolvedAt: new Date(), closedAt: new Date() }).where(eq(disputes.id, disputeId));
  await db.insert(orderEvents).values({ orderId: d.orderId, type: "DISPUTE", title: `Dispute ${d.disputeNumber} closed by the buyer`, description: resolution ?? null, actorId: userId });
  const [order] = await db.select({ statusCode: orders.statusCode, deliveredAt: orders.deliveredAt, shippedAt: orders.shippedAt }).from(orders).where(eq(orders.id, d.orderId)).limit(1);
  if (order?.statusCode === "DISPUTED") {
    // Return the order to the stage it was in before the dispute (best effort from stamps).
    const back = order.deliveredAt ? "DELIVERY" : order.shippedAt ? "SHIPPING" : "PRODUCTION";
    try {
      await transitionOrder({ orderId: d.orderId, toStatus: back, actorUserId: userId, actorSide: "ADMIN", note: `Dispute ${d.disputeNumber} closed — order resumed.` });
    } catch (err) {
      console.error("[dispute] could not restore order status", err);
    }
  }
  await notifyCompany(d.respondentCompanyId, { type: "DISPUTE_UPDATE", title: `Dispute ${d.disputeNumber} was closed by the buyer`, body: resolution ?? undefined, link: `/seller/disputes/${disputeId}` });
  await audit({ actorId: userId, action: "dispute.close", entityType: "dispute", entityId: disputeId, before: { status: d.status }, after: { status: "CLOSED", resolution: resolution ?? null } });
}
