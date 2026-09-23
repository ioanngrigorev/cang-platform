import "server-only";
import { and, asc, count, desc, eq, ilike, inArray, isNull, or, sql } from "drizzle-orm";
import { db } from "@/db";
import { productCategories, productImages, productPriceTiers, products } from "@/db/schema";
import { getCertifications } from "@/modules/catalog/queries";
import { categoryOptions } from "@/modules/rfq/service";
import { PRODUCT_TAB_STATUSES, type ProductListTab } from "./schemas";

function listWhere(companyId: string, tab: ProductListTab, q?: string) {
  const needle = q?.trim();
  return and(
    eq(products.companyId, companyId),
    isNull(products.deletedAt),
    tab === "all" ? undefined : inArray(products.status, PRODUCT_TAB_STATUSES[tab] as (typeof products.$inferSelect.status)[]),
    needle ? or(ilike(products.title, `%${needle}%`), ilike(products.titleVi, `%${needle}%`), ilike(products.sku, `%${needle}%`)) : undefined,
  );
}

/** Paginated catalog for the supplier, with the primary image and the lowest tier price. */
export async function listSellerProducts(companyId: string, opts: { tab?: ProductListTab; q?: string; page?: number; pageSize?: number } = {}) {
  const page = Math.max(1, opts.page ?? 1);
  const pageSize = opts.pageSize ?? 20;
  const tab = opts.tab ?? "all";
  const where = listWhere(companyId, tab, opts.q);
  const [rows, [{ total }]] = await Promise.all([
    db.query.products.findMany({
      where,
      columns: {
        id: true,
        slug: true,
        title: true,
        titleVi: true,
        status: true,
        rejectionReason: true,
        priceType: true,
        currency: true,
        basePrice: true,
        moq: true,
        unit: true,
        viewCount: true,
        inquiryCount: true,
        updatedAt: true,
        publishedAt: true,
      },
      with: {
        category: { columns: { id: true, name: true, nameVi: true, slug: true } },
        images: { columns: { id: true, url: true, isPrimary: true, sortOrder: true }, orderBy: [desc(productImages.isPrimary), asc(productImages.sortOrder)], limit: 1 },
        priceTiers: { columns: { minQty: true, maxQty: true, price: true, currency: true }, orderBy: [asc(productPriceTiers.minQty)] },
      },
      orderBy: [desc(products.updatedAt)],
      limit: pageSize,
      offset: (page - 1) * pageSize,
    }),
    db.select({ total: count() }).from(products).where(where),
  ]);
  return { rows, total, page, pageSize, totalPages: Math.max(1, Math.ceil(total / pageSize)) };
}

export type SellerProductRow = Awaited<ReturnType<typeof listSellerProducts>>["rows"][number];

export async function productTabCounts(companyId: string, q?: string) {
  const rows = await db
    .select({ status: products.status, n: count() })
    .from(products)
    .where(listWhere(companyId, "all", q))
    .groupBy(products.status);
  const by = (codes: string[]) => rows.filter((r) => codes.includes(r.status)).reduce((s, r) => s + r.n, 0);
  return {
    all: rows.reduce((s, r) => s + r.n, 0),
    active: by(PRODUCT_TAB_STATUSES.active),
    pending: by(PRODUCT_TAB_STATUSES.pending),
    draft: by(PRODUCT_TAB_STATUSES.draft),
    inactive: by(PRODUCT_TAB_STATUSES.inactive),
    rejected: by(PRODUCT_TAB_STATUSES.rejected),
  };
}

/** Full product for the edit form (scoped to the owning company). */
export async function getSellerProduct(companyId: string, productId: string) {
  const product = await db.query.products.findFirst({
    where: and(eq(products.id, productId), eq(products.companyId, companyId), isNull(products.deletedAt)),
    with: {
      category: { columns: { id: true, name: true, nameVi: true, slug: true } },
      images: { orderBy: [desc(productImages.isPrimary), asc(productImages.sortOrder)] },
      priceTiers: { orderBy: [asc(productPriceTiers.minQty)] },
      variants: { orderBy: (v, { asc: a }) => [a(v.sortOrder)] },
      specifications: { orderBy: (s, { asc: a }) => [a(s.sortOrder)] },
      certifications: { columns: { certificationId: true } },
    },
  });
  return product ?? null;
}

export type SellerProductDetail = NonNullable<Awaited<ReturnType<typeof getSellerProduct>>>;

/** Reference data for the product form: category tree (ordered by path) and the certification list. */
export async function productFormOptions() {
  const [categories, certifications] = await Promise.all([categoryOptions(), getCertifications()]);
  // Order categories depth-first so children sit under their parent in the select.
  const byParent = new Map<string | null, typeof categories>();
  for (const c of categories) {
    const key = c.parentId ?? null;
    const list = byParent.get(key) ?? [];
    list.push(c);
    byParent.set(key, list);
  }
  const ordered: typeof categories = [];
  const walk = (parentId: string | null, depth: number) => {
    if (depth > 6) return;
    for (const c of byParent.get(parentId) ?? []) {
      ordered.push(c);
      walk(c.id, depth + 1);
    }
  };
  walk(null, 0);
  // Categories whose parent is inactive/missing are appended so nothing is lost.
  const seen = new Set(ordered.map((c) => c.id));
  for (const c of categories) if (!seen.has(c.id)) ordered.push(c);
  return { categories: ordered, certifications: certifications.map((c) => ({ id: c.id, code: c.code, name: c.name })) };
}

/** Active products of the company for pickers (advertising, etc). */
export async function sellerActiveProductOptions(companyId: string) {
  return db
    .select({ id: products.id, title: products.title, titleVi: products.titleVi, slug: products.slug })
    .from(products)
    .where(and(eq(products.companyId, companyId), eq(products.status, "ACTIVE"), isNull(products.deletedAt)))
    .orderBy(asc(products.title))
    .limit(200);
}

/** Category ids that the company currently sells in (used for RFQ matching on the overview). */
export async function sellerCategoryIds(companyId: string) {
  const rows = await db
    .selectDistinct({ id: products.categoryId })
    .from(products)
    .where(and(eq(products.companyId, companyId), isNull(products.deletedAt), inArray(products.status, ["ACTIVE", "PENDING_REVIEW", "DRAFT"])));
  return rows.map((r) => r.id);
}

/** Slugs of those categories, so subtree matching (path LIKE) is possible. */
export async function sellerCategorySlugs(companyId: string) {
  const rows = await db
    .selectDistinct({ slug: productCategories.slug })
    .from(products)
    .innerJoin(productCategories, eq(productCategories.id, products.categoryId))
    .where(and(eq(products.companyId, companyId), isNull(products.deletedAt), sql`${products.status} IN ('ACTIVE', 'PENDING_REVIEW', 'DRAFT')`));
  return rows.map((r) => r.slug);
}
