/**
 * Step 5 — published supplier reviews (verified purchases for completed orders) and the
 * recomputation of each supplier's rating counters + TOP_SUPPLIER badge.
 */
import { eq } from "drizzle-orm";
import type { Db } from "@/db";
import { companies, companyBadges, reviews } from "@/db/schema";
import { REVIEWS } from "../data/reviews";
import { insertAll, type World } from "./context";
import { round2 } from "./rng";

type ReviewRow = typeof reviews.$inferInsert;
type BadgeRow = typeof companyBadges.$inferInsert;

export async function seedReviews(db: Db, w: World): Promise<void> {
  const { rng } = w;
  const rows: ReviewRow[] = [];
  const stats = new Map<string, { sum: number; count: number }>();

  for (const r of REVIEWS) {
    const target = w.supplier(r.target);
    const author = w.buyer(r.author);
    const order = r.order ? w.order(r.order) : null;
    if (order && (order.buyerSlug !== r.author || order.supplierSlug !== r.target)) throw new Error(`seed: review for order ${r.order} does not match its parties`);
    const [q, c, d, a, s] = r.ratings;
    const overall = round2((q + c + d + a + s) / 5);
    const publishedAt = order?.completedAt ? new Date(order.completedAt.getTime() + rng.int(1, 4) * 86_400_000) : w.daysAgo(r.daysAgo);
    rows.push({
      id: rng.id(),
      orderId: order?.id ?? null,
      productId: r.product ? w.product(r.product).id : null,
      authorCompanyId: author.id,
      authorUserId: author.ownerUserId,
      targetCompanyId: target.id,
      ratingQuality: q,
      ratingCommunication: c,
      ratingDelivery: d,
      ratingAccuracy: a,
      ratingService: s,
      ratingOverall: overall,
      title: r.title,
      body: r.body,
      isVerifiedPurchase: !!order,
      status: "PUBLISHED",
      fraudScore: rng.int(2, 18),
      fraudSignals: { verifiedPurchase: !!order, authorAgeDays: rng.int(120, 600), duplicateText: false },
      moderatedById: w.adminUserId,
      reply: r.reply ?? null,
      repliedAt: r.reply ? new Date(publishedAt.getTime() + rng.int(6, 72) * 3_600_000) : null,
      publishedAt,
      createdAt: publishedAt,
      updatedAt: r.reply ? new Date(publishedAt.getTime() + rng.int(6, 72) * 3_600_000) : publishedAt,
    });
    const st = stats.get(r.target) ?? { sum: 0, count: 0 };
    st.sum += overall;
    st.count += 1;
    stats.set(r.target, st);
  }
  await insertAll(db, reviews, rows);

  const topBadge = w.ref(w.ctx.badgeIds, "TOP_SUPPLIER", "badge");
  const badgeRows: BadgeRow[] = [];
  for (const [slug, st] of stats) {
    const supplier = w.supplier(slug);
    const ratingAvg = round2(st.sum / st.count);
    await db.update(companies).set({ ratingAvg, ratingCount: st.count }).where(eq(companies.id, supplier.id));
    if (ratingAvg >= 4.7 && st.count >= 10) {
      badgeRows.push({ id: rng.id(), companyId: supplier.id, badgeId: topBadge, source: "RULE", grantedAt: w.daysAgo(rng.int(3, 40)), note: `Rating ${ratingAvg.toFixed(2)} from ${st.count} reviews, no open disputes.` });
    }
  }
  await insertAll(db, companyBadges, badgeRows);
  console.log(`  reviews: ${rows.length} (${rows.filter((r) => r.isVerifiedPurchase).length} verified), top supplier badges: ${badgeRows.length}`);
}
