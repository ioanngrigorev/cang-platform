"use server";

import { and, eq, isNull } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { reviews } from "@/db/schema";
import { ActionError, formDataToObject, ok, parseInput, runAction, type ActionResult } from "@/lib/action";
import { notifyCompany } from "@/modules/notifications/service";
import { recomputeCompanyRating } from "@/modules/reviews/service";
import { adminActor, revalidateAdmin } from "../context";
import { idSchema, optionalText, reasonSchema } from "../shared";

const approveSchema = z.object({ reviewId: idSchema, note: optionalText(1000) });
const rejectSchema = z.object({ reviewId: idSchema, mode: z.enum(["HIDDEN", "REMOVED"]).default("REMOVED"), reason: reasonSchema });

async function load(reviewId: string) {
  const [r] = await db.select().from(reviews).where(and(eq(reviews.id, reviewId), isNull(reviews.deletedAt))).limit(1);
  if (!r) throw new ActionError("Review not found.", "NOT_FOUND");
  return r;
}

function revalidate(r: { targetCompanyId: string }) {
  revalidateAdmin("/admin/moderation", "/admin/risk", "/admin", `/admin/companies/${r.targetCompanyId}`);
}

export async function approveReviewAction(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  return runAction(async () => {
    const { user, log } = await adminActor("admin.reviews.moderate");
    const parsed = parseInput(approveSchema, formDataToObject(formData));
    if (!parsed.success) return parsed.result;
    const r = await load(parsed.data.reviewId);
    if (r.status === "PUBLISHED") return ok(undefined, "Review is already published.");
    await db.update(reviews).set({ status: "PUBLISHED", publishedAt: r.publishedAt ?? new Date(), moderatedById: user.id, moderationNote: parsed.data.note }).where(eq(reviews.id, r.id));
    const rating = await recomputeCompanyRating(r.targetCompanyId);
    await log({ action: "admin.review.approve", entityType: "review", entityId: r.id, before: { status: r.status }, after: { status: "PUBLISHED", note: parsed.data.note, rating } });
    await notifyCompany(r.authorCompanyId, { type: "SYSTEM", title: "Your review is now live", body: r.title ?? undefined, link: "/buyer/reviews", email: false });
    await notifyCompany(r.targetCompanyId, { type: "REVIEW_RECEIVED", title: `New ${Number(r.ratingOverall).toFixed(1)}★ review published`, body: r.title ?? undefined, link: "/seller/reviews", email: false });
    revalidate(r);
    return ok(undefined, "Review published.");
  });
}

export async function rejectReviewAction(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  return runAction(async () => {
    const { user, log } = await adminActor("admin.reviews.moderate");
    const parsed = parseInput(rejectSchema, formDataToObject(formData));
    if (!parsed.success) return parsed.result;
    const r = await load(parsed.data.reviewId);
    if (r.status === parsed.data.mode) return ok(undefined, "Review unchanged.");
    await db.update(reviews).set({ status: parsed.data.mode, moderatedById: user.id, moderationNote: parsed.data.reason }).where(eq(reviews.id, r.id));
    if (r.status === "PUBLISHED") await recomputeCompanyRating(r.targetCompanyId);
    await log({ action: "admin.review.reject", entityType: "review", entityId: r.id, before: { status: r.status }, after: { status: parsed.data.mode, reason: parsed.data.reason } });
    await notifyCompany(r.authorCompanyId, { type: "SYSTEM", title: "Your review was not published", body: parsed.data.reason, link: "/buyer/reviews", email: false });
    revalidate(r);
    return ok(undefined, parsed.data.mode === "HIDDEN" ? "Review hidden." : "Review removed.");
  });
}
