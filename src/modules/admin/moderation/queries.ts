import "server-only";
import { and, count, desc, eq, inArray, isNull, type SQL } from "drizzle-orm";
import { db } from "@/db";
import { reviews } from "@/db/schema";
import { PAGE_SIZE, pageInfo } from "../shared";

export type ReviewTab = "queue" | "published" | "hidden" | "all";
export const REVIEW_TABS: ReviewTab[] = ["queue", "published", "hidden", "all"];
const TAB_STATUS: Record<Exclude<ReviewTab, "all">, Array<typeof reviews.$inferSelect.status>> = {
  queue: ["PENDING", "FLAGGED"],
  published: ["PUBLISHED"],
  hidden: ["HIDDEN", "REMOVED"],
};

export async function listAdminReviews(f: { tab: ReviewTab; page?: number; minFraud?: number }) {
  const page = Math.max(1, f.page ?? 1);
  const conds: SQL[] = [isNull(reviews.deletedAt)];
  if (f.tab !== "all") conds.push(inArray(reviews.status, TAB_STATUS[f.tab]));
  const where = and(...conds);
  const [rows, [{ total }]] = await Promise.all([
    db.query.reviews.findMany({
      where,
      with: {
        authorCompany: { columns: { id: true, name: true } },
        targetCompany: { columns: { id: true, name: true } },
        author: { columns: { id: true, name: true } },
        order: { columns: { id: true, orderNumber: true } },
        moderatedBy: { columns: { id: true, name: true } },
      },
      orderBy: [desc(reviews.fraudScore), desc(reviews.createdAt)],
      limit: PAGE_SIZE,
      offset: (page - 1) * PAGE_SIZE,
    }),
    db.select({ total: count() }).from(reviews).where(where),
  ]);
  return { rows, ...pageInfo(total, page) };
}

export async function reviewTabCounts(): Promise<Record<ReviewTab, number>> {
  const rows = await db.select({ status: reviews.status, n: count() }).from(reviews).where(isNull(reviews.deletedAt)).groupBy(reviews.status);
  const by = (codes: string[]) => rows.filter((r) => codes.includes(r.status)).reduce((s, r) => s + r.n, 0);
  return { queue: by(TAB_STATUS.queue), published: by(TAB_STATUS.published), hidden: by(TAB_STATUS.hidden), all: rows.reduce((s, r) => s + r.n, 0) };
}

export async function suspiciousReviews(limit = 10) {
  return db.query.reviews.findMany({
    where: and(isNull(reviews.deletedAt), eq(reviews.status, "PUBLISHED")),
    with: { authorCompany: { columns: { id: true, name: true } }, targetCompany: { columns: { id: true, name: true } } },
    orderBy: [desc(reviews.fraudScore)],
    limit,
  });
}
