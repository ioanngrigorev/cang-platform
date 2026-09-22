/**
 * Step 2 — products with images, price tiers, variants, specifications and certifications.
 */
import type { Db } from "@/db";
import { productCertifications, productImages, productPriceTiers, productSpecifications, productVariants, products } from "@/db/schema";
import { PRODUCTS, type ProductSeed } from "../data/products";
import { CERTIFICATIONS } from "../data/reference";
import type { SupplierSeed } from "../data/suppliers";
import { insertAll, type World } from "./context";
import { round4 } from "./rng";
import { composeProductCopy } from "./text";

type ProductRow = typeof products.$inferInsert;
type ImageRow = typeof productImages.$inferInsert;
type TierRow = typeof productPriceTiers.$inferInsert;
type VariantRow = typeof productVariants.$inferInsert;
type SpecRow = typeof productSpecifications.$inferInsert;
type ProductCertRow = typeof productCertifications.$inferInsert;

const CERT_NAME = new Map(CERTIFICATIONS.map((c) => [c.code, c.name]));

const IMAGE_SUFFIXES: Array<[string, string]> = [
  ["", "product photo"],
  [",closeup", "detail view"],
  [",factory", "in production"],
  [",packaging", "packaging"],
  [",warehouse", "ready for shipment"],
];

/** Minimal supplier facts for the copy composer when the seller is not in SUPPLIERS (the Vietnamese distributor). */
function supplierLike(w: World, slug: string): SupplierSeed {
  const s = w.suppliers.get(slug);
  if (s) return s.seed;
  const b = w.buyer(slug);
  return {
    slug,
    name: b.name,
    nameVi: b.seed.nameVi ?? b.name,
    legalName: b.seed.legalName,
    businessType: "DISTRIBUTOR",
    province: b.seed.province ?? "hanoi",
    city: b.seed.city,
    address: b.seed.address,
    taxId: b.seed.taxId,
    website: b.seed.website,
    email: b.seed.email,
    phone: b.seed.phone,
    tagline: b.seed.tagline,
    taglineVi: b.seed.taglineVi,
    about: b.seed.description,
    aboutVi: b.seed.descriptionVi,
    industries: ["industrial-services"],
    coverKeyword: "warehouse",
    mediaKeywords: [],
    year: b.seed.year,
    employees: b.seed.employees,
    languages: b.seed.languages,
    verification: b.seed.verified ? "VERIFIED" : "PENDING",
    plan: "FREE",
    responseRate: 90,
    avgResponseHours: 6,
    certs: [],
    factory: {
      address: b.seed.address,
      sizeSqm: 3000,
      lines: 0,
      capacity: "distribution warehouse",
      capacityVi: "kho phân phối",
      capacityValue: 0,
      capacityUnit: "",
      oem: false,
      odm: false,
      privateLabel: false,
      minOrderUsd: 500,
      leadDays: 3,
      sampleDays: 2,
      exportCountries: ["LA", "KH", "AE"],
      mainMarkets: ["Vietnam"],
      mainMarketsVi: ["Việt Nam"],
      exportPct: 15,
      exportYears: 4,
      rdStaff: 0,
      qcStaff: 4,
      equipment: "",
      equipmentVi: "",
      materials: "",
      materialsVi: "",
      paymentTerms: ["T/T"],
      incoterms: ["EXW", "FCA", "DAP"],
      tour: false,
    },
    owner: { name: b.seed.owner.name, email: b.seed.owner.email, title: b.seed.owner.title, phone: b.seed.owner.phone },
  };
}

function tiersFor(p: ProductSeed): Array<{ minQty: number; maxQty: number | null; price: number }> {
  const type = p.priceType ?? "TIERED";
  const currency = p.currency ?? "USD";
  const round = (n: number) => (currency === "VND" ? Math.round(n / 1000) * 1000 : round4(n));
  if (type === "CONTACT") return [];
  if (type === "FIXED") return [{ minQty: p.moq, maxQty: null, price: round(p.price) }];
  const [m2, m3] = p.moq < 20 ? [3, 10] : [2, 5];
  return [
    { minQty: p.moq, maxQty: p.moq * m2 - 1, price: round(p.price) },
    { minQty: p.moq * m2, maxQty: p.moq * m3 - 1, price: round(p.price * 0.94) },
    { minQty: p.moq * m3, maxQty: null, price: round(p.price * 0.88) },
  ];
}

export async function seedProducts(db: Db, w: World): Promise<void> {
  const { rng } = w;
  const productRows: ProductRow[] = [];
  const imageRows: ImageRow[] = [];
  const tierRows: TierRow[] = [];
  const variantRows: VariantRow[] = [];
  const specRows: SpecRow[] = [];
  const certRows: ProductCertRow[] = [];
  const seenSlugs = new Set<string>();
  const skuCounter = new Map<string, number>();

  for (const p of PRODUCTS) {
    if (seenSlugs.has(p.slug)) throw new Error(`seed: duplicate product slug "${p.slug}"`);
    seenSlugs.add(p.slug);
    const company = w.company(p.supplier);
    const supplierSeed = supplierLike(w, p.supplier);
    const categoryId = w.category(p.category);
    const status = p.status ?? "ACTIVE";
    const priceType = p.priceType ?? "TIERED";
    const currency = p.currency ?? "USD";
    const tiers = tiersFor(p);
    const certNames = (p.certs ?? []).map((c) => CERT_NAME.get(c) ?? c);
    const copy = composeProductCopy(p, supplierSeed, tiers, certNames);
    const id = rng.id();
    const publishedAt = status === "ACTIVE" ? w.daysAgo(rng.int(3, 540)) : null;
    const createdAt = publishedAt ? new Date(publishedAt.getTime() - rng.int(1, 5) * 86_400_000) : w.daysAgo(rng.int(1, 12));
    const n = (skuCounter.get(p.supplier) ?? 0) + 1;
    skuCounter.set(p.supplier, n);
    const skuPrefix = p.supplier
      .split("-")
      .map((s) => s[0])
      .join("")
      .toUpperCase()
      .slice(0, 4);
    const ageDays = publishedAt ? Math.max(1, Math.round((w.now.getTime() - publishedAt.getTime()) / 86_400_000)) : 0;
    const dailyViews = p.featured ? rng.float(6, 14) : rng.float(0.8, 5);
    const viewCount = status === "ACTIVE" ? Math.round(ageDays * dailyViews) + rng.int(10, 60) : 0;
    const inquiryCount = status === "ACTIVE" ? Math.round(viewCount * rng.float(0.01, 0.04)) : 0;
    const rfqCount = status === "ACTIVE" ? Math.round(inquiryCount * rng.float(0.2, 0.6)) : 0;
    const orderCount = status === "ACTIVE" ? (rng.chance(0.35) ? rng.int(1, 6) : 0) : 0;
    const basePrice = priceType === "CONTACT" ? null : tiers[0]?.price ?? (currency === "VND" ? p.price : round4(p.price));

    productRows.push({
      id,
      companyId: company.id,
      categoryId,
      slug: p.slug,
      sku: `${skuPrefix}-${String(n).padStart(3, "0")}`,
      title: p.title,
      titleVi: p.titleVi,
      shortDescription: copy.short,
      description: copy.description,
      descriptionVi: copy.descriptionVi,
      status,
      reviewedById: status === "ACTIVE" ? w.adminUserId : null,
      priceType,
      currency,
      basePrice,
      moq: p.moq,
      unit: p.unit,
      hasSample: p.sample !== false,
      samplePrice: p.sample && p.sample.price > 0 ? p.sample.price : p.sample === false ? null : 0,
      sampleLeadDays: p.sample ? p.sample.days : null,
      leadTimeDays: p.lead,
      leadTimeNote: copy.leadTimeNote,
      customizable: p.customizable ?? (supplierSeed.factory.oem || supplierSeed.factory.odm),
      oemAvailable: p.customizable === false ? false : supplierSeed.factory.oem,
      odmAvailable: p.customizable === false ? false : supplierSeed.factory.odm,
      packagingDetails: copy.packagingDetails,
      shippingInfo: copy.shippingInfo,
      hsCode: p.hs,
      originCountry: "VN",
      brand: p.brand ?? (supplierSeed.factory.privateLabel ? "OEM / private label" : supplierSeed.name),
      model: `${skuPrefix}-${String(n).padStart(3, "0")}`,
      videoUrl: null,
      keywords: p.keywords,
      viewCount,
      inquiryCount,
      rfqCount,
      orderCount,
      isFeatured: !!p.featured && status === "ACTIVE",
      featuredUntil: p.featured && status === "ACTIVE" ? w.daysFromNow(rng.int(20, 90)) : null,
      searchBoost: p.featured ? 3 : 0,
      seoTitle: copy.seoTitle,
      seoDescription: copy.seoDescription,
      publishedAt,
      createdAt,
      updatedAt: publishedAt ? w.daysAgo(rng.int(0, Math.min(ageDays, 30))) : createdAt,
    });

    const imageCount = status === "ACTIVE" ? rng.int(3, 5) : 3;
    let primaryImage = "";
    for (let i = 0; i < imageCount; i++) {
      const [suffix, altSuffix] = IMAGE_SUFFIXES[i];
      const url = w.image(800, 600, `${p.img}${suffix}`);
      if (i === 0) primaryImage = url;
      imageRows.push({ id: rng.id(), productId: id, url, alt: `${p.title} — ${altSuffix}`, sortOrder: i, isPrimary: i === 0, width: 800, height: 600, createdAt });
    }

    for (const t of tiers) tierRows.push({ id: rng.id(), productId: id, minQty: t.minQty, maxQty: t.maxQty, price: t.price, currency });

    const variantSpecs: Array<{ name: string; attributes: Record<string, string> }> = [];
    if (p.variants) {
      for (const [attr, options] of Object.entries(p.variants)) {
        for (const opt of options) variantSpecs.push({ name: opt, attributes: { [attr]: opt } });
      }
    }
    if (variantSpecs.length < 2) {
      variantSpecs.push({ name: "Standard specification", attributes: { Option: "Standard specification" } });
      variantSpecs.push({ name: "Custom specification", attributes: { Option: "Custom specification (per drawing / tech pack)" } });
    }
    variantSpecs.slice(0, 5).forEach((v, i) => {
      variantRows.push({
        id: rng.id(),
        productId: id,
        sku: `${skuPrefix}-${String(n).padStart(3, "0")}-${String(i + 1).padStart(2, "0")}`,
        name: v.name,
        attributes: v.attributes,
        price: basePrice,
        moq: p.moq,
        imageUrl: i < imageCount ? imageRows[imageRows.length - imageCount + i].url : null,
        isActive: true,
        sortOrder: i,
        createdAt,
        updatedAt: createdAt,
      });
    });

    p.specs.forEach(([name, value, unit], i) => specRows.push({ id: rng.id(), productId: id, name, value, unit: unit ?? null, sortOrder: i }));
    for (const code of p.certs ?? []) certRows.push({ productId: id, certificationId: w.certification(code) });

    w.products.set(p.slug, { id, slug: p.slug, companySlug: p.supplier, title: p.title, categoryId, categorySlug: p.category, unit: p.unit, basePrice, hsCode: p.hs, primaryImage, status });
  }

  await insertAll(db, products, productRows);
  await insertAll(db, productImages, imageRows);
  await insertAll(db, productPriceTiers, tierRows);
  await insertAll(db, productVariants, variantRows);
  await insertAll(db, productSpecifications, specRows);
  await insertAll(db, productCertifications, certRows);
  const active = productRows.filter((r) => r.status === "ACTIVE").length;
  console.log(`  products: ${productRows.length} (${active} active), images: ${imageRows.length}, tiers: ${tierRows.length}, variants: ${variantRows.length}, specs: ${specRows.length}`);
}
