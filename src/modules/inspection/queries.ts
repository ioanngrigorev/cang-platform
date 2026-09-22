import "server-only";
import { and, count, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { inspectionOrders, inspectionProviders } from "@/db/schema";

export async function listBuyerInspections(companyId: string, opts: { page?: number; pageSize?: number } = {}) {
  const page = Math.max(1, opts.page ?? 1);
  const pageSize = opts.pageSize ?? 20;
  const where = eq(inspectionOrders.requesterCompanyId, companyId);
  const [rows, [{ total }]] = await Promise.all([
    db.query.inspectionOrders.findMany({
      where,
      with: {
        provider: { columns: { id: true, name: true, logoUrl: true } },
        order: { columns: { id: true, orderNumber: true }, with: { supplierCompany: { columns: { id: true, name: true, slug: true } } } },
      },
      orderBy: [desc(inspectionOrders.createdAt)],
      limit: pageSize,
      offset: (page - 1) * pageSize,
    }),
    db.select({ total: count() }).from(inspectionOrders).where(where),
  ]);
  return { rows, total, page, pageSize, totalPages: Math.max(1, Math.ceil(total / pageSize)) };
}

export async function getBuyerInspection(companyId: string, inspectionId: string) {
  const row = await db.query.inspectionOrders.findFirst({
    where: and(eq(inspectionOrders.id, inspectionId), eq(inspectionOrders.requesterCompanyId, companyId)),
    with: {
      provider: true,
      reportDocument: true,
      order: { columns: { id: true, orderNumber: true, statusCode: true }, with: { supplierCompany: { columns: { id: true, name: true, slug: true, logoUrl: true } } } },
    },
  });
  return row ?? null;
}

export async function activeInspectionProviders(countryCode?: string) {
  const rows = await db.select().from(inspectionProviders).where(eq(inspectionProviders.isActive, true)).orderBy(inspectionProviders.sortOrder);
  if (!countryCode) return rows;
  return rows.filter((p) => p.countries.length === 0 || p.countries.includes(countryCode));
}
