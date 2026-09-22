import "server-only";
import { and, asc, desc, eq, inArray, isNull, ne, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  badges,
  certifications,
  companies,
  countries,
  financingProviders,
  industries,
  inspectionProviders,
  logisticsProviders,
  plans,
  productCategories,
  products,
  provinces,
  reviews,
  rfqs,
} from "@/db/schema";
import { search, type ProductHit, type SupplierHit } from "@/modules/search";

/** Public read models for the marketplace. Every query only returns ACTIVE, non-deleted, publicly visible rows. */

// ---------------------------------------------------------------------------
// Platform-wide numbers (hero trust strip, directory landing)
// ---------------------------------------------------------------------------

export type PlatformStats = {
  manufacturers: number;
  verifiedManufacturers: number;
  products: number;
  clusters: number;
  countriesServed: number;
  openRfqs: number;
  industries: number;
};

export async function getPlatformStats(): Promise<PlatformStats> {
  const res = await db.execute<Record<string, number>>(sql`
    SELECT
      (SELECT COUNT(*) FROM companies WHERE status = 'ACTIVE' AND is_seller AND deleted_at IS NULL)::int AS manufacturers,
      (SELECT COUNT(*) FROM companies WHERE status = 'ACTIVE' AND is_seller AND deleted_at IS NULL AND verification_status = 'VERIFIED')::int AS verified_manufacturers,
      (SELECT COUNT(*) FROM products p JOIN companies c ON c.id = p.company_id WHERE p.status = 'ACTIVE' AND p.deleted_at IS NULL AND c.status = 'ACTIVE' AND c.deleted_at IS NULL)::int AS products,
      (SELECT COUNT(*) FROM provinces WHERE is_industrial_cluster AND is_active)::int AS clusters,
      (SELECT COUNT(DISTINCT cc) FROM manufacturer_profiles mp, unnest(mp.export_countries) AS cc)::int AS countries_served,
      (SELECT COUNT(*) FROM rfqs WHERE status = 'OPEN' AND visibility = 'PUBLIC' AND deleted_at IS NULL)::int AS open_rfqs,
      (SELECT COUNT(*) FROM industries WHERE is_active)::int AS industries
  `);
  const r = res.rows[0] ?? {};
  return {
    manufacturers: Number(r.manufacturers ?? 0),
    verifiedManufacturers: Number(r.verified_manufacturers ?? 0),
    products: Number(r.products ?? 0),
    clusters: Number(r.clusters ?? 0),
    countriesServed: Number(r.countries_served ?? 0),
    openRfqs: Number(r.open_rfqs ?? 0),
    industries: Number(r.industries ?? 0),
  };
}

// ---------------------------------------------------------------------------
// Categories
// ---------------------------------------------------------------------------

export type CategoryRow = typeof productCategories.$inferSelect;

export async function getRootCategories(): Promise<CategoryRow[]> {
  return db.query.productCategories.findMany({
    where: and(eq(productCategories.level, 0), eq(productCategories.isActive, true)),
    orderBy: [asc(productCategories.sortOrder), asc(productCategories.name)],
  });
}

/** Featured top-level categories first, then the biggest ones, up to `limit`. */
export async function getFeaturedCategories(limit = 12): Promise<CategoryRow[]> {
  return db.query.productCategories.findMany({
    where: and(eq(productCategories.level, 0), eq(productCategories.isActive, true)),
    orderBy: [desc(productCategories.isFeatured), desc(productCategories.productCount), asc(productCategories.sortOrder)],
    limit,
  });
}

export type CategoryDetail = CategoryRow & {
  parent: CategoryRow | null;
  children: CategoryRow[];
  industry: typeof industries.$inferSelect | null;
};

export async function getCategoryBySlug(slug: string): Promise<CategoryDetail | null> {
  const row = await db.query.productCategories.findFirst({
    where: and(eq(productCategories.slug, slug), eq(productCategories.isActive, true)),
    with: {
      parent: true,
      children: { where: eq(productCategories.isActive, true), orderBy: [asc(productCategories.sortOrder), asc(productCategories.name)] },
      industry: true,
    },
  });
  return (row as CategoryDetail | undefined) ?? null;
}

/** Root categories with their children — used by the products hub and the sitemap. */
export async function getCategoryTree(): Promise<Array<CategoryRow & { children: CategoryRow[] }>> {
  const rows = await db.query.productCategories.findMany({
    where: and(eq(productCategories.level, 0), eq(productCategories.isActive, true)),
    orderBy: [asc(productCategories.sortOrder), asc(productCategories.name)],
    with: { children: { where: eq(productCategories.isActive, true), orderBy: [asc(productCategories.sortOrder)] } },
  });
  return rows as Array<CategoryRow & { children: CategoryRow[] }>;
}

// ---------------------------------------------------------------------------
// Industries & provinces
// ---------------------------------------------------------------------------

export type IndustryRow = typeof industries.$inferSelect;
export type ProvinceRow = typeof provinces.$inferSelect;

export type IndustryWithCount = IndustryRow & { supplierCount: number; verifiedCount: number };

export async function getIndustriesWithCounts(): Promise<IndustryWithCount[]> {
  const res = await db.execute<Record<string, unknown>>(sql`
    SELECT i.*,
      COALESCE(s.total, 0)::int AS supplier_count,
      COALESCE(s.verified, 0)::int AS verified_count
    FROM industries i
    LEFT JOIN LATERAL (
      SELECT COUNT(*) AS total, COUNT(*) FILTER (WHERE c.verification_status = 'VERIFIED') AS verified
      FROM company_industries ci JOIN companies c ON c.id = ci.company_id
      WHERE ci.industry_id = i.id AND c.status = 'ACTIVE' AND c.is_seller AND c.deleted_at IS NULL
    ) s ON TRUE
    WHERE i.is_active
    ORDER BY i.sort_order ASC, i.name ASC
  `);
  return res.rows.map(mapIndustry);
}

function mapIndustry(r: Record<string, unknown>): IndustryWithCount {
  return {
    id: r.id as string,
    slug: r.slug as string,
    name: r.name as string,
    nameVi: r.name_vi as string,
    description: (r.description as string | null) ?? null,
    descriptionVi: (r.description_vi as string | null) ?? null,
    icon: (r.icon as string | null) ?? null,
    sortOrder: Number(r.sort_order ?? 0),
    isActive: Boolean(r.is_active),
    createdAt: new Date(r.created_at as string),
    updatedAt: new Date(r.updated_at as string),
    supplierCount: Number(r.supplier_count ?? 0),
    verifiedCount: Number(r.verified_count ?? 0),
  };
}

export async function getIndustryBySlug(slug: string): Promise<IndustryRow | null> {
  const row = await db.query.industries.findFirst({ where: and(eq(industries.slug, slug), eq(industries.isActive, true)) });
  return row ?? null;
}

export async function getProvinceBySlug(slug: string): Promise<ProvinceRow | null> {
  const row = await db.query.provinces.findFirst({ where: and(eq(provinces.slug, slug), eq(provinces.isActive, true)) });
  return row ?? null;
}

export type ProvinceWithCount = ProvinceRow & { supplierCount: number; verifiedCount: number; productCount: number };

function mapProvince(r: Record<string, unknown>): ProvinceWithCount {
  return {
    id: r.id as string,
    countryCode: r.country_code as string,
    code: r.code as string,
    slug: r.slug as string,
    name: r.name as string,
    nameVi: r.name_vi as string,
    region: (r.region as string | null) ?? null,
    isIndustrialCluster: Boolean(r.is_industrial_cluster),
    clusterHeadline: (r.cluster_headline as string | null) ?? null,
    clusterHeadlineVi: (r.cluster_headline_vi as string | null) ?? null,
    clusterDescription: (r.cluster_description as string | null) ?? null,
    clusterDescriptionVi: (r.cluster_description_vi as string | null) ?? null,
    heroImageUrl: (r.hero_image_url as string | null) ?? null,
    majorIndustries: (r.major_industries as string[]) ?? [],
    keyFacts: (r.key_facts as Record<string, string | number> | null) ?? null,
    seoTitle: (r.seo_title as string | null) ?? null,
    seoDescription: (r.seo_description as string | null) ?? null,
    sortOrder: Number(r.sort_order ?? 0),
    isActive: Boolean(r.is_active),
    createdAt: new Date(r.created_at as string),
    updatedAt: new Date(r.updated_at as string),
    supplierCount: Number(r.supplier_count ?? 0),
    verifiedCount: Number(r.verified_count ?? 0),
    productCount: Number(r.product_count ?? 0),
  };
}

/** Provinces flagged as industrial clusters, with supplier/product counts. */
export async function getClusters(): Promise<ProvinceWithCount[]> {
  const res = await db.execute<Record<string, unknown>>(sql`
    SELECT pr.*,
      (SELECT COUNT(*) FROM companies c WHERE c.province_id = pr.id AND c.status = 'ACTIVE' AND c.is_seller AND c.deleted_at IS NULL)::int AS supplier_count,
      (SELECT COUNT(*) FROM companies c WHERE c.province_id = pr.id AND c.status = 'ACTIVE' AND c.is_seller AND c.deleted_at IS NULL AND c.verification_status = 'VERIFIED')::int AS verified_count,
      (SELECT COUNT(*) FROM products p JOIN companies c ON c.id = p.company_id WHERE c.province_id = pr.id AND p.status = 'ACTIVE' AND p.deleted_at IS NULL AND c.status = 'ACTIVE')::int AS product_count
    FROM provinces pr
    WHERE pr.is_industrial_cluster AND pr.is_active
    ORDER BY pr.sort_order ASC, pr.name ASC
  `);
  return res.rows.map(mapProvince);
}

/** Provinces that have at least one active seller (filter dropdowns, sitemap). */
export async function getProvincesWithSellers(): Promise<ProvinceWithCount[]> {
  const res = await db.execute<Record<string, unknown>>(sql`
    SELECT pr.*, s.total::int AS supplier_count, s.verified::int AS verified_count, 0 AS product_count
    FROM provinces pr
    JOIN LATERAL (
      SELECT COUNT(*) AS total, COUNT(*) FILTER (WHERE c.verification_status = 'VERIFIED') AS verified
      FROM companies c WHERE c.province_id = pr.id AND c.status = 'ACTIVE' AND c.is_seller AND c.deleted_at IS NULL
    ) s ON s.total > 0
    WHERE pr.is_active
    ORDER BY s.total DESC, pr.name ASC
  `);
  return res.rows.map(mapProvince);
}

/** Provinces with suppliers in a given industry (for the industry landing + sibling links). */
export async function getProvincesForIndustry(industrySlug: string): Promise<ProvinceWithCount[]> {
  const res = await db.execute<Record<string, unknown>>(sql`
    SELECT pr.*, s.total::int AS supplier_count, s.verified::int AS verified_count, 0 AS product_count
    FROM provinces pr
    JOIN LATERAL (
      SELECT COUNT(*) AS total, COUNT(*) FILTER (WHERE c.verification_status = 'VERIFIED') AS verified
      FROM companies c
      JOIN company_industries ci ON ci.company_id = c.id
      JOIN industries i ON i.id = ci.industry_id
      WHERE c.province_id = pr.id AND c.status = 'ACTIVE' AND c.is_seller AND c.deleted_at IS NULL AND i.slug = ${industrySlug}
    ) s ON s.total > 0
    WHERE pr.is_active
    ORDER BY s.total DESC, pr.name ASC
  `);
  return res.rows.map(mapProvince);
}

/** Industries represented by suppliers in a province (cluster landing chips). */
export async function getIndustriesForProvince(provinceSlug: string): Promise<IndustryWithCount[]> {
  const res = await db.execute<Record<string, unknown>>(sql`
    SELECT i.*, s.total::int AS supplier_count, s.verified::int AS verified_count
    FROM industries i
    JOIN LATERAL (
      SELECT COUNT(*) AS total, COUNT(*) FILTER (WHERE c.verification_status = 'VERIFIED') AS verified
      FROM company_industries ci
      JOIN companies c ON c.id = ci.company_id
      JOIN provinces pr ON pr.id = c.province_id
      WHERE ci.industry_id = i.id AND pr.slug = ${provinceSlug} AND c.status = 'ACTIVE' AND c.is_seller AND c.deleted_at IS NULL
    ) s ON s.total > 0
    WHERE i.is_active
    ORDER BY s.total DESC, i.name ASC
  `);
  return res.rows.map(mapIndustry);
}

export type SegmentStats = {
  suppliers: number;
  verified: number;
  products: number;
  typicalMoq: number | null;
  typicalLeadTimeDays: number | null;
  oemCapable: number;
};

/** Aggregate numbers for an industry (optionally within a province) — feeds the generated intro paragraphs. */
export async function getSegmentStats(opts: { industrySlug?: string; provinceSlug?: string }): Promise<SegmentStats> {
  const conds = [sql`c.status = 'ACTIVE'`, sql`c.is_seller`, sql`c.deleted_at IS NULL`];
  if (opts.industrySlug) conds.push(sql`EXISTS (SELECT 1 FROM company_industries ci JOIN industries i ON i.id = ci.industry_id WHERE ci.company_id = c.id AND i.slug = ${opts.industrySlug})`);
  if (opts.provinceSlug) conds.push(sql`EXISTS (SELECT 1 FROM provinces pr WHERE pr.id = c.province_id AND pr.slug = ${opts.provinceSlug})`);
  const where = sql.join(conds, sql` AND `);
  const res = await db.execute<Record<string, unknown>>(sql`
    WITH s AS (SELECT c.id FROM companies c LEFT JOIN manufacturer_profiles mp ON mp.company_id = c.id WHERE ${where})
    SELECT
      (SELECT COUNT(*) FROM s)::int AS suppliers,
      (SELECT COUNT(*) FROM s JOIN companies c ON c.id = s.id WHERE c.verification_status = 'VERIFIED')::int AS verified,
      (SELECT COUNT(*) FROM products p WHERE p.company_id IN (SELECT id FROM s) AND p.status = 'ACTIVE' AND p.deleted_at IS NULL)::int AS products,
      (SELECT percentile_cont(0.5) WITHIN GROUP (ORDER BY p.moq) FROM products p WHERE p.company_id IN (SELECT id FROM s) AND p.status = 'ACTIVE' AND p.deleted_at IS NULL)::float AS typical_moq,
      (SELECT percentile_cont(0.5) WITHIN GROUP (ORDER BY p.lead_time_days) FROM products p WHERE p.company_id IN (SELECT id FROM s) AND p.status = 'ACTIVE' AND p.deleted_at IS NULL AND p.lead_time_days IS NOT NULL)::float AS typical_lead,
      (SELECT COUNT(*) FROM s JOIN manufacturer_profiles mp ON mp.company_id = s.id WHERE mp.oem_capable)::int AS oem_capable
  `);
  const r = res.rows[0] ?? {};
  return {
    suppliers: Number(r.suppliers ?? 0),
    verified: Number(r.verified ?? 0),
    products: Number(r.products ?? 0),
    typicalMoq: r.typical_moq == null ? null : Math.round(Number(r.typical_moq)),
    typicalLeadTimeDays: r.typical_lead == null ? null : Math.round(Number(r.typical_lead)),
    oemCapable: Number(r.oem_capable ?? 0),
  };
}

// ---------------------------------------------------------------------------
// Reference lists for filters
// ---------------------------------------------------------------------------

export async function getCertifications() {
  return db.query.certifications.findMany({ where: eq(certifications.isActive, true), orderBy: [asc(certifications.sortOrder), asc(certifications.name)] });
}

export async function getCountries() {
  return db.query.countries.findMany({ where: eq(countries.isEnabled, true), orderBy: [asc(countries.sortOrder), asc(countries.name)] });
}

// ---------------------------------------------------------------------------
// Products
// ---------------------------------------------------------------------------

export async function getProductBySlug(slug: string) {
  const row = await db.query.products.findFirst({
    where: and(eq(products.slug, slug), eq(products.status, "ACTIVE"), isNull(products.deletedAt)),
    with: {
      images: { orderBy: (i, { desc: d, asc: a }) => [d(i.isPrimary), a(i.sortOrder)] },
      priceTiers: { orderBy: (t, { asc: a }) => [a(t.minQty)] },
      variants: { where: (v, { eq: e }) => e(v.isActive, true), orderBy: (v, { asc: a }) => [a(v.sortOrder)] },
      specifications: { orderBy: (s, { asc: a }) => [a(s.sortOrder)] },
      certifications: { with: { certification: true } },
      category: { with: { parent: true } },
      company: {
        with: {
          province: true,
          manufacturerProfile: true,
          badges: { with: { badge: true } },
          certifications: { with: { certification: true } },
        },
      },
    },
  });
  if (!row || row.company.status !== "ACTIVE" || row.company.deletedAt) return null;
  return row;
}

export type ProductDetail = NonNullable<Awaited<ReturnType<typeof getProductBySlug>>>;

// ---------------------------------------------------------------------------
// Suppliers
// ---------------------------------------------------------------------------

export async function getSupplierBySlug(slug: string) {
  const row = await db.query.companies.findFirst({
    where: and(eq(companies.slug, slug), eq(companies.status, "ACTIVE"), eq(companies.isSeller, true), isNull(companies.deletedAt)),
    with: {
      province: true,
      country: true,
      manufacturerProfile: true,
      industries: { with: { industry: true } },
      certifications: { with: { certification: true }, orderBy: (c, { desc: d }) => [d(c.status), d(c.issuedAt)] },
      media: { orderBy: (m, { asc: a }) => [a(m.sortOrder), a(m.createdAt)] },
      badges: { with: { badge: true } },
      verifications: {
        where: (v, { inArray: within }) => within(v.status, ["VERIFIED", "EXPIRED"]),
        orderBy: (v, { desc: d }) => [d(v.reviewedAt)],
      },
    },
  });
  if (!row) return null;
  const [counts] = await db
    .select({
      productCount: sql<number>`COUNT(*)::int`,
    })
    .from(products)
    .where(and(eq(products.companyId, row.id), eq(products.status, "ACTIVE"), isNull(products.deletedAt)));
  return { ...row, productCount: counts?.productCount ?? 0 };
}

export type SupplierDetail = NonNullable<Awaited<ReturnType<typeof getSupplierBySlug>>>;

export type ReviewSummary = {
  count: number;
  average: number;
  distribution: Record<1 | 2 | 3 | 4 | 5, number>;
  dimensions: { quality: number; communication: number; delivery: number; accuracy: number; service: number };
  verifiedShare: number;
};

export async function getSupplierReviewSummary(companyId: string): Promise<ReviewSummary> {
  const res = await db.execute<Record<string, unknown>>(sql`
    SELECT COUNT(*)::int AS count,
      COALESCE(AVG(rating_overall), 0)::float AS average,
      COUNT(*) FILTER (WHERE ROUND(rating_overall) = 5)::int AS r5,
      COUNT(*) FILTER (WHERE ROUND(rating_overall) = 4)::int AS r4,
      COUNT(*) FILTER (WHERE ROUND(rating_overall) = 3)::int AS r3,
      COUNT(*) FILTER (WHERE ROUND(rating_overall) = 2)::int AS r2,
      COUNT(*) FILTER (WHERE ROUND(rating_overall) <= 1)::int AS r1,
      COALESCE(AVG(rating_quality), 0)::float AS quality,
      COALESCE(AVG(rating_communication), 0)::float AS communication,
      COALESCE(AVG(rating_delivery), 0)::float AS delivery,
      COALESCE(AVG(rating_accuracy), 0)::float AS accuracy,
      COALESCE(AVG(rating_service), 0)::float AS service,
      COUNT(*) FILTER (WHERE is_verified_purchase)::int AS verified
    FROM reviews WHERE target_company_id = ${companyId} AND status = 'PUBLISHED' AND deleted_at IS NULL
  `);
  const r = res.rows[0] ?? {};
  const count = Number(r.count ?? 0);
  return {
    count,
    average: Number(r.average ?? 0),
    distribution: { 5: Number(r.r5 ?? 0), 4: Number(r.r4 ?? 0), 3: Number(r.r3 ?? 0), 2: Number(r.r2 ?? 0), 1: Number(r.r1 ?? 0) },
    dimensions: {
      quality: Number(r.quality ?? 0),
      communication: Number(r.communication ?? 0),
      delivery: Number(r.delivery ?? 0),
      accuracy: Number(r.accuracy ?? 0),
      service: Number(r.service ?? 0),
    },
    verifiedShare: count ? Number(r.verified ?? 0) / count : 0,
  };
}

export async function getSupplierReviews(companyId: string, opts: { page?: number; pageSize?: number } = {}) {
  const pageSize = opts.pageSize ?? 10;
  const page = Math.max(1, opts.page ?? 1);
  const rows = await db.query.reviews.findMany({
    where: and(eq(reviews.targetCompanyId, companyId), eq(reviews.status, "PUBLISHED"), isNull(reviews.deletedAt)),
    orderBy: [desc(reviews.publishedAt), desc(reviews.createdAt)],
    limit: pageSize,
    offset: (page - 1) * pageSize,
    with: {
      authorCompany: { columns: { id: true, name: true, countryCode: true, verificationStatus: true, logoUrl: true } },
      product: { columns: { id: true, slug: true, title: true, titleVi: true } },
    },
  });
  const [c] = await db
    .select({ n: sql<number>`COUNT(*)::int` })
    .from(reviews)
    .where(and(eq(reviews.targetCompanyId, companyId), eq(reviews.status, "PUBLISHED"), isNull(reviews.deletedAt)));
  const total = c?.n ?? 0;
  return { rows, total, page, pageSize, totalPages: Math.max(1, Math.ceil(total / pageSize)) };
}

export type SupplierReview = Awaited<ReturnType<typeof getSupplierReviews>>["rows"][number];

// ---------------------------------------------------------------------------
// Public RFQ marketplace
// ---------------------------------------------------------------------------

export type PublicRfqFilters = { categorySlug?: string; destination?: string; page?: number; pageSize?: number };

export async function getPublicRfqs(f: PublicRfqFilters = {}) {
  const pageSize = Math.min(50, f.pageSize ?? 20);
  const page = Math.max(1, f.page ?? 1);
  const conds = [eq(rfqs.status, "OPEN"), eq(rfqs.visibility, "PUBLIC"), isNull(rfqs.deletedAt)];
  if (f.destination) conds.push(eq(rfqs.destinationCountryCode, f.destination));
  if (f.categorySlug) {
    conds.push(
      sql`${rfqs.categoryId} IN (SELECT id FROM product_categories WHERE slug = ${f.categorySlug} OR path LIKE ${f.categorySlug} || '/%' OR path LIKE '%/' || ${f.categorySlug} || '/%')`,
    );
  }
  const where = and(...conds);
  const rows = await db.query.rfqs.findMany({
    where,
    orderBy: [desc(rfqs.isPriority), desc(rfqs.publishedAt), desc(rfqs.createdAt)],
    limit: pageSize,
    offset: (page - 1) * pageSize,
    with: {
      category: { columns: { id: true, slug: true, name: true, nameVi: true } },
      destinationCountry: { columns: { code: true, name: true, nameVi: true } },
      buyerCompany: { columns: { id: true, countryCode: true, verificationStatus: true, name: true } },
    },
  });
  const [c] = await db.select({ n: sql<number>`COUNT(*)::int` }).from(rfqs).where(where);
  const total = c?.n ?? 0;
  return { rows, total, page, pageSize, totalPages: Math.max(1, Math.ceil(total / pageSize)) };
}

export type PublicRfqRow = Awaited<ReturnType<typeof getPublicRfqs>>["rows"][number];

export async function getPublicRfqById(id: string) {
  const row = await db.query.rfqs.findFirst({
    where: and(eq(rfqs.id, id), eq(rfqs.visibility, "PUBLIC"), isNull(rfqs.deletedAt), inArray(rfqs.status, ["OPEN", "CLOSED", "AWARDED", "EXPIRED"])),
    with: {
      items: { orderBy: (i, { asc: a }) => [a(i.sortOrder)] },
      category: { with: { parent: true } },
      destinationCountry: true,
      buyerCompany: { columns: { id: true, name: true, countryCode: true, verificationStatus: true, businessType: true, yearEstablished: true }, with: { country: true } },
    },
  });
  return row ?? null;
}

export type PublicRfqDetail = NonNullable<Awaited<ReturnType<typeof getPublicRfqById>>>;

/** Facets for the RFQ marketplace filters: categories and destinations that currently have open RFQs. */
export async function getRfqFacets() {
  const cats = await db.execute<{ slug: string; name: string; name_vi: string; n: number }>(sql`
    SELECT root.slug, root.name, root.name_vi, COUNT(*)::int AS n
    FROM rfqs r
    JOIN product_categories cat ON cat.id = r.category_id
    JOIN product_categories root ON root.slug = COALESCE(NULLIF(split_part(cat.path, '/', 1), ''), cat.slug)
    WHERE r.status = 'OPEN' AND r.visibility = 'PUBLIC' AND r.deleted_at IS NULL
    GROUP BY root.slug, root.name, root.name_vi, root.sort_order ORDER BY root.sort_order
  `);
  const dests = await db.execute<{ code: string; name: string; name_vi: string; n: number }>(sql`
    SELECT co.code, co.name, co.name_vi, COUNT(*)::int AS n
    FROM rfqs r JOIN countries co ON co.code = r.destination_country_code
    WHERE r.status = 'OPEN' AND r.visibility = 'PUBLIC' AND r.deleted_at IS NULL
    GROUP BY co.code, co.name, co.name_vi ORDER BY n DESC, co.name
  `);
  return {
    categories: cats.rows.map((r) => ({ slug: r.slug, name: r.name, nameVi: r.name_vi, count: Number(r.n) })),
    destinations: dests.rows.map((r) => ({ code: r.code, name: r.name, nameVi: r.name_vi, count: Number(r.n) })),
  };
}

// ---------------------------------------------------------------------------
// Plans & service partners (public marketing pages)
// ---------------------------------------------------------------------------

export async function getPublicPlans() {
  return db.query.plans.findMany({ where: and(eq(plans.isActive, true), eq(plans.isPublic, true)), orderBy: [asc(plans.sortOrder)] });
}

export async function getLogisticsProviders() {
  return db.query.logisticsProviders.findMany({ where: eq(logisticsProviders.isActive, true), orderBy: [asc(logisticsProviders.sortOrder), asc(logisticsProviders.name)] });
}

export async function getFinancingProviders() {
  return db.query.financingProviders.findMany({ where: eq(financingProviders.isActive, true), orderBy: [asc(financingProviders.sortOrder), asc(financingProviders.name)] });
}

export async function getInspectionProviders() {
  return db.query.inspectionProviders.findMany({ where: eq(inspectionProviders.isActive, true), orderBy: [asc(inspectionProviders.sortOrder), asc(inspectionProviders.name)] });
}

// ---------------------------------------------------------------------------
// Sitemap
// ---------------------------------------------------------------------------

export async function getSitemapEntries() {
  const [cats, prods, sups, inds, combos, clusters] = await Promise.all([
    db.select({ slug: productCategories.slug, updatedAt: productCategories.updatedAt }).from(productCategories).where(eq(productCategories.isActive, true)),
    db
      .select({ slug: products.slug, updatedAt: products.updatedAt })
      .from(products)
      .innerJoin(companies, eq(companies.id, products.companyId))
      .where(and(eq(products.status, "ACTIVE"), isNull(products.deletedAt), eq(companies.status, "ACTIVE"), isNull(companies.deletedAt))),
    db
      .select({ slug: companies.slug, updatedAt: companies.updatedAt })
      .from(companies)
      .where(and(eq(companies.status, "ACTIVE"), eq(companies.isSeller, true), isNull(companies.deletedAt))),
    db.select({ slug: industries.slug, updatedAt: industries.updatedAt }).from(industries).where(eq(industries.isActive, true)),
    db.execute<{ industry: string; province: string }>(sql`
      SELECT DISTINCT i.slug AS industry, pr.slug AS province
      FROM company_industries ci
      JOIN industries i ON i.id = ci.industry_id
      JOIN companies c ON c.id = ci.company_id
      JOIN provinces pr ON pr.id = c.province_id
      WHERE c.status = 'ACTIVE' AND c.is_seller AND c.deleted_at IS NULL AND i.is_active AND pr.is_active
    `),
    db.select({ slug: provinces.slug, updatedAt: provinces.updatedAt }).from(provinces).where(and(eq(provinces.isIndustrialCluster, true), eq(provinces.isActive, true))),
  ]);
  return { categories: cats, products: prods, suppliers: sups, industries: inds, combos: combos.rows, clusters };
}

/** Recently published RFQ ids for the sitemap. */
export async function getPublicRfqIdsForSitemap() {
  return db
    .select({ id: rfqs.id, updatedAt: rfqs.updatedAt })
    .from(rfqs)
    .where(and(eq(rfqs.status, "OPEN"), eq(rfqs.visibility, "PUBLIC"), isNull(rfqs.deletedAt), ne(rfqs.id, "")));
}

// ---------------------------------------------------------------------------
// Homepage & related-content read models (thin wrappers over the search provider)
// ---------------------------------------------------------------------------

export async function getTrendingProducts(limit = 12): Promise<ProductHit[]> {
  const res = await search().searchProducts({ sort: "popular", pageSize: limit });
  return res.hits;
}

export async function getFeaturedVerifiedSuppliers(limit = 8): Promise<SupplierHit[]> {
  const res = await search().searchSuppliers({ verifiedOnly: true, pageSize: limit });
  return res.hits;
}

export async function getNewSuppliers(limit = 8): Promise<SupplierHit[]> {
  const res = await search().searchSuppliers({ sort: "newest", pageSize: limit });
  return res.hits;
}

/** Other active products from the same supplier (excludes the current one). */
export async function getMoreFromSupplier(companyId: string, excludeProductId: string, limit = 6): Promise<ProductHit[]> {
  const res = await search().searchProducts({ companyId, sort: "popular", pageSize: limit + 1 });
  return res.hits.filter((h) => h.id !== excludeProductId).slice(0, limit);
}

/** Products in the same category (excluding the current one and, preferably, the same supplier). */
export async function getSimilarProducts(categorySlug: string, excludeProductId: string, limit = 6): Promise<ProductHit[]> {
  const res = await search().searchProducts({ categorySlug, sort: "popular", pageSize: limit + 1 });
  return res.hits.filter((h) => h.id !== excludeProductId).slice(0, limit);
}

export async function getSupplierProducts(companyId: string, opts: { page?: number; pageSize?: number; q?: string } = {}) {
  return search().searchProducts({ companyId, q: opts.q, sort: opts.q ? "relevance" : "newest", page: opts.page ?? 1, pageSize: opts.pageSize ?? 24 });
}

export async function getProductReviewStats(productId: string): Promise<{ count: number; average: number }> {
  const res = await db.execute<{ count: number; average: number }>(sql`
    SELECT COUNT(*)::int AS count, COALESCE(AVG(rating_overall), 0)::float AS average
    FROM reviews WHERE product_id = ${productId} AND status = 'PUBLISHED' AND deleted_at IS NULL
  `);
  const r = res.rows[0];
  return { count: Number(r?.count ?? 0), average: Number(r?.average ?? 0) };
}

/** Localised badge labels keyed by code (feeds `TrustBadges labels`). */
export async function getBadgeLabels(locale: string): Promise<Record<string, string>> {
  const rows = await db.query.badges.findMany({ where: eq(badges.isActive, true) });
  const out: Record<string, string> = {};
  for (const b of rows) out[b.code] = locale === "vi" ? b.nameVi : b.name;
  return out;
}

/** Countries that at least one active supplier exports to (manufacturer filter). */
export async function getExportCountriesFacet(): Promise<Array<{ code: string; name: string; nameVi: string; count: number }>> {
  const res = await db.execute<{ code: string; name: string; name_vi: string; n: number }>(sql`
    SELECT co.code, co.name, co.name_vi, COUNT(*)::int AS n
    FROM manufacturer_profiles mp
    JOIN companies c ON c.id = mp.company_id AND c.status = 'ACTIVE' AND c.is_seller AND c.deleted_at IS NULL
    CROSS JOIN LATERAL unnest(mp.export_countries) AS cc(code)
    JOIN countries co ON co.code = cc.code
    GROUP BY co.code, co.name, co.name_vi
    ORDER BY n DESC, co.name ASC
    LIMIT 40
  `);
  return res.rows.map((r) => ({ code: r.code, name: r.name, nameVi: r.name_vi, count: Number(r.n) }));
}

/** Top-level categories with product counts for chips/filters. */
export async function getRootCategoriesWithCounts(): Promise<CategoryRow[]> {
  return getRootCategories();
}
