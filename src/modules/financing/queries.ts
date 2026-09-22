import "server-only";
import { and, count, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { creditScores, financingApplications, financingProviders } from "@/db/schema";

export async function listCompanyFinancing(companyId: string, opts: { page?: number; pageSize?: number } = {}) {
  const page = Math.max(1, opts.page ?? 1);
  const pageSize = opts.pageSize ?? 20;
  const where = eq(financingApplications.companyId, companyId);
  const [rows, [{ total }]] = await Promise.all([
    db.query.financingApplications.findMany({
      where,
      with: {
        provider: { columns: { id: true, name: true, logoUrl: true, type: true } },
        order: { columns: { id: true, orderNumber: true } },
        offers: { columns: { id: true, status: true, amount: true, currency: true, tenorDays: true, interestRate: true } },
      },
      orderBy: [desc(financingApplications.createdAt)],
      limit: pageSize,
      offset: (page - 1) * pageSize,
    }),
    db.select({ total: count() }).from(financingApplications).where(where),
  ]);
  return { rows, total, page, pageSize, totalPages: Math.max(1, Math.ceil(total / pageSize)) };
}

export async function getCompanyFinancingApplication(companyId: string, applicationId: string) {
  const row = await db.query.financingApplications.findFirst({
    where: and(eq(financingApplications.id, applicationId), eq(financingApplications.companyId, companyId)),
    with: {
      provider: true,
      order: { columns: { id: true, orderNumber: true, total: true, currency: true, statusCode: true } },
      offers: { with: { provider: { columns: { id: true, name: true, logoUrl: true } } }, orderBy: (t, { desc: d }) => [d(t.createdAt)] },
      documents: { where: (t, { isNull: n }) => n(t.deletedAt) },
    },
  });
  return row ?? null;
}

export async function latestCreditScore(companyId: string) {
  const [row] = await db.select().from(creditScores).where(eq(creditScores.companyId, companyId)).orderBy(desc(creditScores.computedAt)).limit(1);
  return row ?? null;
}

export async function creditScoreHistory(companyId: string, limit = 12) {
  return db
    .select({ id: creditScores.id, score: creditScores.score, grade: creditScores.grade, computedAt: creditScores.computedAt })
    .from(creditScores)
    .where(eq(creditScores.companyId, companyId))
    .orderBy(desc(creditScores.computedAt))
    .limit(limit);
}

/** Partners a buyer in this country could be routed to (shown on the financing landing page). */
export async function buyerFinancingPartners(countryCode: string) {
  const rows = await db.select().from(financingProviders).where(eq(financingProviders.isActive, true)).orderBy(financingProviders.sortOrder);
  return rows.filter((p) => {
    const rules = (p.routingRules ?? {}) as { side?: string };
    if (rules.side && rules.side !== "BUYER") return false;
    return p.countries.length === 0 || p.countries.includes(countryCode);
  });
}
