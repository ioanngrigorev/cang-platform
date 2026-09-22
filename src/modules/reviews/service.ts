import { and, avg, count, eq, gte, isNull, sql } from "drizzle-orm";
import { db } from "@/db";
import { companies, orders, reviews } from "@/db/schema";
import { ActionError } from "@/lib/action";
import { audit } from "@/modules/audit/log";
import { notifyCompany } from "@/modules/notifications/service";
import { getSetting } from "@/modules/settings/service";
import type { CreateReviewInput } from "./schemas";

const DAY = 86400000;

export type FraudSignals = {
  newCompany?: boolean;
  repeatAuthor?: boolean;
  thinContent?: boolean;
  unverifiedPurchase?: boolean;
};

/**
 * Transparent heuristic fraud score. Anything at or above the configurable auto-publish
 * threshold is held for moderation instead of being published immediately.
 */
export async function scoreReviewFraud(input: {
  authorCompanyId: string;
  targetCompanyId: string;
  body: string | null;
  isVerifiedPurchase: boolean;
}): Promise<{ score: number; signals: FraudSignals }> {
  const signals: FraudSignals = {};
  let score = 0;

  const [author] = await db.select({ createdAt: companies.createdAt }).from(companies).where(eq(companies.id, input.authorCompanyId)).limit(1);
  if (author && Date.now() - author.createdAt.getTime() < 7 * DAY) {
    score += 40;
    signals.newCompany = true;
  }

  const [recent] = await db
    .select({ n: count() })
    .from(reviews)
    .where(
      and(
        eq(reviews.authorCompanyId, input.authorCompanyId),
        eq(reviews.targetCompanyId, input.targetCompanyId),
        gte(reviews.createdAt, new Date(Date.now() - 30 * DAY)),
        isNull(reviews.deletedAt),
      ),
    );
  if (recent.n > 0) {
    score += 30;
    signals.repeatAuthor = true;
  }

  if ((input.body ?? "").trim().length < 20) {
    score += 20;
    signals.thinContent = true;
  }
  if (!input.isVerifiedPurchase) {
    score += 20;
    signals.unverifiedPurchase = true;
  }
  return { score, signals };
}

/** Recompute the supplier's public rating from its published reviews. */
export async function recomputeCompanyRating(companyId: string) {
  const [row] = await db
    .select({ avgRating: avg(reviews.ratingOverall), n: count() })
    .from(reviews)
    .where(and(eq(reviews.targetCompanyId, companyId), eq(reviews.status, "PUBLISHED"), isNull(reviews.deletedAt)));
  const ratingAvg = row?.avgRating ? Math.round(Number(row.avgRating) * 10) / 10 : 0;
  await db.update(companies).set({ ratingAvg, ratingCount: row?.n ?? 0 }).where(eq(companies.id, companyId));
  return { ratingAvg, ratingCount: row?.n ?? 0 };
}

/**
 * Buyer publishes a review of a supplier for one of its own orders.
 * Verified purchase = COMPLETED order that belongs to the reviewing company.
 */
export async function createReview(companyId: string, userId: string, input: CreateReviewInput) {
  const [order] = await db
    .select()
    .from(orders)
    .where(and(eq(orders.id, input.orderId), eq(orders.buyerCompanyId, companyId), isNull(orders.deletedAt)))
    .limit(1);
  if (!order) throw new ActionError("Order not found.", "NOT_FOUND");

  const [existing] = await db
    .select({ id: reviews.id })
    .from(reviews)
    .where(and(eq(reviews.orderId, order.id), eq(reviews.authorCompanyId, companyId), isNull(reviews.deletedAt)))
    .limit(1);
  if (existing) throw new ActionError("You have already reviewed this order.", "DUPLICATE");

  const isVerifiedPurchase = order.statusCode === "COMPLETED";
  const requireVerified = await getSetting("reviews.requireVerifiedPurchase");
  if (requireVerified && !isVerifiedPurchase) throw new ActionError("You can review an order once it is completed.", "INVALID_STATE");

  const ratingOverall =
    Math.round(
      ((input.ratingQuality + input.ratingCommunication + input.ratingDelivery + input.ratingAccuracy + input.ratingService) / 5) * 10,
    ) / 10;

  const { score, signals } = await scoreReviewFraud({ authorCompanyId: companyId, targetCompanyId: order.supplierCompanyId, body: input.body, isVerifiedPurchase });
  const threshold = await getSetting("reviews.autoPublishThreshold");
  const status = score < threshold ? "PUBLISHED" : "PENDING";

  const [review] = await db
    .insert(reviews)
    .values({
      orderId: order.id,
      authorCompanyId: companyId,
      authorUserId: userId,
      targetCompanyId: order.supplierCompanyId,
      ratingQuality: input.ratingQuality,
      ratingCommunication: input.ratingCommunication,
      ratingDelivery: input.ratingDelivery,
      ratingAccuracy: input.ratingAccuracy,
      ratingService: input.ratingService,
      ratingOverall,
      title: input.title,
      body: input.body,
      isVerifiedPurchase,
      status,
      fraudScore: score,
      fraudSignals: signals as unknown as Record<string, unknown>,
      publishedAt: status === "PUBLISHED" ? new Date() : null,
    })
    .returning();

  const rating = status === "PUBLISHED" ? await recomputeCompanyRating(order.supplierCompanyId) : null;

  await notifyCompany(order.supplierCompanyId, {
    type: "REVIEW_RECEIVED",
    title: status === "PUBLISHED" ? `New ${ratingOverall.toFixed(1)}★ review for order ${order.orderNumber}` : `A review for order ${order.orderNumber} is awaiting moderation`,
    body: input.title ?? input.body?.slice(0, 160) ?? undefined,
    link: `/seller/reviews`,
    email: status === "PUBLISHED",
  });
  await audit({
    actorId: userId,
    action: "review.create",
    entityType: "review",
    entityId: review.id,
    after: { orderId: order.id, ratingOverall, status, fraudScore: score },
  });
  return { review, rating };
}

/** Reviews written by this company, newest first. */
export async function listCompanyReviews(companyId: string) {
  return db.query.reviews.findMany({
    where: and(eq(reviews.authorCompanyId, companyId), isNull(reviews.deletedAt)),
    with: {
      targetCompany: { columns: { id: true, name: true, slug: true, logoUrl: true } },
      order: { columns: { id: true, orderNumber: true, completedAt: true } },
    },
    orderBy: (t, { desc }) => [desc(t.createdAt)],
  });
}

export async function reviewSummary(companyId: string) {
  const [row] = await db
    .select({
      n: count(),
      published: sql<number>`coalesce(sum(case when ${reviews.status} = 'PUBLISHED' then 1 else 0 end), 0)::int`,
      avgRating: avg(reviews.ratingOverall),
    })
    .from(reviews)
    .where(and(eq(reviews.authorCompanyId, companyId), isNull(reviews.deletedAt)));
  return { total: row?.n ?? 0, published: row?.published ?? 0, avgRating: row?.avgRating ? Math.round(Number(row.avgRating) * 10) / 10 : 0 };
}
