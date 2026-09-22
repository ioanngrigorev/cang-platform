"use server";

import { revalidatePath } from "next/cache";
import { formDataToObject, ok, parseInput, runAction, type ActionResult } from "@/lib/action";
import { requireCompany } from "@/modules/auth/current-user";
import { inspectionIdSchema, requestInspectionSchema } from "./schemas";
import { cancelInspection, requestInspection } from "./service";

function revalidate(orderId?: string | null, inspectionId?: string) {
  revalidatePath("/[locale]/buyer/inspections", "page");
  if (orderId) revalidatePath(`/[locale]/buyer/orders/${orderId}`, "page");
  if (inspectionId) revalidatePath(`/[locale]/buyer/inspections/${inspectionId}`, "page");
}

export async function requestInspectionAction(_prev: ActionResult<{ id: string }> | null, formData: FormData): Promise<ActionResult<{ id: string }>> {
  return runAction(async () => {
    const { user, company } = await requireCompany({ permission: "orders.write", buyer: true });
    const parsed = parseInput(requestInspectionSchema, formDataToObject(formData));
    if (!parsed.success) return parsed.result;
    const row = await requestInspection(company.id, user.id, parsed.data);
    revalidate(parsed.data.orderId, row.id);
    return ok({ id: row.id }, `Inspection ${row.inspectionNumber} requested.`);
  });
}

export async function cancelInspectionAction(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  return runAction(async () => {
    const { user, company } = await requireCompany({ permission: "orders.write", buyer: true });
    const parsed = parseInput(inspectionIdSchema, formDataToObject(formData));
    if (!parsed.success) return parsed.result;
    await cancelInspection(company.id, user.id, parsed.data.inspectionId);
    revalidate(null, parsed.data.inspectionId);
    return ok(undefined, "Inspection cancelled.");
  });
}
