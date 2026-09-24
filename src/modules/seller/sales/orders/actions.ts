"use server";

import { and, eq, inArray, isNull } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/db";
import { documents, orderStatuses, orders, shipments } from "@/db/schema";
import { ActionError, formDataToObject, ok, parseInput, runAction, type ActionResult } from "@/lib/action";
import { audit } from "@/modules/audit/log";
import { requireCompany } from "@/modules/auth/current-user";
import { addOrderNote, supplierNextStatuses, transitionOrder } from "@/modules/orders/service";
import { SELLER_ORDER_DOCUMENT_TYPES } from "./schemas";
import { shipmentFieldsSchema } from "../shipments/schemas";
import { createShipment } from "../shipments/service";

const orderIdSchema = z.object({ orderId: z.string().min(1) });
const noteSchema = z
  .string()
  .trim()
  .max(1000)
  .optional()
  .transform((v) => (v ? v : undefined));

function revalidate(orderId: string) {
  revalidatePath("/[locale]/seller/orders", "page");
  revalidatePath(`/[locale]/seller/orders/${orderId}`, "page");
  revalidatePath("/[locale]/seller/shipments", "page");
  revalidatePath("/[locale]/seller", "page");
}

async function supplierOrder(companyId: string, orderId: string) {
  const [row] = await db
    .select()
    .from(orders)
    .where(and(eq(orders.id, orderId), eq(orders.supplierCompanyId, companyId), isNull(orders.deletedAt)))
    .limit(1);
  if (!row) throw new ActionError("Order not found.", "NOT_FOUND");
  return row;
}

const transitionSchema = orderIdSchema
  .extend({
    toStatus: z.string().min(1),
    note: noteSchema,
  })
  .merge(shipmentFieldsSchema.partial());

/**
 * Supplier-side status transitions (confirm PO, start production, ready for inspection, mark shipped,
 * mark delivered, cancel). The service enforces the transition graph and the SUPPLIER actor rule;
 * "Mark shipped" registers the first shipment in the same transaction when none exists yet.
 */
export async function sellerTransitionOrderAction(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  return runAction(async () => {
    const { user, company } = await requireCompany({ permission: "orders.write", seller: true });
    const parsed = parseInput(transitionSchema, formDataToObject(formData));
    if (!parsed.success) return parsed.result;
    const { orderId, toStatus, note } = parsed.data;
    const order = await supplierOrder(company.id, orderId);
    const [current] = await db.select({ allowedTransitions: orderStatuses.allowedTransitions }).from(orderStatuses).where(eq(orderStatuses.code, order.statusCode)).limit(1);
    if (!supplierNextStatuses(order.statusCode, current?.allowedTransitions).includes(toStatus)) {
      throw new ActionError("This step is not available for the order right now.", "INVALID_TRANSITION");
    }
    if (toStatus === "CANCELLED" && !note) throw new ActionError("Tell the buyer why the order is cancelled.", "VALIDATION", { note: ["A reason is required"] });

    let createdShipment: string | null = null;
    await db.transaction(async (tx) => {
      if (toStatus === "SHIPPING") {
        const [existing] = await tx.select({ id: shipments.id }).from(shipments).where(eq(shipments.orderId, order.id)).limit(1);
        if (!existing) {
          const s = await createShipment(
            company.id,
            user.id,
            {
              orderId: order.id,
              mode: parsed.data.mode ?? "SEA_FCL",
              carrier: parsed.data.carrier ?? null,
              carrierCode: parsed.data.carrierCode ?? null,
              providerId: parsed.data.providerId ?? null,
              trackingNumber: parsed.data.trackingNumber ?? null,
              vesselOrFlight: parsed.data.vesselOrFlight ?? null,
              containerNumber: parsed.data.containerNumber ?? null,
              originPort: parsed.data.originPort ?? null,
              destinationPort: parsed.data.destinationPort ?? null,
              packages: parsed.data.packages ?? null,
              grossWeightKg: parsed.data.grossWeightKg ?? null,
              volumeCbm: parsed.data.volumeCbm ?? null,
              etd: parsed.data.etd ?? null,
              eta: parsed.data.eta ?? null,
              notes: parsed.data.notes ?? null,
            },
            { tx },
          );
          createdShipment = s.shipmentNumber;
        }
      }
      await transitionOrder({ orderId: order.id, toStatus, actorUserId: user.id, actorSide: "SUPPLIER", note: note ?? null, tx });
    });
    revalidate(order.id);
    const message =
      toStatus === "CANCELLED"
        ? "Order cancelled — the buyer has been notified."
        : toStatus === "SHIPPING"
          ? createdShipment
            ? `Order marked as shipped and shipment ${createdShipment} created.`
            : "Order marked as shipped."
          : "Order updated — the buyer has been notified.";
    return ok(undefined, message);
  });
}

/** Attach already-uploaded documents (from /api/uploads) to the order and share them with the buyer. */
export async function sellerAttachOrderDocumentsAction(_prev: ActionResult<{ count: number }> | null, formData: FormData): Promise<ActionResult<{ count: number }>> {
  return runAction(async () => {
    const { user, company } = await requireCompany({ permission: "orders.write", seller: true });
    const parsed = parseInput(
      orderIdSchema.extend({
        documentIds: z
          .union([z.string(), z.array(z.string())])
          .transform((v) => (Array.isArray(v) ? v : [v]))
          .transform((v) => v.map((s) => s.trim()).filter(Boolean)),
        type: z.enum(SELLER_ORDER_DOCUMENT_TYPES).default("OTHER"),
      }),
      formDataToObject(formData),
    );
    if (!parsed.success) return parsed.result;
    if (!parsed.data.documentIds.length) throw new ActionError("Choose at least one file.", "VALIDATION");
    const order = await supplierOrder(company.id, parsed.data.orderId);
    const updated = await db
      .update(documents)
      .set({ orderId: order.id, type: parsed.data.type, visibility: "COUNTERPARTY" })
      .where(and(inArray(documents.id, parsed.data.documentIds), eq(documents.ownerCompanyId, company.id), isNull(documents.deletedAt)))
      .returning({ id: documents.id });
    if (updated.length) {
      await addOrderNote(order.id, user.id, `Supplier uploaded ${updated.length} document(s)`, null, "DOCUMENT");
      await audit({ actorId: user.id, action: "order.documents.add", entityType: "order", entityId: order.id, after: { count: updated.length, type: parsed.data.type } });
    }
    revalidate(order.id);
    revalidatePath("/[locale]/seller/documents", "page");
    return ok({ count: updated.length }, `${updated.length} document(s) shared with the buyer.`);
  });
}

/** Free-text note added to the order timeline (visible to both sides). */
export async function sellerAddOrderNoteAction(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  return runAction(async () => {
    const { user, company } = await requireCompany({ permission: "orders.write", seller: true });
    const parsed = parseInput(orderIdSchema.extend({ note: z.string().trim().min(2, "Write a note").max(2000) }), formDataToObject(formData));
    if (!parsed.success) return parsed.result;
    const order = await supplierOrder(company.id, parsed.data.orderId);
    await addOrderNote(order.id, user.id, "Note from the supplier", parsed.data.note);
    revalidate(order.id);
    return ok(undefined, "Note added to the timeline.");
  });
}
