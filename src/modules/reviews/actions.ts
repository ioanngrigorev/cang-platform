"use server";

import { revalidatePath } from "next/cache";
import { getLocale } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import { formDataToObject, ok, parseInput, runAction, type ActionResult } from "@/lib/action";
import { requireCompany } from "@/modules/auth/current-user";
import { createReviewSchema } from "./schemas";
import { createReview } from "./service";

export async function createReviewAction(_prev: ActionResult<{ id: string; status: string }> | null, formData: FormData): Promise<ActionResult<{ id: string; status: string }>> {
  return runAction(async () => {
    const { user, company } = await requireCompany({ permission: "reviews.write", buyer: true });
    const parsed = parseInput(createReviewSchema, formDataToObject(formData));
    if (!parsed.success) return parsed.result;
    const { review } = await createReview(company.id, user.id, parsed.data);
    revalidatePath("/[locale]/buyer/reviews", "page");
    revalidatePath("/[locale]/buyer/orders", "page");
    revalidatePath(`/[locale]/buyer/orders/${parsed.data.orderId}`, "page");
    redirect({ href: `/buyer/reviews?submitted=${review.status === "PUBLISHED" ? "published" : "pending"}`, locale: await getLocale() });
    return ok(
      { id: review.id, status: review.status },
      review.status === "PUBLISHED" ? "Thank you — your review is live on the supplier's profile." : "Thank you — your review was submitted and is being checked by our moderation team.",
    );
  });
}
