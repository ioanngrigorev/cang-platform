import { eq } from "drizzle-orm";
import type { Db } from "@/db";
import { certifications, countries, currencies, industries, productCategories, provinces } from "@/db/schema";
import { CATEGORIES, CERTIFICATIONS, COUNTRIES, CURRENCIES, INDUSTRIES, PROVINCES } from "./data/reference";

export async function seedReference(db: Db) {
  for (const c of COUNTRIES) {
    await db
      .insert(countries)
      .values({ code: c.code, name: c.name, nameVi: c.nameVi, region: c.region, dialCode: c.dialCode, sortOrder: c.sortOrder ?? 100 })
      .onConflictDoUpdate({ target: countries.code, set: { name: c.name, nameVi: c.nameVi, region: c.region, dialCode: c.dialCode, sortOrder: c.sortOrder ?? 100 } });
  }
  for (const c of CURRENCIES) {
    await db
      .insert(currencies)
      .values(c)
      .onConflictDoUpdate({ target: currencies.code, set: { name: c.name, symbol: c.symbol, decimals: c.decimals, rateToUsd: c.rateToUsd, isDefault: c.isDefault, sortOrder: c.sortOrder } });
  }
  for (const [i, p] of PROVINCES.entries()) {
    await db
      .insert(provinces)
      .values({
        countryCode: "VN",
        code: p.code,
        slug: p.slug,
        name: p.name,
        nameVi: p.nameVi,
        region: p.region,
        isIndustrialCluster: !!p.cluster,
        clusterHeadline: p.cluster?.headline ?? null,
        clusterHeadlineVi: p.cluster?.headlineVi ?? null,
        clusterDescription: p.cluster?.description ?? null,
        clusterDescriptionVi: p.cluster?.descriptionVi ?? null,
        majorIndustries: p.cluster?.majorIndustries ?? [],
        keyFacts: p.cluster?.keyFacts ?? null,
        heroImageUrl: p.cluster ? `https://loremflickr.com/1600/600/vietnam,factory,industry?lock=${i + 11}` : null,
        seoTitle: p.cluster ? `Manufacturers in ${p.name}, Vietnam` : null,
        seoDescription: p.cluster?.headline ?? null,
        sortOrder: i,
      })
      .onConflictDoUpdate({
        target: provinces.slug,
        set: {
          name: p.name,
          nameVi: p.nameVi,
          region: p.region,
          isIndustrialCluster: !!p.cluster,
          clusterHeadline: p.cluster?.headline ?? null,
          clusterHeadlineVi: p.cluster?.headlineVi ?? null,
          clusterDescription: p.cluster?.description ?? null,
          clusterDescriptionVi: p.cluster?.descriptionVi ?? null,
          majorIndustries: p.cluster?.majorIndustries ?? [],
          keyFacts: p.cluster?.keyFacts ?? null,
          sortOrder: i,
        },
      });
  }
  const industryIds = new Map<string, string>();
  for (const [i, ind] of INDUSTRIES.entries()) {
    const [row] = await db
      .insert(industries)
      .values({ slug: ind.slug, name: ind.name, nameVi: ind.nameVi, icon: ind.icon, description: ind.description, sortOrder: i })
      .onConflictDoUpdate({ target: industries.slug, set: { name: ind.name, nameVi: ind.nameVi, icon: ind.icon, description: ind.description, sortOrder: i } })
      .returning({ id: industries.id });
    industryIds.set(ind.slug, row.id);
  }
  const categoryIds = new Map<string, string>();
  for (const [i, cat] of CATEGORIES.entries()) {
    const [parent] = await db
      .insert(productCategories)
      .values({
        slug: cat.slug,
        name: cat.name,
        nameVi: cat.nameVi,
        industryId: industryIds.get(cat.industry) ?? null,
        icon: cat.icon ?? null,
        level: 0,
        path: "",
        sortOrder: i,
        isFeatured: !!cat.featured,
        imageUrl: `https://loremflickr.com/640/480/${encodeURIComponent(cat.slug.replace(/-/g, ","))},factory?lock=${100 + i}`,
        seoTitle: `${cat.name} manufacturers & suppliers in Vietnam`,
        seoDescription: `Source ${cat.name.toLowerCase()} from verified Vietnamese manufacturers. Compare MOQ, prices, lead times and certifications on CANG.`,
      })
      .onConflictDoUpdate({
        target: productCategories.slug,
        set: { name: cat.name, nameVi: cat.nameVi, industryId: industryIds.get(cat.industry) ?? null, icon: cat.icon ?? null, sortOrder: i, isFeatured: !!cat.featured },
      })
      .returning({ id: productCategories.id });
    categoryIds.set(cat.slug, parent.id);
    for (const [j, child] of (cat.children ?? []).entries()) {
      const [row] = await db
        .insert(productCategories)
        .values({
          slug: child.slug,
          name: child.name,
          nameVi: child.nameVi,
          parentId: parent.id,
          industryId: industryIds.get(cat.industry) ?? null,
          level: 1,
          path: `${cat.slug}/`,
          sortOrder: j,
          imageUrl: `https://loremflickr.com/640/480/${encodeURIComponent(child.slug.replace(/-/g, ","))}?lock=${200 + i * 10 + j}`,
          seoTitle: `${child.name} manufacturers & suppliers in Vietnam`,
          seoDescription: `Find Vietnamese ${child.name.toLowerCase()} factories with verified capacity, MOQ and export experience.`,
        })
        .onConflictDoUpdate({
          target: productCategories.slug,
          set: { name: child.name, nameVi: child.nameVi, parentId: parent.id, industryId: industryIds.get(cat.industry) ?? null, level: 1, path: `${cat.slug}/`, sortOrder: j },
        })
        .returning({ id: productCategories.id });
      categoryIds.set(child.slug, row.id);
    }
  }
  const certificationIds = new Map<string, string>();
  for (const [i, c] of CERTIFICATIONS.entries()) {
    const [row] = await db
      .insert(certifications)
      .values({ code: c.code, name: c.name, category: c.category, issuingBody: c.issuingBody, description: c.description, sortOrder: i })
      .onConflictDoUpdate({ target: certifications.code, set: { name: c.name, category: c.category, issuingBody: c.issuingBody, description: c.description, sortOrder: i } })
      .returning({ id: certifications.id });
    certificationIds.set(c.code, row.id);
  }
  const provinceRows = await db.select({ id: provinces.id, slug: provinces.slug }).from(provinces).where(eq(provinces.countryCode, "VN"));
  const provinceIds = new Map(provinceRows.map((p) => [p.slug, p.id]));
  return { industryIds, categoryIds, certificationIds, provinceIds };
}
