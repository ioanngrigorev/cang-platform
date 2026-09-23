import "server-only";
import { and, count, desc, eq, ilike, isNull, or, sql, type SQL } from "drizzle-orm";
import { db } from "@/db";
import { auditLogs, badges, companies, orders, plans, products, subscriptions, users } from "@/db/schema";
import { PAGE_SIZE, pageInfo } from "../shared";

export type CompanyTab = "all" | "sellers" | "buyers" | "pending" | "suspended";
export const COMPANY_TABS: CompanyTab[] = ["all", "sellers", "buyers", "pending", "suspended"];

function tabCondition(tab: CompanyTab): SQL | undefined {
  switch (tab) {
    case "sellers":
      return eq(companies.isSeller, true);
    case "buyers":
      return eq(companies.isBuyer, true);
    case "pending":
      return or(eq(companies.status, "PENDING"), eq(companies.verificationStatus, "PENDING"), eq(companies.verificationStatus, "IN_REVIEW"));
    case "suspended":
      return or(eq(companies.status, "SUSPENDED"), eq(companies.status, "BANNED"));
    default:
      return undefined;
  }
}

export async function listCompanies(f: { tab: CompanyTab; q?: string; page?: number }) {
  const page = Math.max(1, f.page ?? 1);
  const conds: SQL[] = [isNull(companies.deletedAt)];
  const tc = tabCondition(f.tab);
  if (tc) conds.push(tc);
  if (f.q) conds.push(or(ilike(companies.name, `%${f.q}%`), ilike(companies.email, `%${f.q}%`), ilike(companies.slug, `%${f.q}%`), ilike(companies.taxId, `%${f.q}%`))!);
  const where = and(...conds);
  const productCount = db.select({ n: count() }).from(products).where(and(eq(products.companyId, companies.id), isNull(products.deletedAt)));
  const orderCount = db.select({ n: count() }).from(orders).where(and(or(eq(orders.supplierCompanyId, companies.id), eq(orders.buyerCompanyId, companies.id)), isNull(orders.deletedAt)));
  const planCode = db
    .select({ code: plans.code })
    .from(subscriptions)
    .innerJoin(plans, eq(plans.id, subscriptions.planId))
    .where(and(eq(subscriptions.companyId, companies.id), eq(subscriptions.status, "ACTIVE")))
    .orderBy(desc(subscriptions.createdAt))
    .limit(1);
  const [rows, [{ total }]] = await Promise.all([
    db
      .select({
        id: companies.id,
        name: companies.name,
        slug: companies.slug,
        isSeller: companies.isSeller,
        isBuyer: companies.isBuyer,
        countryCode: companies.countryCode,
        verificationStatus: companies.verificationStatus,
        status: companies.status,
        isFeatured: companies.isFeatured,
        createdAt: companies.createdAt,
        products: sql<number>`(${productCount})::int`,
        orders: sql<number>`(${orderCount})::int`,
        plan: sql<string | null>`(${planCode})`,
      })
      .from(companies)
      .where(where)
      .orderBy(desc(companies.createdAt))
      .limit(PAGE_SIZE)
      .offset((page - 1) * PAGE_SIZE),
    db.select({ total: count() }).from(companies).where(where),
  ]);
  return { rows, ...pageInfo(total, page) };
}

export async function companyTabCounts(): Promise<Record<CompanyTab, number>> {
  const out = {} as Record<CompanyTab, number>;
  await Promise.all(
    COMPANY_TABS.map(async (tab) => {
      const tc = tabCondition(tab);
      const [{ n }] = await db
        .select({ n: count() })
        .from(companies)
        .where(and(isNull(companies.deletedAt), tc));
      out[tab] = n;
    }),
  );
  return out;
}

export async function getAdminCompany(companyId: string) {
  const company = await db.query.companies.findFirst({
    where: and(eq(companies.id, companyId), isNull(companies.deletedAt)),
    with: {
      country: { columns: { code: true, name: true, nameVi: true } },
      manufacturerProfile: true,
      buyerProfile: true,
      members: { with: { user: { columns: { id: true, name: true, email: true, status: true, platformRole: true } } }, orderBy: (m, { asc: a }) => [a(m.joinedAt)] },
      badges: { with: { badge: true, grantedBy: { columns: { id: true, name: true } } } },
      certifications: { with: { certification: true, document: { columns: { id: true, name: true, url: true } } } },
      riskFlags: { orderBy: (r, { desc: d }) => [d(r.createdAt)], limit: 20 },
      subscriptions: { with: { plan: { columns: { code: true, name: true, tier: true } } }, orderBy: (s, { desc: d }) => [d(s.createdAt)], limit: 5 },
      verifications: { orderBy: (v, { desc: d }) => [d(v.submittedAt)], limit: 10 },
      receivedReviews: { columns: { id: true, ratingOverall: true, status: true, title: true, createdAt: true, fraudScore: true }, orderBy: (r, { desc: d }) => [d(r.createdAt)], limit: 10 },
    },
  });
  if (!company) return null;
  const gmvFor = (side: "SUPPLIER" | "BUYER") =>
    db
      .select({ currency: orders.currency, n: count(), total: sql<number>`coalesce(sum(${orders.total}), 0)::float` })
      .from(orders)
      .where(and(eq(side === "SUPPLIER" ? orders.supplierCompanyId : orders.buyerCompanyId, companyId), isNull(orders.deletedAt), sql`${orders.statusCode} <> 'CANCELLED'`))
      .groupBy(orders.currency)
      .then((rows) => rows.map((r) => ({ ...r, side })));
  const [[prod], gmvSupplier, gmvBuyer, notes, allBadges] = await Promise.all([
    db.select({ n: count() }).from(products).where(and(eq(products.companyId, companyId), isNull(products.deletedAt))),
    gmvFor("SUPPLIER"),
    gmvFor("BUYER"),
    db
      .select({ id: auditLogs.id, after: auditLogs.after, createdAt: auditLogs.createdAt, actorName: users.name })
      .from(auditLogs)
      .leftJoin(users, eq(users.id, auditLogs.actorId))
      .where(and(eq(auditLogs.entityType, "company"), eq(auditLogs.entityId, companyId), eq(auditLogs.action, "admin.company.note")))
      .orderBy(desc(auditLogs.createdAt))
      .limit(20),
    db.select().from(badges).where(eq(badges.isActive, true)).orderBy(badges.sortOrder),
  ]);
  return { ...company, productCount: prod.n, gmv: [...gmvSupplier, ...gmvBuyer], notes, allBadges };
}

export type AdminCompanyDetail = NonNullable<Awaited<ReturnType<typeof getAdminCompany>>>;
