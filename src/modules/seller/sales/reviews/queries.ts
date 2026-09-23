import "server-only";
import { and, count, desc, eq, inArray, isNull } from "drizzle-orm";
import { db } from "@/db";
import { reviews } from "@/db/schema";

export type ReceivedReviewsTab = "all" | "published" | "pending" | "unanswered";
export const RECEIVED_REVIEW_TABS: ReceivedReviewsTab[] = ["all", "unanswered", "published", "pending"];

function tabCondition(tab: ReceivedReviewsTab) {
  switch (tab) {
    case "published":
      return eq(reviews.status, "PUBLISHED");
    case "pending":
      return eq(reviews.status, "PENDING");
    case "unanswered":
      return and(eq(reviews.status, "PUBLISHED"), isNull(reviews.reply));
    default:
      return inArray(reviews.status, ["PUBLISHED", "PENDING"]);
  }
}

/** Reviews received by the supplier: published ones plus those still awaiting moderation. */
export async function listReceivedReviews(companyId: string, opts: { tab?: ReceivedReviewsTab; page?: number; pageSize?: number } = {}) {
  const page = Math.max(1, opts.page ?? 1);
  const pageSize = opts.pageSize ?? 20;
  const where = and(eq(reviews.targetCompanyId, companyId), isNull(reviews.deletedAt), tabCondition(opts.tab ?? "all"));
  const [rows, [{ total }]] = await Promise.all([
    db.query.reviews.findMany({
      where,
      with: {
        authorCompany: { columns: { id: true, name: true, slug: true, countryCode: true, verificationStatus: true, logoUrl: true } },
        author: { columns: { id: true, name: true } },
        product: { columns: { id: true, slug: true, title: true, titleVi: true } },
        order: { columns: { id: true, orderNumber: true } },
      },
      orderBy: [desc(reviews.createdAt)],
      limit: pageSize,
      offset: (page - 1) * pageSize,
    }),
    db.select({ total: count() }).from(reviews).where(where),
  ]);
  return { rows, total, page, pageSize, totalPages: Math.max(1, Math.ceil(total / pageSize)) };
}

export async function receivedReviewTabCounts(companyId: string) {
  const countFor = async (tab: ReceivedReviewsTab) => {
    const [{ n }] = await db
      .select({ n: count() })
      .from(reviews)
      .where(and(eq(reviews.targetCompanyId, companyId), isNull(reviews.deletedAt), tabCondition(tab)));
    return n;
  };
  const [all, unanswered, published, pending] = await Promise.all(RECEIVED_REVIEW_TABS.map(countFor));
  return { all, unanswered, published, pending } as Record<ReceivedReviewsTab, number>;
}
