import { and, eq, inArray, isNull } from "drizzle-orm";
import { db } from "@/db";
import { disputeMessages, disputes, orderEvents, orders, users } from "@/db/schema";
import { ActionError } from "@/lib/action";
import { disputeNumber } from "@/lib/ids";
import { audit } from "@/modules/audit/log";
import type { OpenDisputeInput } from "@/modules/disputes/schemas";
import { notifyCompany, notifyUser } from "@/modules/notifications/service";
import { transitionOrder } from "@/modules/orders/service";

const RESPONSE_WINDOW_DAYS = 5;

async function notifyDisputeStaff(input: { title: string; body?: string; link: string }) {
  const staff = await db.select({ id: users.id }).from(users).where(and(inArray(users.platformRole, ["COMPLIANCE", "ADMIN", "SUPER_ADMIN"]), eq(users.status, "ACTIVE"), isNull(users.deletedAt)));
  await Promise.all(staff.map((s) => notifyUser(s.id, { type: "DISPUTE_UPDATE", ...input, email: false })));
}

/**
 * Supplier raises a dispute on one of its orders (payment not received, cancelled after production…):
 * disputes row + order → DISPUTED + notifications to the buyer and staff. Mirrors the buyer-side openDispute.
 */
export async function openSellerDispute(companyId: string, userId: string, input: OpenDisputeInput) {
  const [order] = await db.select().from(orders).where(and(eq(orders.id, input.orderId), eq(orders.supplierCompanyId, companyId), isNull(orders.deletedAt))).limit(1);
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
        respondentCompanyId: order.buyerCompanyId,
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
    await transitionOrder({ orderId: order.id, toStatus: "DISPUTED", actorUserId: userId, actorSide: "SUPPLIER", note: `Dispute ${row.disputeNumber}: ${input.title}`, tx });
    return row;
  });
  await notifyCompany(order.buyerCompanyId, {
    type: "DISPUTE_UPDATE",
    title: `Dispute opened on order ${order.orderNumber}`,
    body: `${input.title}. Please respond within ${RESPONSE_WINDOW_DAYS} days.`,
    link: `/buyer/disputes/${dispute.id}`,
  });
  await notifyDisputeStaff({ title: `New dispute ${dispute.disputeNumber} on order ${order.orderNumber}`, body: input.title, link: `/admin/disputes/${dispute.id}` });
  await audit({ actorId: userId, action: "dispute.open", entityType: "dispute", entityId: dispute.id, after: { orderId: order.id, type: input.type, claimedAmount: input.claimedAmount, side: "SUPPLIER" } });
  return dispute;
}
