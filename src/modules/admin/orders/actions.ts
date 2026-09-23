"use server";

import { and, eq, isNull } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { orderEvents, orders } from "@/db/schema";
import { ActionError, formDataToObject, ok, parseInput, runAction, type ActionResult } from "@/lib/action";
import { transitionOrder } from "@/modules/orders/service";
import { adminActor, revalidateAdmin } from "../context";
import { checkbox, idSchema, optionalText, reasonSchema } from "../shared";

const transitionSchema = z.object({ orderId: idSchema, toStatus: z.string().trim().min(1, "Choose a status"), note: optionalText(1000) });
const cancelSchema = z.object({ orderId: idSchema, reason: reasonSchema });
const noteSchema = z.object({ orderId: idSchema, title: z.string().trim().min(2, "Enter a title").max(200), description: optionalText(4000), visibleToBuyer: checkbox, visibleToSupplier: checkbox });

async function load(orderId: string) {
  const [o] = await db.select().from(orders).where(and(eq(orders.id, orderId), isNull(orders.deletedAt))).limit(1);
  if (!o) throw new ActionError("Order not found.", "NOT_FOUND");
  return o;
}

function revalidate(orderId: string) {
  revalidateAdmin("/admin/orders", `/admin/orders/${orderId}`, "/admin", "/admin/payments");
}

export async function adminTransitionOrderAction(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  return runAction(async () => {
    const { user, log } = await adminActor("admin.orders.write");
    const parsed = parseInput(transitionSchema, formDataToObject(formData));
    if (!parsed.success) return parsed.result;
    const o = await load(parsed.data.orderId);
    if (o.statusCode === parsed.data.toStatus) return ok(undefined, "Order is already in that status.");
    await transitionOrder({ orderId: o.id, toStatus: parsed.data.toStatus, actorUserId: user.id, actorSide: "ADMIN", note: parsed.data.note ?? `Status forced by CANG staff.` });
    await log({ action: "admin.order.force_status", entityType: "order", entityId: o.id, before: { status: o.statusCode }, after: { status: parsed.data.toStatus, note: parsed.data.note } });
    revalidate(o.id);
    return ok(undefined, "Order status updated.");
  });
}

export async function adminCancelOrderAction(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  return runAction(async () => {
    const { user, log } = await adminActor("admin.orders.write");
    const parsed = parseInput(cancelSchema, formDataToObject(formData));
    if (!parsed.success) return parsed.result;
    const o = await load(parsed.data.orderId);
    if (o.statusCode === "CANCELLED") throw new ActionError("Order is already cancelled.", "INVALID_STATE");
    if (o.statusCode === "COMPLETED") throw new ActionError("Completed orders cannot be cancelled.", "INVALID_STATE");
    await transitionOrder({ orderId: o.id, toStatus: "CANCELLED", actorUserId: user.id, actorSide: "ADMIN", note: parsed.data.reason });
    await log({ action: "admin.order.cancel", entityType: "order", entityId: o.id, before: { status: o.statusCode }, after: { status: "CANCELLED", reason: parsed.data.reason } });
    revalidate(o.id);
    return ok(undefined, "Order cancelled.");
  });
}

export async function adminOrderNoteAction(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  return runAction(async () => {
    const { user, log } = await adminActor("admin.orders.write");
    const parsed = parseInput(noteSchema, formDataToObject(formData));
    if (!parsed.success) return parsed.result;
    const o = await load(parsed.data.orderId);
    const [ev] = await db
      .insert(orderEvents)
      .values({ orderId: o.id, type: "NOTE", title: parsed.data.title, description: parsed.data.description, actorId: user.id, isVisibleToBuyer: parsed.data.visibleToBuyer, isVisibleToSupplier: parsed.data.visibleToSupplier, data: { source: "admin" } })
      .returning({ id: orderEvents.id });
    await log({ action: "admin.order.note", entityType: "order", entityId: o.id, after: { eventId: ev.id, title: parsed.data.title, visibleToBuyer: parsed.data.visibleToBuyer, visibleToSupplier: parsed.data.visibleToSupplier } });
    revalidate(o.id);
    return ok(undefined, "Note added.");
  });
}
