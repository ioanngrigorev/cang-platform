import "server-only";
import { and, count, desc, eq, isNull, or, sql, type SQL } from "drizzle-orm";
import { db } from "@/db";
import { companies, invoices, orders } from "@/db/schema";

/** Invoices the supplier issued, or that were raised on its orders (proforma / commercial / credit notes). */
function sellerInvoiceCondition(companyId: string): SQL {
  return or(eq(invoices.issuerCompanyId, companyId), and(isNull(invoices.issuerCompanyId), eq(orders.supplierCompanyId, companyId)))!;
}

export async function listSellerInvoices(companyId: string, opts: { page?: number; pageSize?: number; status?: string } = {}) {
  const page = Math.max(1, opts.page ?? 1);
  const pageSize = opts.pageSize ?? 20;
  const where = and(sellerInvoiceCondition(companyId), opts.status ? eq(invoices.status, opts.status as typeof invoices.$inferSelect.status) : undefined);
  const [rows, [{ total }]] = await Promise.all([
    db
      .select({
        invoice: invoices,
        order: { id: orders.id, orderNumber: orders.orderNumber },
        recipient: { id: companies.id, name: companies.name, slug: companies.slug },
      })
      .from(invoices)
      .leftJoin(orders, eq(orders.id, invoices.orderId))
      .leftJoin(companies, eq(companies.id, invoices.recipientCompanyId))
      .where(where)
      .orderBy(desc(invoices.createdAt))
      .limit(pageSize)
      .offset((page - 1) * pageSize),
    db.select({ total: count() }).from(invoices).leftJoin(orders, eq(orders.id, invoices.orderId)).where(where),
  ]);
  return { rows, total, page, pageSize, totalPages: Math.max(1, Math.ceil(total / pageSize)) };
}

export async function sellerInvoiceTotals(companyId: string) {
  return db
    .select({
      currency: invoices.currency,
      outstanding: sql<number>`coalesce(sum(case when ${invoices.status} in ('ISSUED','PARTIALLY_PAID','OVERDUE') then ${invoices.total} - ${invoices.amountPaid} else 0 end), 0)::float`,
      paid: sql<number>`coalesce(sum(case when ${invoices.status} = 'PAID' then ${invoices.total} else 0 end), 0)::float`,
      overdue: sql<number>`count(*) filter (where ${invoices.status} = 'OVERDUE')::int`,
    })
    .from(invoices)
    .leftJoin(orders, eq(orders.id, invoices.orderId))
    .where(sellerInvoiceCondition(companyId))
    .groupBy(invoices.currency)
    .orderBy(desc(sql`sum(${invoices.total})`));
}

export async function getSellerInvoice(companyId: string, invoiceId: string) {
  const inv = await db.query.invoices.findFirst({
    where: eq(invoices.id, invoiceId),
    with: {
      order: { columns: { id: true, orderNumber: true, incoterm: true, paymentTerms: true, shippingAddress: true, supplierCompanyId: true } },
      issuerCompany: true,
      recipientCompany: true,
      payments: { orderBy: (t, { desc: d }) => [d(t.createdAt)] },
    },
  });
  if (!inv) return null;
  const mine = inv.issuerCompanyId === companyId || (!inv.issuerCompanyId && inv.order?.supplierCompanyId === companyId);
  return mine ? inv : null;
}
