"use server";

import { revalidatePath } from "next/cache";
import { formDataToObject, ok, parseInput, runAction, type ActionResult } from "@/lib/action";
import { requireCompany } from "@/modules/auth/current-user";
import { createShipmentSchema, shipmentEventSchema, updateShipmentSchema } from "./schemas";
import { addShipmentEvent, createShipment, updateShipment } from "./service";

function revalidate(orderId?: string, shipmentId?: string) {
  revalidatePath("/[locale]/seller/shipments", "page");
  revalidatePath("/[locale]/seller/orders", "page");
  revalidatePath("/[locale]/seller", "page");
  if (orderId) revalidatePath(`/[locale]/seller/orders/${orderId}`, "page");
  if (shipmentId) revalidatePath(`/[locale]/seller/shipments/${shipmentId}`, "page");
}

export async function createShipmentAction(_prev: ActionResult<{ id: string; shipmentNumber: string }> | null, formData: FormData): Promise<ActionResult<{ id: string; shipmentNumber: string }>> {
  return runAction(async () => {
    const { user, company } = await requireCompany({ permission: "logistics.manage", seller: true });
    const parsed = parseInput(createShipmentSchema, formDataToObject(formData));
    if (!parsed.success) return parsed.result;
    const shipment = await createShipment(company.id, user.id, parsed.data);
    revalidate(shipment.orderId, shipment.id);
    return ok({ id: shipment.id, shipmentNumber: shipment.shipmentNumber }, `Shipment ${shipment.shipmentNumber} created.`);
  });
}

export async function addShipmentEventAction(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  return runAction(async () => {
    const { user, company } = await requireCompany({ permission: "logistics.manage", seller: true });
    const parsed = parseInput(shipmentEventSchema, formDataToObject(formData));
    if (!parsed.success) return parsed.result;
    await addShipmentEvent(company.id, user.id, parsed.data);
    revalidate(undefined, parsed.data.shipmentId);
    return ok(undefined, "Shipment updated — the buyer has been notified.");
  });
}

export async function updateShipmentAction(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  return runAction(async () => {
    const { user, company } = await requireCompany({ permission: "logistics.manage", seller: true });
    const parsed = parseInput(updateShipmentSchema, formDataToObject(formData));
    if (!parsed.success) return parsed.result;
    const row = await updateShipment(company.id, user.id, parsed.data);
    revalidate(row.orderId, row.id);
    return ok(undefined, "Shipment details saved.");
  });
}
