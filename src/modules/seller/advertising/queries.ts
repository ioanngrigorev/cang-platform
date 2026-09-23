import "server-only";
import { and, asc, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { adCampaigns, adProducts } from "@/db/schema";

export async function listSellerCampaigns(companyId: string) {
  return db.query.adCampaigns.findMany({
    where: eq(adCampaigns.companyId, companyId),
    with: {
      adProduct: { columns: { id: true, code: true, name: true, nameVi: true, placement: true, pricingModel: true, price: true, currency: true } },
      ads: {
        columns: { id: true, placement: true, impressions: true, clicks: true, leads: true, rfqs: true, orders: true, isActive: true, keyword: true },
        with: { product: { columns: { id: true, title: true, titleVi: true, slug: true } } },
      },
    },
    orderBy: [desc(adCampaigns.createdAt)],
  });
}
export type SellerCampaignRow = Awaited<ReturnType<typeof listSellerCampaigns>>[number];

export async function adProductOptions() {
  return db
    .select({
      id: adProducts.id,
      code: adProducts.code,
      name: adProducts.name,
      nameVi: adProducts.nameVi,
      description: adProducts.description,
      placement: adProducts.placement,
      pricingModel: adProducts.pricingModel,
      price: adProducts.price,
      currency: adProducts.currency,
      minBudget: adProducts.minBudget,
    })
    .from(adProducts)
    .where(eq(adProducts.isActive, true))
    .orderBy(asc(adProducts.sortOrder), asc(adProducts.name));
}

export async function ownedCampaign(companyId: string, campaignId: string) {
  const [row] = await db
    .select()
    .from(adCampaigns)
    .where(and(eq(adCampaigns.id, campaignId), eq(adCampaigns.companyId, companyId)))
    .limit(1);
  return row ?? null;
}
