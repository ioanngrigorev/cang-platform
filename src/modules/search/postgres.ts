import "server-only";
import { sql, type SQL } from "drizzle-orm";
import { db } from "@/db";
import type { ProductHit, ProductSearchFilters, SearchProvider, SearchResult, SupplierHit, SupplierSearchFilters } from "./types";

const DEFAULT_PAGE_SIZE = 24;
const MAX_PAGE_SIZE = 60;

/** Build a prefix-matching tsquery from free text ("backp bag" → 'backp':* & 'bag':*). */
export function toTsQuery(q: string | undefined): string | null {
  if (!q) return null;
  const tokens = q
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase()
    .split(/[^\p{L}\p{N}]+/u)
    .filter((t) => t.length >= 2)
    .slice(0, 8);
  if (tokens.length === 0) return null;
  return tokens.map((t) => `${t.replace(/['\\:&|!()]/g, "")}:*`).join(" & ");
}

function paging(f: { page?: number; pageSize?: number }) {
  const pageSize = Math.min(MAX_PAGE_SIZE, Math.max(1, f.pageSize ?? DEFAULT_PAGE_SIZE));
  const page = Math.max(1, f.page ?? 1);
  return { page, pageSize, offset: (page - 1) * pageSize };
}

function andAll(conds: SQL[]): SQL {
  return conds.length ? sql.join(conds, sql` AND `) : sql`TRUE`;
}

export class PostgresSearchProvider implements SearchProvider {
  async searchProducts(f: ProductSearchFilters): Promise<SearchResult<ProductHit>> {
    const started = Date.now();
    const { page, pageSize, offset } = paging(f);
    const tsq = toTsQuery(f.q);
    const conds: SQL[] = [sql`p.status = 'ACTIVE'`, sql`p.deleted_at IS NULL`, sql`c.status = 'ACTIVE'`, sql`c.deleted_at IS NULL`];

    if (tsq) conds.push(sql`(p.search_vector @@ to_tsquery('simple', ${tsq}) OR c.search_vector @@ to_tsquery('simple', ${tsq}))`);
    if (f.categoryId) conds.push(sql`(cat.id = ${f.categoryId} OR cat.path LIKE (SELECT path || slug || '/%' FROM product_categories WHERE id = ${f.categoryId}))`);
    if (f.categorySlug)
      conds.push(sql`(cat.slug = ${f.categorySlug} OR cat.path LIKE '%/' || ${f.categorySlug} || '/%' OR cat.path LIKE ${f.categorySlug} || '/%')`);
    if (f.companyId) conds.push(sql`p.company_id = ${f.companyId}`);
    if (f.provinceSlug) conds.push(sql`prov.slug = ${f.provinceSlug}`);
    if (f.countryCode) conds.push(sql`c.country_code = ${f.countryCode}`);
    if (f.verifiedOnly) conds.push(sql`c.verification_status = 'VERIFIED'`);
    if (f.oem) conds.push(sql`p.oem_available = TRUE`);
    if (f.odm) conds.push(sql`p.odm_available = TRUE`);
    if (f.customizable) conds.push(sql`p.customizable = TRUE`);
    if (f.hasSample) conds.push(sql`p.has_sample = TRUE`);
    if (f.featuredOnly) conds.push(sql`p.is_featured = TRUE`);
    if (f.maxMoq) conds.push(sql`p.moq <= ${f.maxMoq}`);
    if (f.maxLeadTimeDays) conds.push(sql`p.lead_time_days <= ${f.maxLeadTimeDays}`);
    if (f.minRating) conds.push(sql`c.rating_avg >= ${f.minRating}`);
    if (f.minPrice !== undefined) conds.push(sql`COALESCE(tiers.min_price, p.base_price) >= ${f.minPrice}`);
    if (f.maxPrice !== undefined) conds.push(sql`COALESCE(tiers.min_price, p.base_price) <= ${f.maxPrice}`);
    if (f.certifications?.length)
      conds.push(
        sql`EXISTS (SELECT 1 FROM company_certifications cc JOIN certifications ce ON ce.id = cc.certification_id WHERE cc.company_id = c.id AND ce.code = ANY(${f.certifications}::text[]))`,
      );

    const rank = tsq
      ? sql`(ts_rank_cd(p.search_vector, to_tsquery('simple', ${tsq})) * 10 + ts_rank_cd(c.search_vector, to_tsquery('simple', ${tsq})) * 2)`
      : sql`0`;
    const score = sql`(${rank} + p.search_boost * 0.5 + (CASE WHEN p.is_featured THEN 2 ELSE 0 END) + (CASE WHEN c.verification_status = 'VERIFIED' THEN 1 ELSE 0 END) + c.search_boost * 0.25)`;

    const orderBy: SQL = (() => {
      switch (f.sort) {
        case "newest":
          return sql`p.published_at DESC NULLS LAST, p.created_at DESC`;
        case "price_asc":
          return sql`COALESCE(tiers.min_price, p.base_price) ASC NULLS LAST`;
        case "price_desc":
          return sql`COALESCE(tiers.min_price, p.base_price) DESC NULLS LAST`;
        case "moq_asc":
          return sql`p.moq ASC`;
        case "rating":
          return sql`c.rating_avg DESC, c.rating_count DESC`;
        case "popular":
          return sql`p.view_count DESC, p.inquiry_count DESC`;
        default:
          return sql`${score} DESC, p.view_count DESC, p.published_at DESC NULLS LAST`;
      }
    })();

    const where = andAll(conds);
    const from = sql`
      FROM products p
      JOIN companies c ON c.id = p.company_id
      JOIN product_categories cat ON cat.id = p.category_id
      LEFT JOIN provinces prov ON prov.id = c.province_id
      LEFT JOIN LATERAL (
        SELECT MIN(price) AS min_price, MAX(price) AS max_price,
               (SELECT t2.min_qty FROM product_price_tiers t2 WHERE t2.product_id = p.id ORDER BY t2.price ASC, t2.min_qty ASC LIMIT 1) AS min_price_qty
        FROM product_price_tiers t WHERE t.product_id = p.id
      ) tiers ON TRUE
    `;

    const countRows = await db.execute<{ count: string }>(sql`SELECT COUNT(*)::text AS count ${from} WHERE ${where}`);
    const total = Number(countRows.rows[0]?.count ?? 0);

    const rows = await db.execute<Record<string, unknown>>(sql`
      SELECT
        p.id, p.slug, p.title, p.title_vi, p.short_description, p.price_type, p.currency,
        p.base_price::float AS base_price, tiers.min_price::float AS min_tier_price, tiers.max_price::float AS max_tier_price, tiers.min_price_qty::int AS min_tier_qty,
        p.moq, p.unit, p.lead_time_days, p.oem_available, p.odm_available, p.customizable, p.has_sample, p.is_featured,
        (SELECT url FROM product_images i WHERE i.product_id = p.id ORDER BY i.is_primary DESC, i.sort_order ASC LIMIT 1) AS primary_image_url,
        cat.id AS category_id, cat.name AS category_name, cat.slug AS category_slug,
        c.id AS company_id, c.slug AS company_slug, c.name AS company_name, c.logo_url AS company_logo_url,
        c.verification_status, c.rating_avg::float AS rating_avg, c.rating_count::int AS rating_count, c.country_code,
        prov.name AS province_name, prov.slug AS province_slug,
        COALESCE((SELECT array_agg(b.code) FROM company_badges cb JOIN badges b ON b.id = cb.badge_id WHERE cb.company_id = c.id AND (cb.expires_at IS NULL OR cb.expires_at > now())), '{}') AS badge_codes,
        ${score}::float AS rank
      ${from}
      WHERE ${where}
      ORDER BY ${orderBy}
      LIMIT ${pageSize} OFFSET ${offset}
    `);

    const hits: ProductHit[] = rows.rows.map((r) => ({
      id: r.id as string,
      slug: r.slug as string,
      title: r.title as string,
      titleVi: (r.title_vi as string | null) ?? null,
      shortDescription: (r.short_description as string | null) ?? null,
      priceType: r.price_type as string,
      currency: r.currency as string,
      basePrice: (r.base_price as number | null) ?? null,
      minTierPrice: (r.min_tier_price as number | null) ?? null,
      maxTierPrice: (r.max_tier_price as number | null) ?? null,
      minTierQty: (r.min_tier_qty as number | null) ?? null,
      moq: r.moq as number,
      unit: r.unit as string,
      leadTimeDays: (r.lead_time_days as number | null) ?? null,
      oemAvailable: r.oem_available as boolean,
      odmAvailable: r.odm_available as boolean,
      customizable: r.customizable as boolean,
      hasSample: r.has_sample as boolean,
      isFeatured: r.is_featured as boolean,
      primaryImageUrl: (r.primary_image_url as string | null) ?? null,
      categoryId: r.category_id as string,
      categoryName: r.category_name as string,
      categorySlug: r.category_slug as string,
      company: {
        id: r.company_id as string,
        slug: r.company_slug as string,
        name: r.company_name as string,
        logoUrl: (r.company_logo_url as string | null) ?? null,
        verificationStatus: r.verification_status as string,
        ratingAvg: Number(r.rating_avg ?? 0),
        ratingCount: Number(r.rating_count ?? 0),
        provinceName: (r.province_name as string | null) ?? null,
        provinceSlug: (r.province_slug as string | null) ?? null,
        countryCode: r.country_code as string,
        badgeCodes: (r.badge_codes as string[]) ?? [],
      },
      rank: Number(r.rank ?? 0),
    }));

    return { hits, total, page, pageSize, totalPages: Math.max(1, Math.ceil(total / pageSize)), tookMs: Date.now() - started };
  }

  async searchSuppliers(f: SupplierSearchFilters): Promise<SearchResult<SupplierHit>> {
    const started = Date.now();
    const { page, pageSize, offset } = paging(f);
    const tsq = toTsQuery(f.q);
    const conds: SQL[] = [sql`c.status = 'ACTIVE'`, sql`c.deleted_at IS NULL`, sql`c.is_seller = TRUE`];

    if (tsq)
      conds.push(
        sql`(c.search_vector @@ to_tsquery('simple', ${tsq}) OR EXISTS (SELECT 1 FROM products p WHERE p.company_id = c.id AND p.status = 'ACTIVE' AND p.search_vector @@ to_tsquery('simple', ${tsq})))`,
      );
    if (f.industrySlug) conds.push(sql`EXISTS (SELECT 1 FROM company_industries ci JOIN industries i ON i.id = ci.industry_id WHERE ci.company_id = c.id AND i.slug = ${f.industrySlug})`);
    if (f.categorySlug)
      conds.push(
        sql`EXISTS (SELECT 1 FROM products p JOIN product_categories cat ON cat.id = p.category_id WHERE p.company_id = c.id AND p.status = 'ACTIVE' AND (cat.slug = ${f.categorySlug} OR cat.path LIKE '%' || ${f.categorySlug} || '/%'))`,
      );
    if (f.provinceSlug) conds.push(sql`prov.slug = ${f.provinceSlug}`);
    if (f.countryCode) conds.push(sql`c.country_code = ${f.countryCode}`);
    if (f.businessTypes?.length) conds.push(sql`c.business_type = ANY(${f.businessTypes}::business_type[])`);
    if (f.verifiedOnly) conds.push(sql`c.verification_status = 'VERIFIED'`);
    if (f.oem) conds.push(sql`mp.oem_capable = TRUE`);
    if (f.odm) conds.push(sql`mp.odm_capable = TRUE`);
    if (f.exportCountry) conds.push(sql`${f.exportCountry} = ANY(mp.export_countries)`);
    if (f.minRating) conds.push(sql`c.rating_avg >= ${f.minRating}`);
    if (f.maxLeadTimeDays) conds.push(sql`mp.avg_lead_time_days <= ${f.maxLeadTimeDays}`);
    if (f.minEmployees) {
      const order = ["R_1_10", "R_11_50", "R_51_200", "R_201_500", "R_501_1000", "R_1001_5000", "R_5000_PLUS"];
      const idx = order.indexOf(f.minEmployees);
      if (idx >= 0) conds.push(sql`c.employee_range = ANY(${order.slice(idx)}::employee_range[])`);
    }
    if (f.certifications?.length)
      conds.push(
        sql`EXISTS (SELECT 1 FROM company_certifications cc JOIN certifications ce ON ce.id = cc.certification_id WHERE cc.company_id = c.id AND ce.code = ANY(${f.certifications}::text[]))`,
      );
    if (f.badgeCodes?.length)
      conds.push(sql`EXISTS (SELECT 1 FROM company_badges cb JOIN badges b ON b.id = cb.badge_id WHERE cb.company_id = c.id AND b.code = ANY(${f.badgeCodes}::text[]))`);

    const rank = tsq ? sql`ts_rank_cd(c.search_vector, to_tsquery('simple', ${tsq})) * 10` : sql`0`;
    const score = sql`(${rank} + c.search_boost * 0.5 + (CASE WHEN c.is_featured THEN 2 ELSE 0 END) + (CASE WHEN c.verification_status = 'VERIFIED' THEN 1.5 ELSE 0 END) + c.rating_avg * 0.3 + LEAST(c.transaction_count, 50) * 0.02)`;
    const orderBy: SQL = (() => {
      switch (f.sort) {
        case "newest":
          return sql`c.created_at DESC`;
        case "rating":
          return sql`c.rating_avg DESC, c.rating_count DESC`;
        case "popular":
          return sql`c.view_count DESC`;
        default:
          return sql`${score} DESC, c.rating_count DESC, c.created_at DESC`;
      }
    })();

    const where = andAll(conds);
    const from = sql`
      FROM companies c
      LEFT JOIN manufacturer_profiles mp ON mp.company_id = c.id
      LEFT JOIN provinces prov ON prov.id = c.province_id
    `;
    const countRows = await db.execute<{ count: string }>(sql`SELECT COUNT(*)::text AS count ${from} WHERE ${where}`);
    const total = Number(countRows.rows[0]?.count ?? 0);
    const rows = await db.execute<Record<string, unknown>>(sql`
      SELECT c.id, c.slug, c.name, c.name_vi, c.tagline, c.logo_url, c.cover_url, c.business_type, c.verification_status,
        c.rating_avg::float AS rating_avg, c.rating_count, c.transaction_count, c.response_rate::float AS response_rate,
        c.year_established, c.employee_range, c.country_code, c.city, c.is_featured,
        prov.name AS province_name, prov.slug AS province_slug,
        COALESCE(mp.oem_capable, FALSE) AS oem_capable, COALESCE(mp.odm_capable, FALSE) AS odm_capable, mp.avg_lead_time_days,
        COALESCE(mp.export_countries, '{}') AS export_countries,
        (SELECT COUNT(*) FROM products p WHERE p.company_id = c.id AND p.status = 'ACTIVE' AND p.deleted_at IS NULL)::int AS product_count,
        COALESCE((SELECT array_agg(b.code) FROM company_badges cb JOIN badges b ON b.id = cb.badge_id WHERE cb.company_id = c.id AND (cb.expires_at IS NULL OR cb.expires_at > now())), '{}') AS badge_codes,
        COALESCE((SELECT array_agg(ce.code) FROM company_certifications cc JOIN certifications ce ON ce.id = cc.certification_id WHERE cc.company_id = c.id), '{}') AS certification_codes,
        COALESCE((SELECT array_agg(i.slug) FROM company_industries ci JOIN industries i ON i.id = ci.industry_id WHERE ci.company_id = c.id), '{}') AS industry_slugs,
        ${score}::float AS rank
      ${from}
      WHERE ${where}
      ORDER BY ${orderBy}
      LIMIT ${pageSize} OFFSET ${offset}
    `);
    const hits: SupplierHit[] = rows.rows.map((r) => ({
      id: r.id as string,
      slug: r.slug as string,
      name: r.name as string,
      nameVi: (r.name_vi as string | null) ?? null,
      tagline: (r.tagline as string | null) ?? null,
      logoUrl: (r.logo_url as string | null) ?? null,
      coverUrl: (r.cover_url as string | null) ?? null,
      businessType: r.business_type as string,
      verificationStatus: r.verification_status as string,
      ratingAvg: Number(r.rating_avg ?? 0),
      ratingCount: Number(r.rating_count ?? 0),
      transactionCount: Number(r.transaction_count ?? 0),
      responseRate: r.response_rate === null ? null : Number(r.response_rate),
      yearEstablished: (r.year_established as number | null) ?? null,
      employeeRange: (r.employee_range as string | null) ?? null,
      countryCode: r.country_code as string,
      provinceName: (r.province_name as string | null) ?? null,
      provinceSlug: (r.province_slug as string | null) ?? null,
      city: (r.city as string | null) ?? null,
      oemCapable: Boolean(r.oem_capable),
      odmCapable: Boolean(r.odm_capable),
      avgLeadTimeDays: (r.avg_lead_time_days as number | null) ?? null,
      exportCountries: (r.export_countries as string[]) ?? [],
      productCount: Number(r.product_count ?? 0),
      badgeCodes: (r.badge_codes as string[]) ?? [],
      certificationCodes: (r.certification_codes as string[]) ?? [],
      industrySlugs: (r.industry_slugs as string[]) ?? [],
      isFeatured: Boolean(r.is_featured),
      rank: Number(r.rank ?? 0),
    }));
    return { hits, total, page, pageSize, totalPages: Math.max(1, Math.ceil(total / pageSize)), tookMs: Date.now() - started };
  }

  async suggest(q: string, limit = 8) {
    const tsq = toTsQuery(q);
    if (!tsq) return [];
    const like = `%${q.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/đ/g, "d").toLowerCase()}%`;
    const rows = await db.execute<{ type: string; label: string; slug: string }>(sql`
      (SELECT 'category' AS type, name AS label, slug FROM product_categories WHERE is_active AND (lower(immutable_unaccent(name)) LIKE ${like} OR lower(immutable_unaccent(name_vi)) LIKE ${like}) ORDER BY level, sort_order LIMIT 3)
      UNION ALL
      (SELECT 'product' AS type, title AS label, slug FROM products WHERE status = 'ACTIVE' AND search_vector @@ to_tsquery('simple', ${tsq}) ORDER BY view_count DESC LIMIT ${limit})
      UNION ALL
      (SELECT 'supplier' AS type, name AS label, slug FROM companies WHERE status = 'ACTIVE' AND is_seller AND search_vector @@ to_tsquery('simple', ${tsq}) ORDER BY rating_count DESC LIMIT 4)
    `);
    return rows.rows.slice(0, limit + 4).map((r) => ({ type: r.type as "product" | "supplier" | "category", label: r.label, slug: r.slug }));
  }
}
