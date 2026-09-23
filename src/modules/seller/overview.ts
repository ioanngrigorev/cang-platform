import "server-only";
import { and, count, desc, eq, inArray, isNull, sql } from "drizzle-orm";
import { db } from "@/db";
import { companies, conversationParticipants, manufacturerProfiles, messages, notifications, orders, products, quotations, rfqInvitations, rfqs } from "@/db/schema";
import { ACTIVE_ORDER_STATUSES } from "@/modules/orders/queries";

export type SellerOverviewStats = {
  activeProducts: number;
  pendingProducts: number;
  draftProducts: number;
  openRfqMatches: number;
  pendingInvitations: number;
  quotationsAwaiting: number;
  activeOrders: number;
  revenue30d: Array<{ currency: string; total: number }>;
  unreadMessages: number;
  unreadNotifications: number;
};

/**
 * RFQs a supplier can act on: public OPEN RFQs in a category the supplier sells in (or its subtree),
 * plus any RFQ it was invited to that is still open — the same rule as canSupplierViewRfq / matching.
 */
function matchedRfqCondition(companyId: string) {
  return sql`(
    ${rfqs.status} = 'OPEN' AND ${rfqs.deletedAt} IS NULL AND ${rfqs.buyerCompanyId} <> ${companyId}
    AND (
      EXISTS (SELECT 1 FROM rfq_invitations ri WHERE ri.rfq_id = ${rfqs.id} AND ri.supplier_company_id = ${companyId} AND ri.status IN ('PENDING', 'VIEWED'))
      OR (
        ${rfqs.visibility} = 'PUBLIC' AND EXISTS (
          SELECT 1 FROM products p
          JOIN product_categories pc ON pc.id = p.category_id
          JOIN product_categories rc ON rc.id = ${rfqs.categoryId}
          WHERE p.company_id = ${companyId} AND p.deleted_at IS NULL AND p.status = 'ACTIVE'
            AND (pc.id = rc.id OR pc.path LIKE rc.path || rc.slug || '/%' OR rc.path LIKE pc.path || pc.slug || '/%')
        )
      )
    )
  )`;
}

export async function sellerOverviewStats(companyId: string, userId: string): Promise<SellerOverviewStats> {
  const since30 = new Date(Date.now() - 30 * 86400000);
  const [productRows, [{ n: matches }], [{ n: invitations }], [{ n: awaiting }], [{ n: activeOrders }], revenue, [{ n: unreadMessages }], [{ n: unreadNotifications }]] =
    await Promise.all([
      db
        .select({ status: products.status, n: count() })
        .from(products)
        .where(and(eq(products.companyId, companyId), isNull(products.deletedAt)))
        .groupBy(products.status),
      db.select({ n: count() }).from(rfqs).where(matchedRfqCondition(companyId)),
      db
        .select({ n: count() })
        .from(rfqInvitations)
        .innerJoin(rfqs, eq(rfqs.id, rfqInvitations.rfqId))
        .where(and(eq(rfqInvitations.supplierCompanyId, companyId), inArray(rfqInvitations.status, ["PENDING", "VIEWED"]), eq(rfqs.status, "OPEN"), isNull(rfqs.deletedAt))),
      db
        .select({ n: count() })
        .from(quotations)
        .where(and(eq(quotations.supplierCompanyId, companyId), isNull(quotations.deletedAt), inArray(quotations.status, ["SUBMITTED", "UNDER_REVIEW"]))),
      db
        .select({ n: count() })
        .from(orders)
        .where(and(eq(orders.supplierCompanyId, companyId), isNull(orders.deletedAt), inArray(orders.statusCode, ACTIVE_ORDER_STATUSES))),
      db
        .select({ currency: orders.currency, total: sql<number>`coalesce(sum(${orders.total}), 0)::float` })
        .from(orders)
        .where(
          and(
            eq(orders.supplierCompanyId, companyId),
            isNull(orders.deletedAt),
            inArray(orders.statusCode, ["COMPLETED", "DELIVERY"]),
            sql`coalesce(${orders.completedAt}, ${orders.deliveredAt}, ${orders.updatedAt}) >= ${since30}`,
          ),
        )
        .groupBy(orders.currency),
      db
        .select({ n: count() })
        .from(messages)
        .innerJoin(conversationParticipants, eq(conversationParticipants.conversationId, messages.conversationId))
        .where(
          and(
            eq(conversationParticipants.userId, userId),
            eq(conversationParticipants.companyId, companyId),
            isNull(messages.deletedAt),
            sql`${messages.senderId} is distinct from ${userId}`,
            sql`${messages.createdAt} > coalesce(${conversationParticipants.lastReadAt}, '-infinity'::timestamptz)`,
          ),
        ),
      db
        .select({ n: count() })
        .from(notifications)
        .where(and(eq(notifications.userId, userId), isNull(notifications.readAt))),
    ]);

  const byStatus = (statuses: string[]) => productRows.filter((r) => statuses.includes(r.status)).reduce((s, r) => s + r.n, 0);
  return {
    activeProducts: byStatus(["ACTIVE"]),
    pendingProducts: byStatus(["PENDING_REVIEW"]),
    draftProducts: byStatus(["DRAFT"]),
    openRfqMatches: matches,
    pendingInvitations: invitations,
    quotationsAwaiting: awaiting,
    activeOrders,
    revenue30d: revenue,
    unreadMessages,
    unreadNotifications,
  };
}

/** Most recent RFQs the supplier can quote on, with the invitation state when there is one. */
export async function recentRfqMatches(companyId: string, limit = 5) {
  return db
    .select({
      id: rfqs.id,
      rfqNumber: rfqs.rfqNumber,
      title: rfqs.title,
      quantity: rfqs.quantity,
      unit: rfqs.unit,
      status: rfqs.status,
      quoteDeadline: rfqs.quoteDeadline,
      publishedAt: rfqs.publishedAt,
      createdAt: rfqs.createdAt,
      destinationCountryCode: rfqs.destinationCountryCode,
      quotationCount: rfqs.quotationCount,
      invitationStatus: rfqInvitations.status,
      buyerName: companies.name,
    })
    .from(rfqs)
    .leftJoin(rfqInvitations, and(eq(rfqInvitations.rfqId, rfqs.id), eq(rfqInvitations.supplierCompanyId, companyId)))
    .innerJoin(companies, eq(companies.id, rfqs.buyerCompanyId))
    .where(matchedRfqCondition(companyId))
    .orderBy(desc(sql`coalesce(${rfqs.publishedAt}, ${rfqs.createdAt})`))
    .limit(limit);
}

export async function recentSellerOrders(companyId: string, limit = 5) {
  return db.query.orders.findMany({
    where: and(eq(orders.supplierCompanyId, companyId), isNull(orders.deletedAt)),
    columns: { id: true, orderNumber: true, statusCode: true, total: true, currency: true, expectedShipDate: true, createdAt: true },
    with: { buyerCompany: { columns: { id: true, name: true, slug: true } }, status: true },
    orderBy: [desc(orders.createdAt)],
    limit,
  });
}

/** The getting-started checklist for a supplier. */
export async function sellerChecklist(companyId: string) {
  const [[company], [mp], [{ n: activeCount }]] = await Promise.all([
    db
      .select({ kybStatus: companies.kybStatus, description: companies.description, logoUrl: companies.logoUrl, phone: companies.phone, city: companies.city })
      .from(companies)
      .where(eq(companies.id, companyId))
      .limit(1),
    db
      .select({ factoryAddress: manufacturerProfiles.factoryAddress, productionLines: manufacturerProfiles.productionLines, factorySizeSqm: manufacturerProfiles.factorySizeSqm })
      .from(manufacturerProfiles)
      .where(eq(manufacturerProfiles.companyId, companyId))
      .limit(1),
    db
      .select({ n: count() })
      .from(products)
      .where(and(eq(products.companyId, companyId), isNull(products.deletedAt), eq(products.status, "ACTIVE"))),
  ]);
  return {
    profileComplete: Boolean(company?.description && company?.phone && company?.city),
    factoryComplete: Boolean(mp?.factoryAddress && (mp?.productionLines || mp?.factorySizeSqm)),
    firstProduct: activeCount > 0,
    kybSubmitted: company ? company.kybStatus !== "UNVERIFIED" && company.kybStatus !== "REJECTED" : false,
    kybVerified: company?.kybStatus === "VERIFIED",
  };
}

/** Order ids where the company is the supplier (Documents page). */
export async function sellerOrderIds(companyId: string) {
  const rows = await db.select({ id: orders.id }).from(orders).where(and(eq(orders.supplierCompanyId, companyId), isNull(orders.deletedAt)));
  return rows.map((r) => r.id);
}
