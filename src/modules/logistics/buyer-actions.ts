"use server";

import { revalidatePath } from "next/cache";
import { getLocale } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import { formDataToObject, ok, parseInput, runAction, type ActionResult } from "@/lib/action";
import { requireCompany } from "@/modules/auth/current-user";
import { acceptLogisticsQuoteSchema, logisticsRequestIdSchema, logisticsRequestSchema } from "./schemas";
import { acceptLogisticsQuote, cancelLogisticsRequest, createLogisticsRequest } from "./service";

function revalidate(requestId?: string) {
  revalidatePath("/[locale]/buyer/logistics", "page");
  revalidatePath("/[locale]/buyer/shipments", "page");
  revalidatePath("/[locale]/buyer/orders", "page");
  if (requestId) revalidatePath(`/[locale]/buyer/logistics/${requestId}`, "page");
}

export async function createLogisticsRequestAction(
  _prev: ActionResult<{ id: string; matchedProviders: number }> | null,
  formData: FormData,
): Promise<ActionResult<{ id: string; matchedProviders: number }>> {
  return runAction(async () => {
    const { user, company } = await requireCompany({ permission: "logistics.manage", buyer: true });
    const parsed = parseInput(logisticsRequestSchema, formDataToObject(formData));
    if (!parsed.success) return parsed.result;
    const { request, matchedProviders } = await createLogisticsRequest(company.id, user.id, parsed.data);
    revalidate(request.id);
    redirect({ href: `/buyer/logistics/${request.id}`, locale: await getLocale() });
    return ok({ id: request.id, matchedProviders }, `Request ${request.requestNumber} sent to ${matchedProviders} logistics partner(s).`);
  });
}

export async function acceptLogisticsQuoteAction(_prev: ActionResult<{ shipmentId: string | null }> | null, formData: FormData): Promise<ActionResult<{ shipmentId: string | null }>> {
  return runAction(async () => {
    const { user, company } = await requireCompany({ permission: "logistics.manage", buyer: true });
    const parsed = parseInput(acceptLogisticsQuoteSchema, formDataToObject(formData));
    if (!parsed.success) return parsed.result;
    const result = await acceptLogisticsQuote(company.id, user.id, parsed.data.requestId, parsed.data.quoteId);
    revalidate(parsed.data.requestId);
    redirect({ href: result.shipmentId ? `/buyer/shipments/${result.shipmentId}` : `/buyer/logistics/${parsed.data.requestId}`, locale: await getLocale() });
    return ok(result, result.shipmentId ? "Quote accepted — the shipment is now tracked on your order." : "Quote accepted and the booking confirmed.");
  });
}

export async function cancelLogisticsRequestAction(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  return runAction(async () => {
    const { user, company } = await requireCompany({ permission: "logistics.manage", buyer: true });
    const parsed = parseInput(logisticsRequestIdSchema, formDataToObject(formData));
    if (!parsed.success) return parsed.result;
    await cancelLogisticsRequest(company.id, user.id, parsed.data.requestId);
    revalidate(parsed.data.requestId);
    return ok(undefined, "Logistics request cancelled.");
  });
}
