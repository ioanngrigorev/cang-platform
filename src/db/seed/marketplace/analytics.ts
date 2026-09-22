/**
 * Step 8 — analytics: 30 days of supplier daily metrics for 8 suppliers, ~400 raw analytics events,
 * two active ad campaigns with advertisements and ad events.
 */
import type { Db } from "@/db";
import { adCampaigns, adEvents, advertisements, analyticsEvents, supplierDailyMetrics } from "@/db/schema";
import { insertAll, type World } from "./context";
import { isoDate, round2 } from "./rng";

type MetricRow = typeof supplierDailyMetrics.$inferInsert;
type EventRow = typeof analyticsEvents.$inferInsert;
type CampaignRow = typeof adCampaigns.$inferInsert;
type AdRow = typeof advertisements.$inferInsert;
type AdEventRow = typeof adEvents.$inferInsert;

const METRIC_SUPPLIERS = ["saigon-pack-manufacturing", "dai-viet-garment-export", "bien-hoa-footwear", "truong-an-wood-furniture", "bac-ninh-precision-electronics", "brightviet-led-lighting", "tay-nguyen-coffee-export", "phoenix-activewear"];
const COUNTRIES = ["DE", "US", "GB", "JP", "AU", "NL", "FR", "KR", "VN", "CA", "SE", "AE"];
const SEARCHES = ["hiking backpack", "recycled polyester bag", "acacia dining table", "trail running shoes OEM", "LED high bay 150W", "robusta screen 18", "stand up pouch", "PCBA assembly Vietnam", "safety boots S3", "stoneware dinnerware", "leggings manufacturer", "cotton tote bag", "injection moulding", "hotel towel 600gsm", "packable rain jacket"];

export async function seedAnalytics(db: Db, w: World): Promise<void> {
  const { rng } = w;
  const metricRows: MetricRow[] = [];
  const featuredCampaignSupplier = w.supplier("saigon-pack-manufacturing");
  const searchCampaignSupplier = w.supplier("truong-an-wood-furniture");

  for (const slug of METRIC_SUPPLIERS) {
    const supplier = w.supplier(slug);
    const scale = slug === "saigon-pack-manufacturing" ? 1.8 : supplier.seed.plan === "PREMIUM" ? 1.4 : 1;
    const advertised = slug === featuredCampaignSupplier.slug || slug === searchCampaignSupplier.slug;
    for (let d = 29; d >= 0; d--) {
      const date = w.daysAgo(d);
      const weekend = date.getUTCDay() === 0 || date.getUTCDay() === 6;
      const views = Math.round(rng.int(18, 60) * scale * (weekend ? 0.55 : 1));
      const productViews = Math.round(views * rng.float(1.6, 2.8));
      const leads = rng.chance(0.7) ? rng.int(0, Math.max(1, Math.round(views / 12))) : 0;
      const rfqsReceived = rng.chance(0.5) ? rng.int(0, 2) : 0;
      const quotationsSent = Math.min(rfqsReceived + (rng.chance(0.3) ? 1 : 0), 3);
      const ordersCount = rng.chance(0.08 * scale) ? 1 : 0;
      const adImpressions = advertised ? rng.int(120, 320) : 0;
      const adClicks = advertised ? Math.round(adImpressions * rng.float(0.03, 0.07)) : 0;
      metricRows.push({
        id: rng.id(),
        companyId: supplier.id,
        date: isoDate(date),
        views,
        productViews,
        leads,
        rfqsReceived,
        quotations: quotationsSent,
        orders: ordersCount,
        gmvUsd: ordersCount ? round2(rng.int(8000, 95000)) : 0,
        adImpressions,
        adClicks,
        adSpendUsd: slug === featuredCampaignSupplier.slug ? 8 : slug === searchCampaignSupplier.slug ? round2(adClicks * 0.45) : 0,
      });
    }
  }
  await insertAll(db, supplierDailyMetrics, metricRows);

  // ---- raw analytics events (≈400)
  const activeProducts = [...w.products.values()].filter((p) => p.status === "ACTIVE");
  const supplierList = [...w.suppliers.values()];
  const buyerUsers = [...w.buyers.values()].map((b) => b.ownerUserId);
  const eventRows: EventRow[] = [];
  const TYPES: Array<[EventRow["type"], number]> = [["PRODUCT_VIEW", 0.42], ["SUPPLIER_VIEW", 0.2], ["SEARCH", 0.15], ["PAGE_VIEW", 0.1], ["RFQ_VIEW", 0.05], ["PRODUCT_INQUIRY", 0.04], ["SUPPLIER_CONTACT", 0.02], ["RFQ_POSTED", 0.01], ["QUOTATION_SUBMITTED", 0.01]];
  for (let i = 0; i < 400; i++) {
    const roll = rng.float();
    let acc = 0;
    let type: EventRow["type"] = "PAGE_VIEW";
    for (const [t, p] of TYPES) {
      acc += p;
      if (roll < acc) {
        type = t;
        break;
      }
    }
    const createdAt = w.hoursAgo(rng.int(0, 30 * 24));
    const sessionId = `sess_${rng.int(100000, 999999)}`;
    const countryCode = rng.pick(COUNTRIES);
    const userId = rng.chance(0.25) ? rng.pick(buyerUsers) : null;
    const base = { id: rng.id(), type, userId, sessionId, countryCode, referrer: rng.chance(0.4) ? rng.pick(["https://www.google.com/", "https://www.bing.com/", "https://www.linkedin.com/", null]) : null, createdAt };
    if (type === "PRODUCT_VIEW" || type === "PRODUCT_INQUIRY") {
      const p = rng.pick(activeProducts);
      eventRows.push({ ...base, companyId: w.company(p.companySlug).id, productId: p.id, path: `/en/product/${p.slug}`, metadata: type === "PRODUCT_INQUIRY" ? { source: "product_page" } : null });
    } else if (type === "SUPPLIER_VIEW" || type === "SUPPLIER_CONTACT") {
      const s = rng.pick(supplierList);
      eventRows.push({ ...base, companyId: s.id, productId: null, path: `/en/supplier/${s.slug}`, metadata: null });
    } else if (type === "SEARCH") {
      const q = rng.pick(SEARCHES);
      eventRows.push({ ...base, companyId: null, productId: null, path: `/en/search?q=${encodeURIComponent(q)}`, metadata: { query: q, results: rng.int(3, 48) } });
    } else if (type === "RFQ_VIEW" || type === "RFQ_POSTED") {
      const r = rng.pick([...w.rfqs.values()]);
      eventRows.push({ ...base, companyId: null, productId: null, path: `/en/rfq/${r.id}`, metadata: { rfqNumber: r.number } });
    } else if (type === "QUOTATION_SUBMITTED") {
      const q = rng.pick([...w.quotations.values()]);
      eventRows.push({ ...base, companyId: w.supplier(q.supplierSlug).id, productId: null, path: `/en/seller/rfqs/${w.rfq(q.rfqKey).id}`, metadata: { quotationNumber: q.number } });
    } else {
      eventRows.push({ ...base, companyId: null, productId: null, path: rng.pick(["/en", "/en/manufacturers", "/en/products", "/en/why-vietnam", "/en/guides/buyer-guide", "/vi", "/vi/manufacturers"]), metadata: null });
    }
  }
  await insertAll(db, analyticsEvents, eventRows);

  // ---- ad campaigns
  const featuredProductId = w.ref(w.ctx.adProductIds, "FEATURED_PRODUCT", "ad product");
  const topSearchId = w.ref(w.ctx.adProductIds, "TOP_SEARCH", "ad product");
  const campaign1 = rng.id();
  const campaign2 = rng.id();
  const campaignRows: CampaignRow[] = [
    {
      id: campaign1,
      companyId: featuredCampaignSupplier.id,
      adProductId: featuredProductId,
      name: "SS27 backpack launch — featured products",
      status: "ACTIVE",
      budget: 480,
      spent: 184,
      dailyBudget: 8,
      currency: "USD",
      startAt: w.daysAgo(23),
      endAt: w.daysFromNow(37),
      targeting: { categories: ["backpacks", "outdoor-camping"], countries: ["DE", "NL", "SE", "US"], keywords: ["hiking backpack", "recycled backpack"] },
      createdAt: w.daysAgo(25),
      updatedAt: w.daysAgo(1),
    },
    {
      id: campaign2,
      companyId: searchCampaignSupplier.id,
      adProductId: topSearchId,
      name: "Acacia furniture — top search (EU/UK)",
      status: "ACTIVE",
      budget: 300,
      spent: 71.55,
      dailyBudget: 12,
      currency: "USD",
      startAt: w.daysAgo(18),
      endAt: w.daysFromNow(42),
      targeting: { categories: ["dining-furniture", "living-room-furniture"], countries: ["GB", "DE", "FR", "NL"], keywords: ["acacia dining table", "solid wood furniture", "FSC furniture"] },
      createdAt: w.daysAgo(19),
      updatedAt: w.daysAgo(1),
    },
  ];
  const adRows: AdRow[] = [];
  const adEventRows: AdEventRow[] = [];
  const featuredSlugs = ["trailridge-35l-recycled-hiking-backpack", "voyager-40l-carry-on-travel-backpack"];
  for (const slug of featuredSlugs) {
    const p = w.product(slug);
    const adId = rng.id();
    const impressions = rng.int(600, 1400);
    const clicks = Math.round(impressions * rng.float(0.04, 0.07));
    adRows.push({ id: adId, campaignId: campaign1, placement: "FEATURED_PRODUCT", productId: p.id, supplierCompanyId: featuredCampaignSupplier.id, categoryId: p.categoryId, creative: { headline: p.title, imageUrl: p.primaryImage, cta: "Request a quotation" }, impressions, clicks, leads: rng.int(2, 6), rfqs: rng.int(0, 2), orders: 0, isActive: true, createdAt: w.daysAgo(23), updatedAt: w.daysAgo(1) });
    for (let i = 0; i < 15; i++) {
      const isClick = i % 4 === 3;
      adEventRows.push({ id: rng.id(), advertisementId: adId, type: isClick ? "CLICK" : "IMPRESSION", userId: rng.chance(0.2) ? rng.pick(buyerUsers) : null, sessionId: `sess_${rng.int(100000, 999999)}`, cost: 0, metadata: { placement: "category_listing", country: rng.pick(["DE", "NL", "SE", "US"]) }, createdAt: w.hoursAgo(rng.int(0, 23 * 24)) });
    }
  }
  const keywords = ["acacia dining table", "solid wood furniture", "FSC furniture"];
  for (const keyword of keywords) {
    const p = w.product("solid-acacia-dining-table-180cm-fsc");
    const adId = rng.id();
    const impressions = rng.int(300, 900);
    const clicks = Math.round(impressions * rng.float(0.05, 0.09));
    adRows.push({ id: adId, campaignId: campaign2, placement: "TOP_SEARCH", productId: p.id, supplierCompanyId: searchCampaignSupplier.id, categoryId: p.categoryId, keyword, creative: { headline: `${p.title} — FSC, water-based lacquer`, imageUrl: p.primaryImage, cta: "See prices" }, impressions, clicks, leads: rng.int(1, 4), rfqs: rng.int(0, 1), orders: 0, isActive: true, createdAt: w.daysAgo(18), updatedAt: w.daysAgo(1) });
    for (let i = 0; i < 10; i++) {
      const isClick = i % 3 === 2;
      adEventRows.push({ id: rng.id(), advertisementId: adId, type: isClick ? "CLICK" : "IMPRESSION", userId: rng.chance(0.2) ? rng.pick(buyerUsers) : null, sessionId: `sess_${rng.int(100000, 999999)}`, cost: isClick ? 0.45 : 0, metadata: { query: keyword, position: 1, country: rng.pick(["GB", "DE", "FR", "NL"]) }, createdAt: w.hoursAgo(rng.int(0, 18 * 24)) });
    }
  }
  await insertAll(db, adCampaigns, campaignRows);
  await insertAll(db, advertisements, adRows);
  await insertAll(db, adEvents, adEventRows);
  console.log(`  daily metrics: ${metricRows.length}, analytics events: ${eventRows.length}, ad campaigns: ${campaignRows.length}, ad events: ${adEventRows.length}`);
}
