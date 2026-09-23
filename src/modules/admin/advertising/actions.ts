"use server";

import { and, eq, ne } from "drizzle-orm";
import { db } from "@/db";
import { adCampaigns, adProducts, advertisements } from "@/db/schema";
import { ActionError, formDataToObject, ok, parseInput, runAction, type ActionResult } from "@/lib/action";
import { notifyCompany } from "@/modules/notifications/service";
import { adminActor, revalidateAdmin } from "../context";
import { adProductSchema, adProductToggleSchema, campaignDecisionSchema } from "./schemas";

export async function saveAdProductAction(_prev: ActionResult<{ id: string }> | null, formData: FormData): Promise<ActionResult<{ id: string }>> {
  return runAction(async () => {
    const { log } = await adminActor("admin.advertising.write");
    const parsed = parseInput(adProductSchema, formDataToObject(formData));
    if (!parsed.success) return parsed.result;
    const d = parsed.data;
    const [dup] = await db
      .select({ id: adProducts.id })
      .from(adProducts)
      .where(d.adProductId ? and(eq(adProducts.code, d.code), ne(adProducts.id, d.adProductId)) : eq(adProducts.code, d.code))
      .limit(1);
    if (dup) throw new ActionError("An ad product with this code already exists.", "VALIDATION", { code: ["Code already in use"] });
    let before: typeof adProducts.$inferSelect | null = null;
    if (d.adProductId) {
      [before] = await db.select().from(adProducts).where(eq(adProducts.id, d.adProductId)).limit(1);
      if (!before) throw new ActionError("Ad product not found.", "NOT_FOUND");
    }
    const values = {
      code: d.code,
      placement: d.placement,
      name: d.name,
      nameVi: d.nameVi,
      description: d.description,
      pricingModel: d.pricingModel,
      price: d.price,
      currency: d.currency,
      minBudget: d.minBudget,
      maxSlots: d.maxSlots == null ? null : Math.round(d.maxSlots),
      sortOrder: d.sortOrder,
      isActive: d.isActive,
    };
    const [row] = before ? await db.update(adProducts).set(values).where(eq(adProducts.id, before.id)).returning() : await db.insert(adProducts).values(values).returning();
    await log({ action: before ? "admin.ad_product.update" : "admin.ad_product.create", entityType: "ad_product", entityId: row.id, before: before ? { code: before.code, price: before.price, isActive: before.isActive } : null, after: { code: row.code, price: row.price, pricingModel: row.pricingModel, isActive: row.isActive } });
    revalidateAdmin("/admin/advertising");
    return ok({ id: row.id }, before ? "Ad product updated." : "Ad product created.");
  });
}

export async function toggleAdProductAction(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  return runAction(async () => {
    const { log } = await adminActor("admin.advertising.write");
    const parsed = parseInput(adProductToggleSchema, formDataToObject(formData));
    if (!parsed.success) return parsed.result;
    const active = parsed.data.isActive === "true";
    const [row] = await db.update(adProducts).set({ isActive: active }).where(eq(adProducts.id, parsed.data.adProductId)).returning({ id: adProducts.id, code: adProducts.code });
    if (!row) throw new ActionError("Ad product not found.", "NOT_FOUND");
    await log({ action: "admin.ad_product.toggle", entityType: "ad_product", entityId: row.id, after: { code: row.code, isActive: active } });
    revalidateAdmin("/admin/advertising");
    return ok(undefined, active ? "Ad product activated." : "Ad product deactivated.");
  });
}

export async function campaignDecisionAction(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  return runAction(async () => {
    const { log } = await adminActor("admin.advertising.write");
    const parsed = parseInput(campaignDecisionSchema, formDataToObject(formData));
    if (!parsed.success) return parsed.result;
    const [c] = await db.select().from(adCampaigns).where(eq(adCampaigns.id, parsed.data.campaignId)).limit(1);
    if (!c) throw new ActionError("Campaign not found.", "NOT_FOUND");
    const d = parsed.data.decision;
    if (d === "REJECTED" && !parsed.data.reason) throw new ActionError("Give the advertiser a reason.", "VALIDATION", { reason: ["Give a reason"] });
    if (c.status === d) return ok(undefined, "Campaign unchanged.");
    await db.transaction(async (tx) => {
      await tx.update(adCampaigns).set({ status: d, rejectionReason: d === "REJECTED" ? parsed.data.reason : c.rejectionReason }).where(eq(adCampaigns.id, c.id));
      await tx.update(advertisements).set({ isActive: d === "ACTIVE" }).where(eq(advertisements.campaignId, c.id));
    });
    await log({ action: `admin.ad_campaign.${d.toLowerCase()}`, entityType: "ad_campaign", entityId: c.id, before: { status: c.status }, after: { status: d, reason: parsed.data.reason, companyId: c.companyId } });
    const titles: Record<typeof d, string> = {
      ACTIVE: `Campaign "${c.name}" is now live`,
      REJECTED: `Campaign "${c.name}" was not approved`,
      PAUSED: `Campaign "${c.name}" was paused by CANG`,
      CANCELLED: `Campaign "${c.name}" was cancelled by CANG`,
    };
    await notifyCompany(c.companyId, { type: "SYSTEM", title: titles[d], body: parsed.data.reason ?? undefined, link: "/seller/advertising", email: d === "ACTIVE" || d === "REJECTED" });
    revalidateAdmin("/admin/advertising", "/admin");
    return ok(undefined, "Campaign updated.");
  });
}
