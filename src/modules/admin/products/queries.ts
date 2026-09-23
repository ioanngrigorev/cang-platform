import "server-only";
import { and, count, desc, eq, ilike, inArray, isNull, or, type SQL } from "drizzle-orm";
import { db } from "@/db";
import { companies, productCategories, products } from "@/db/schema";
import { PAGE_SIZE, pageInfo } from "../shared";

export type ProductTab = "pending" | "active" | "rejected" | "inactive" | "all";
export const PRODUCT_TABS: ProductTab[] = ["pending", "active", "rejected", "inactive", "all"];

const TAB_STATUS: Record<Exclude<ProductTab, "all">, Array<typeof products.$inferSelect.status>> = {
  pending: ["PENDING_REVIEW"],
  active: ["ACTIVE"],
  rejected: ["REJECTED"],
  inactive: ["INACTIVE", "DRAFT", "ARCHIVED"],
};

function conds(f: { tab: ProductTab; q?: string; categoryId?: string }): SQL[] {
  const out: SQL[] = [isNull(products.deletedAt)];
  if (f.tab !== "all") out.push(inArray(products.status, TAB_STATUS[f.tab]));
  if (f.q) out.push(or(ilike(products.title, `%${f.q}%`), ilike(products.sku, `%${f.q}%`), ilike(companies.name, `%${f.q}%`))!);
  if (f.categoryId) out.push(eq(products.categoryId, f.categoryId));
  return out;
}

export async function listAdminProducts(f: { tab: ProductTab; q?: string; categoryId?: string; page?: number }) {
  const page = Math.max(1, f.page ?? 1);
  const where = and(...conds(f));
  const [rows, [{ total }]] = await Promise.all([
    db
      .select({
        id: products.id,
        title: products.title,
        slug: products.slug,
        sku: products.sku,
        status: products.status,
        isFeatured: products.isFeatured,
        moq: products.moq,
        unit: products.unit,
        basePrice: products.basePrice,
        currency: products.currency,
        createdAt: products.createdAt,
        updatedAt: products.updatedAt,
        company: { id: companies.id, name: companies.name },
        category: { id: productCategories.id, name: productCategories.name, nameVi: productCategories.nameVi },
      })
      .from(products)
      .innerJoin(companies, eq(companies.id, products.companyId))
      .innerJoin(productCategories, eq(productCategories.id, products.categoryId))
      .where(where)
      .orderBy(f.tab === "pending" ? products.updatedAt : desc(products.updatedAt))
      .limit(PAGE_SIZE)
      .offset((page - 1) * PAGE_SIZE),
    db.select({ total: count() }).from(products).innerJoin(companies, eq(companies.id, products.companyId)).where(where),
  ]);
  return { rows, ...pageInfo(total, page) };
}

export async function productTabCounts(): Promise<Record<ProductTab, number>> {
  const rows = await db.select({ status: products.status, n: count() }).from(products).where(isNull(products.deletedAt)).groupBy(products.status);
  const by = (codes: string[]) => rows.filter((r) => codes.includes(r.status)).reduce((s, r) => s + r.n, 0);
  return { pending: by(TAB_STATUS.pending), active: by(TAB_STATUS.active), rejected: by(TAB_STATUS.rejected), inactive: by(TAB_STATUS.inactive), all: rows.reduce((s, r) => s + r.n, 0) };
}

export async function getAdminProduct(productId: string) {
  return db.query.products.findFirst({
    where: and(eq(products.id, productId), isNull(products.deletedAt)),
    with: {
      company: { columns: { id: true, name: true, slug: true, verificationStatus: true, status: true, countryCode: true } },
      category: { columns: { id: true, name: true, nameVi: true, slug: true, path: true } },
      reviewedBy: { columns: { id: true, name: true } },
      images: { orderBy: (i, { asc: a }) => [a(i.sortOrder)] },
      priceTiers: { orderBy: (p, { asc: a }) => [a(p.minQty)] },
      variants: { orderBy: (v, { asc: a }) => [a(v.sortOrder)] },
      specifications: { orderBy: (s, { asc: a }) => [a(s.sortOrder)] },
      certifications: { with: { certification: { columns: { id: true, code: true, name: true } } } },
    },
  });
}

export async function categoryFilterOptions() {
  return db.select({ id: productCategories.id, name: productCategories.name, nameVi: productCategories.nameVi, level: productCategories.level }).from(productCategories).where(eq(productCategories.isActive, true)).orderBy(productCategories.path, productCategories.sortOrder);
}
