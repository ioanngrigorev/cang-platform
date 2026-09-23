"use server";

import { revalidatePath } from "next/cache";
import { getLocale } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import { formDataToObject, ok, parseInput, runAction, type ActionResult } from "@/lib/action";
import { requireCompany } from "@/modules/auth/current-user";
import { openDisputeSchema } from "@/modules/disputes/schemas";
import { openSellerDispute } from "./service";

export async function sellerOpenDisputeAction(_prev: ActionResult<{ id: string }> | null, formData: FormData): Promise<ActionResult<{ id: string }>> {
  return runAction(async () => {
    const { user, company } = await requireCompany({ permission: "disputes.manage", seller: true });
    const parsed = parseInput(openDisputeSchema, formDataToObject(formData));
    if (!parsed.success) return parsed.result;
    const dispute = await openSellerDispute(company.id, user.id, parsed.data);
    for (const side of ["seller", "buyer"]) {
      revalidatePath(`/[locale]/${side}/disputes`, "page");
      revalidatePath(`/[locale]/${side}/orders`, "page");
      revalidatePath(`/[locale]/${side}/orders/${parsed.data.orderId}`, "page");
    }
    redirect({ href: `/seller/disputes/${dispute.id}`, locale: await getLocale() });
    return ok({ id: dispute.id }, `Dispute ${dispute.disputeNumber} opened. The buyer and our team have been notified.`);
  });
}
