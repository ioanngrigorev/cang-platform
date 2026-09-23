"use server";

import { and, eq, isNull } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/db";
import { reviews } from "@/db/schema";
import { ActionError, formDataToObject, ok, parseInput, runAction, type ActionResult } from "@/lib/action";
import { audit } from "@/modules/audit/log";
import { requireCompany } from "@/modules/auth/current-user";
import { notifyCompany } from "@/modules/notifications/service";

const replySchema = z.object({
  reviewId: z.string().min(1),
  reply: z.string().trim().min(2, "Write a reply").max(2000, "Keep the reply under 2000 characters"),
});

/** Public reply from the supplier under a review it received (can be edited later). */
export async function replyReviewAction(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  return runAction(async () => {
    const { user, company } = await requireCompany({ permission: "reviews.write", seller: true });
    const parsed = parseInput(replySchema, formDataToObject(formData));
    if (!parsed.success) return parsed.result;
    const [review] = await db
      .select({ id: reviews.id, status: reviews.status, reply: reviews.reply, authorCompanyId: reviews.authorCompanyId, orderId: reviews.orderId })
      .from(reviews)
      .where(and(eq(reviews.id, parsed.data.reviewId), eq(reviews.targetCompanyId, company.id), isNull(reviews.deletedAt)))
      .limit(1);
    if (!review) throw new ActionError("Review not found.", "NOT_FOUND");
    if (review.status !== "PUBLISHED") throw new ActionError("You can reply once the review is published.", "INVALID_STATE");
    const isEdit = !!review.reply;
    await db.update(reviews).set({ reply: parsed.data.reply, repliedAt: new Date() }).where(eq(reviews.id, review.id));
    if (!isEdit) {
      await notifyCompany(review.authorCompanyId, {
        type: "REVIEW_RECEIVED",
        title: `${company.name} replied to your review`,
        body: parsed.data.reply.slice(0, 200),
        link: "/buyer/reviews",
        email: false,
      });
    }
    await audit({ actorId: user.id, action: isEdit ? "review.reply.update" : "review.reply", entityType: "review", entityId: review.id, after: { reply: parsed.data.reply } });
    revalidatePath("/[locale]/seller/reviews", "page");
    revalidatePath("/[locale]/buyer/reviews", "page");
    return ok(undefined, isEdit ? "Reply updated." : "Reply published under the review.");
  });
}
