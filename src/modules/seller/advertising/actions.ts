"use server";

import { and, eq, inArray, isNull } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { adCampaigns, adProducts, advertisements, products, users } from "@/db/schema";
import { ActionError, formDataToObject, ok, parseInput, runAction, type ActionResult } from "@/lib/action";
import { audit } from "@/modules/audit/log";
import { requireCompany } from "@/modules/auth/current-user";
import { notifyUser } from "@/modules/notifications/service";
import { ownedCampaign } from "./queries";
import { campaignIdSchema, createCampaignSchema } from "./schemas";

function revalidate() {
  revalidatePath("/[locale]/seller/advertising", "page");
}

/** A new campaign always starts in the review queue; the ads team activates it. */
export async function createCampaignAction(_prev: ActionResult<{ id: string }> | null, formData: FormData): Promise<ActionResult<{ id: string }>> {
  return runAction(async () => {
    const { user, company } = await requireCompany({ permission: "advertising.manage", seller: true });
    const parsed = parseInput(createCampaignSchema, formDataToObject(formData));
    if (!parsed.success) return parsed.result;
    const d = parsed.data;

    const [adProduct] = await db.select().from(adProducts).where(and(eq(adProducts.id, d.adProductId), eq(adProducts.isActive, true))).limit(1);
    if (!adProduct) throw new ActionError("Ad product not found.", "NOT_FOUND");
    if (adProduct.minBudget != null && (d.budget ?? 0) < adProduct.minBudget) {
      throw new ActionError(`The minimum budget for ${adProduct.name} is ${adProduct.minBudget} ${adProduct.currency}.`, "VALIDATION", {
        budget: [`Minimum ${adProduct.minBudget} ${adProduct.currency}`],
      });
    }
    let product: { id: string; title: string; categoryId: string } | null = null;
    if (d.productId) {
      const [p] = await db
        .select({ id: products.id, title: products.title, categoryId: products.categoryId })
        .from(products)
        .where(and(eq(products.id, d.productId), eq(products.companyId, company.id), eq(products.status, "ACTIVE"), isNull(products.deletedAt)))
        .limit(1);
      if (!p) throw new ActionError("Choose one of your live products.", "NOT_FOUND");
      product = p;
    }
    if (!product && adProduct.placement === "FEATURED_PRODUCT") {
      throw new ActionError("Featured product campaigns need a product.", "VALIDATION", { productId: ["Choose a product to feature"] });
    }

    const campaign = await db.transaction(async (tx) => {
      const [row] = await tx
        .insert(adCampaigns)
        .values({
          companyId: company.id,
          adProductId: adProduct.id,
          name: d.name,
          status: "PENDING_REVIEW",
          budget: d.budget!,
          dailyBudget: d.dailyBudget,
          currency: adProduct.currency,
          startAt: d.startAt!,
          endAt: d.endAt,
          targeting: { keywords: d.keywords, categories: product ? [product.categoryId] : [] },
        })
        .returning();
      await tx.insert(advertisements).values({
        campaignId: row.id,
        placement: adProduct.placement,
        productId: product?.id ?? null,
        supplierCompanyId: company.id,
        categoryId: product?.categoryId ?? null,
        keyword: d.keywords[0] ?? null,
        creative: { headline: product?.title ?? company.name },
        isActive: false,
      });
      return row;
    });

    const staff = await db
      .select({ id: users.id })
      .from(users)
      .where(and(inArray(users.platformRole, ["ADMIN", "SUPER_ADMIN", "FINANCE"]), eq(users.status, "ACTIVE"), isNull(users.deletedAt)));
    await Promise.all(
      staff.map((s) =>
        notifyUser(s.id, {
          type: "SYSTEM",
          title: `Ad campaign to review: ${company.name}`,
          body: `${d.name} · ${adProduct.name} · budget ${d.budget} ${adProduct.currency}`,
          link: "/admin/advertising",
          email: false,
        }),
      ),
    );
    await audit({ actorId: user.id, action: "advertising.campaign.create", entityType: "adCampaign", entityId: campaign.id, after: { name: d.name, adProduct: adProduct.code, budget: d.budget } });
    revalidate();
    return ok({ id: campaign.id }, "Campaign submitted for review.");
  });
}

async function transition(formData: FormData, from: string[], to: "ACTIVE" | "PAUSED" | "CANCELLED", action: string, message: string): Promise<ActionResult> {
  const { user, company } = await requireCompany({ permission: "advertising.manage", seller: true });
  const parsed = parseInput(campaignIdSchema, formDataToObject(formData));
  if (!parsed.success) return parsed.result;
  const campaign = await ownedCampaign(company.id, parsed.data.campaignId);
  if (!campaign) throw new ActionError("Campaign not found.", "NOT_FOUND");
  if (!from.includes(campaign.status)) throw new ActionError("This campaign cannot be changed from its current state.", "INVALID_STATE");
  await db.transaction(async (tx) => {
    await tx.update(adCampaigns).set({ status: to }).where(eq(adCampaigns.id, campaign.id));
    await tx.update(advertisements).set({ isActive: to === "ACTIVE" }).where(eq(advertisements.campaignId, campaign.id));
  });
  await audit({ actorId: user.id, action, entityType: "adCampaign", entityId: campaign.id, before: { status: campaign.status }, after: { status: to } });
  revalidate();
  return ok(undefined, message);
}

export async function pauseCampaignAction(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  return runAction(() => transition(formData, ["ACTIVE"], "PAUSED", "advertising.campaign.pause", "Campaign paused."));
}

export async function resumeCampaignAction(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  return runAction(() => transition(formData, ["PAUSED"], "ACTIVE", "advertising.campaign.resume", "Campaign resumed."));
}

export async function cancelCampaignAction(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  return runAction(() => transition(formData, ["PENDING_REVIEW", "ACTIVE", "PAUSED", "DRAFT"], "CANCELLED", "advertising.campaign.cancel", "Campaign cancelled."));
}
