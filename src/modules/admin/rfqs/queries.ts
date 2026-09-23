import "server-only";
import { and, count, desc, eq, ilike, inArray, isNull, or, type SQL } from "drizzle-orm";
import { db } from "@/db";
import { companies, productCategories, rfqs } from "@/db/schema";
import { PAGE_SIZE, pageInfo } from "../shared";

export type RfqTab = "all" | "open" | "draft" | "awarded" | "closed" | "cancelled";
export const RFQ_TABS: RfqTab[] = ["all", "open", "draft", "awarded", "closed", "cancelled"];
const TAB_STATUS: Record<Exclude<RfqTab, "all">, Array<typeof rfqs.$inferSelect.status>> = {
  open: ["OPEN"],
  draft: ["DRAFT"],
  awarded: ["AWARDED"],
  closed: ["CLOSED", "EXPIRED"],
  cancelled: ["CANCELLED"],
};

function conds(f: { tab: RfqTab; q?: string; categoryId?: string }): SQL[] {
  const out: SQL[] = [isNull(rfqs.deletedAt)];
  if (f.tab !== "all") out.push(inArray(rfqs.status, TAB_STATUS[f.tab]));
  if (f.q) out.push(or(ilike(rfqs.title, `%${f.q}%`), ilike(rfqs.rfqNumber, `%${f.q}%`), ilike(companies.name, `%${f.q}%`))!);
  if (f.categoryId) out.push(eq(rfqs.categoryId, f.categoryId));
  return out;
}

export async function listAdminRfqs(f: { tab: RfqTab; q?: string; categoryId?: string; page?: number }) {
  const page = Math.max(1, f.page ?? 1);
  const where = and(...conds(f));
  const [rows, [{ total }]] = await Promise.all([
    db
      .select({
        id: rfqs.id,
        rfqNumber: rfqs.rfqNumber,
        title: rfqs.title,
        status: rfqs.status,
        visibility: rfqs.visibility,
        isPriority: rfqs.isPriority,
        quantity: rfqs.quantity,
        unit: rfqs.unit,
        quotationCount: rfqs.quotationCount,
        quoteDeadline: rfqs.quoteDeadline,
        createdAt: rfqs.createdAt,
        buyer: { id: companies.id, name: companies.name, countryCode: companies.countryCode },
        category: { id: productCategories.id, name: productCategories.name, nameVi: productCategories.nameVi },
      })
      .from(rfqs)
      .innerJoin(companies, eq(companies.id, rfqs.buyerCompanyId))
      .leftJoin(productCategories, eq(productCategories.id, rfqs.categoryId))
      .where(where)
      .orderBy(desc(rfqs.createdAt))
      .limit(PAGE_SIZE)
      .offset((page - 1) * PAGE_SIZE),
    db.select({ total: count() }).from(rfqs).innerJoin(companies, eq(companies.id, rfqs.buyerCompanyId)).where(where),
  ]);
  return { rows, ...pageInfo(total, page) };
}

export async function rfqTabCountsAll(): Promise<Record<RfqTab, number>> {
  const rows = await db.select({ status: rfqs.status, n: count() }).from(rfqs).where(isNull(rfqs.deletedAt)).groupBy(rfqs.status);
  const by = (codes: string[]) => rows.filter((r) => codes.includes(r.status)).reduce((s, r) => s + r.n, 0);
  return { all: rows.reduce((s, r) => s + r.n, 0), open: by(TAB_STATUS.open), draft: by(TAB_STATUS.draft), awarded: by(TAB_STATUS.awarded), closed: by(TAB_STATUS.closed), cancelled: by(TAB_STATUS.cancelled) };
}

export async function getAdminRfq(rfqId: string) {
  return db.query.rfqs.findFirst({
    where: and(eq(rfqs.id, rfqId), isNull(rfqs.deletedAt)),
    with: {
      buyerCompany: { columns: { id: true, name: true, slug: true, countryCode: true, verificationStatus: true } },
      createdBy: { columns: { id: true, name: true, email: true } },
      category: { columns: { id: true, name: true, nameVi: true } },
      destinationCountry: { columns: { code: true, name: true, nameVi: true } },
      items: { orderBy: (i, { asc: a }) => [a(i.sortOrder)] },
      invitations: { with: { supplier: { columns: { id: true, name: true } } } },
      quotations: { where: (q, { isNull: n }) => n(q.deletedAt), with: { supplierCompany: { columns: { id: true, name: true } } }, orderBy: (q, { desc: d }) => [d(q.createdAt)] },
      documents: { where: (d, { isNull: n }) => n(d.deletedAt) },
    },
  });
}
