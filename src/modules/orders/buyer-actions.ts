"use server";

import { and, eq, inArray, isNull } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/db";
import { documents, orders, payments } from "@/db/schema";
import { ActionError, formDataToObject, ok, parseInput, runAction, type ActionResult } from "@/lib/action";
import { audit } from "@/modules/audit/log";
import { requireCompany } from "@/modules/auth/current-user";
import { releasePayment } from "@/modules/payments/service";
import { addOrderNote, transitionOrder } from "./service";

const orderIdSchema = z.object({ orderId: z.string().min(1) });
const noteSchema = z.string().trim().max(1000).optional();

function revalidate(orderId: string) {
  revalidatePath("/[locale]/buyer/orders", "page");
  revalidatePath(`/[locale]/buyer/orders/${orderId}`, "page");
  revalidatePath("/[locale]/buyer", "page");
}

async function buyerOrder(companyId: string, orderId: string) {
  const [row] = await db
    .select()
    .from(orders)
    .where(and(eq(orders.id, orderId), eq(orders.buyerCompanyId, companyId), isNull(orders.deletedAt)))
    .limit(1);
  if (!row) throw new ActionError("Order not found.", "NOT_FOUND");
  return row;
}

/** Buyer-side status transitions (confirm delivery, cancel, …). The service enforces the transition graph. */
export async function buyerTransitionOrderAction(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  return runAction(async () => {
    const { user, company } = await requireCompany({ permission: "orders.write", buyer: true });
    const parsed = parseInput(orderIdSchema.extend({ toStatus: z.enum(["QUALITY_INSPECTION", "DELIVERY", "CANCELLED"]), note: noteSchema }), formDataToObject(formData));
    if (!parsed.success) return parsed.result;
    const order = await buyerOrder(company.id, parsed.data.orderId);
    await transitionOrder({ orderId: order.id, toStatus: parsed.data.toStatus, actorUserId: user.id, actorSide: "BUYER", note: parsed.data.note ?? null });
    revalidate(order.id);
    return ok(undefined, parsed.data.toStatus === "CANCELLED" ? "Order cancelled." : "Order updated.");
  });
}

/**
 * "Confirm receipt & release payment": completes the order and releases every escrow-held payment
 * to the supplier. This is the buyer's side of the Trade Assurance promise.
 */
export async function confirmReceiptAction(_prev: ActionResult<{ released: number }> | null, formData: FormData): Promise<ActionResult<{ released: number }>> {
  return runAction(async () => {
    const { user, company } = await requireCompany({ permission: "orders.write", buyer: true });
    const parsed = parseInput(orderIdSchema.extend({ note: noteSchema }), formDataToObject(formData));
    if (!parsed.success) return parsed.result;
    const order = await buyerOrder(company.id, parsed.data.orderId);
    if (order.statusCode !== "DELIVERY") throw new ActionError("Confirm the delivery first, then release the payment.", "INVALID_STATE");
    await transitionOrder({
      orderId: order.id,
      toStatus: "COMPLETED",
      actorUserId: user.id,
      actorSide: "BUYER",
      note: parsed.data.note ?? "Buyer confirmed receipt of the goods.",
    });
    const held = await db
      .select({ id: payments.id })
      .from(payments)
      .where(and(eq(payments.orderId, order.id), inArray(payments.escrowStatus, ["HELD", "PARTIALLY_RELEASED"])));
    for (const p of held) {
      await releasePayment(p.id, user.id, `Buyer confirmed receipt for order ${order.orderNumber}.`);
    }
    await audit({ actorId: user.id, action: "order.confirmReceipt", entityType: "order", entityId: order.id, after: { released: held.length } });
    revalidate(order.id);
    revalidatePath("/[locale]/buyer/payments", "page");
    return ok({ released: held.length }, held.length ? `Order completed — ${held.length} held payment(s) released to the supplier.` : "Order completed.");
  });
}

/** Attach already-uploaded documents (from /api/uploads) to the order and share them with the supplier. */
export async function attachOrderDocumentsAction(_prev: ActionResult<{ count: number }> | null, formData: FormData): Promise<ActionResult<{ count: number }>> {
  return runAction(async () => {
    const { user, company } = await requireCompany({ permission: "orders.write", buyer: true });
    const parsed = parseInput(
      orderIdSchema.extend({
        documentIds: z
          .union([z.string(), z.array(z.string())])
          .transform((v) => (Array.isArray(v) ? v : [v]))
          .transform((v) => v.map((s) => s.trim()).filter(Boolean)),
        type: z.enum(["PURCHASE_ORDER", "SPECIFICATION", "DRAWING", "CONTRACT", "PACKING_LIST", "PHOTO", "OTHER"]).default("OTHER"),
      }),
      formDataToObject(formData),
    );
    if (!parsed.success) return parsed.result;
    if (!parsed.data.documentIds.length) throw new ActionError("Choose at least one file.", "VALIDATION");
    const order = await buyerOrder(company.id, parsed.data.orderId);
    const updated = await db
      .update(documents)
      .set({ orderId: order.id, type: parsed.data.type, visibility: "COUNTERPARTY" })
      .where(and(inArray(documents.id, parsed.data.documentIds), eq(documents.ownerCompanyId, company.id), isNull(documents.deletedAt)))
      .returning({ id: documents.id });
    if (updated.length) {
      await addOrderNote(order.id, user.id, `Buyer uploaded ${updated.length} document(s)`, updated.length === 1 ? null : null, "DOCUMENT");
      await audit({ actorId: user.id, action: "order.documents.add", entityType: "order", entityId: order.id, after: { count: updated.length } });
    }
    revalidate(order.id);
    revalidatePath("/[locale]/buyer/documents", "page");
    return ok({ count: updated.length }, `${updated.length} document(s) shared with the supplier.`);
  });
}

/** Free-text note added to the order timeline (visible to both sides). */
export async function addOrderNoteAction(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  return runAction(async () => {
    const { user, company } = await requireCompany({ permission: "orders.write", buyer: true });
    const parsed = parseInput(orderIdSchema.extend({ note: z.string().trim().min(2, "Write a note").max(2000) }), formDataToObject(formData));
    if (!parsed.success) return parsed.result;
    const order = await buyerOrder(company.id, parsed.data.orderId);
    await addOrderNote(order.id, user.id, "Note from the buyer", parsed.data.note);
    revalidate(order.id);
    return ok(undefined, "Note added to the timeline.");
  });
}
