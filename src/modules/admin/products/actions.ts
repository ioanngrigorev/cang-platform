"use server";

import { and, eq, isNull, sql } from "drizzle-orm";
import { db } from "@/db";
import { productCategories, products } from "@/db/schema";
import { ActionError, formDataToObject, ok, parseInput, runAction, type ActionResult } from "@/lib/action";
import { notifyCompany } from "@/modules/notifications/service";
import { adminActor, revalidateAdmin } from "../context";
import { productFeatureSchema, productIdSchema, productRejectSchema, productUnpublishSchema } from "./schemas";

async function load(productId: string) {
  const [p] = await db.select().from(products).where(and(eq(products.id, productId), isNull(products.deletedAt))).limit(1);
  if (!p) throw new ActionError("Product not found.", "NOT_FOUND");
  return p;
}

function revalidate(productId: string) {
  revalidateAdmin("/admin/products", `/admin/products/${productId}`, "/admin");
}

/** Keep the denormalised category counter in sync when a product enters or leaves ACTIVE. */
async function bumpCategoryCount(categoryId: string, delta: number) {
  await db.update(productCategories).set({ productCount: sql`greatest(0, ${productCategories.productCount} + ${delta})` }).where(eq(productCategories.id, categoryId));
}

export async function approveProductAction(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  return runAction(async () => {
    const { user, log } = await adminActor("admin.products.moderate");
    const parsed = parseInput(productIdSchema, formDataToObject(formData));
    if (!parsed.success) return parsed.result;
    const p = await load(parsed.data.productId);
    if (p.status === "ACTIVE") return ok(undefined, "Product is already live.");
    await db.update(products).set({ status: "ACTIVE", publishedAt: p.publishedAt ?? new Date(), reviewedById: user.id, rejectionReason: null }).where(eq(products.id, p.id));
    await bumpCategoryCount(p.categoryId, 1);
    await log({ action: "admin.product.approve", entityType: "product", entityId: p.id, before: { status: p.status }, after: { status: "ACTIVE", companyId: p.companyId } });
    await notifyCompany(p.companyId, { type: "PRODUCT_MODERATION", title: `"${p.title}" is now live`, body: "Your product passed moderation and is visible to buyers.", link: `/seller/products/${p.id}` });
    revalidate(p.id);
    return ok(undefined, "Product approved and published.");
  });
}

export async function rejectProductAction(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  return runAction(async () => {
    const { user, log } = await adminActor("admin.products.moderate");
    const parsed = parseInput(productRejectSchema, formDataToObject(formData));
    if (!parsed.success) return parsed.result;
    const p = await load(parsed.data.productId);
    if (p.status === "REJECTED") return ok(undefined, "Product is already rejected.");
    await db.update(products).set({ status: "REJECTED", rejectionReason: parsed.data.reason, reviewedById: user.id }).where(eq(products.id, p.id));
    if (p.status === "ACTIVE") await bumpCategoryCount(p.categoryId, -1);
    await log({ action: "admin.product.reject", entityType: "product", entityId: p.id, before: { status: p.status }, after: { status: "REJECTED", reason: parsed.data.reason, companyId: p.companyId } });
    await notifyCompany(p.companyId, { type: "PRODUCT_MODERATION", title: `"${p.title}" was not approved`, body: parsed.data.reason, link: `/seller/products/${p.id}` });
    revalidate(p.id);
    return ok(undefined, "Product rejected.");
  });
}

export async function unpublishProductAction(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  return runAction(async () => {
    const { user, log } = await adminActor("admin.products.moderate");
    const parsed = parseInput(productUnpublishSchema, formDataToObject(formData));
    if (!parsed.success) return parsed.result;
    const p = await load(parsed.data.productId);
    if (p.status !== "ACTIVE") throw new ActionError("Only live products can be unpublished.", "INVALID_STATE");
    await db.update(products).set({ status: "INACTIVE", reviewedById: user.id, isFeatured: false, featuredUntil: null }).where(eq(products.id, p.id));
    await bumpCategoryCount(p.categoryId, -1);
    await log({ action: "admin.product.unpublish", entityType: "product", entityId: p.id, before: { status: p.status }, after: { status: "INACTIVE", reason: parsed.data.reason, companyId: p.companyId } });
    await notifyCompany(p.companyId, { type: "PRODUCT_MODERATION", title: `"${p.title}" was unpublished by CANG`, body: parsed.data.reason ?? undefined, link: `/seller/products/${p.id}` });
    revalidate(p.id);
    return ok(undefined, "Product unpublished.");
  });
}

export async function featureProductAction(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  return runAction(async () => {
    const { log } = await adminActor("admin.products.moderate");
    const parsed = parseInput(productFeatureSchema, formDataToObject(formData));
    if (!parsed.success) return parsed.result;
    const p = await load(parsed.data.productId);
    const featured = parsed.data.featured === "true";
    const days = parsed.data.days ?? 30;
    const boost = parsed.data.searchBoost ?? p.searchBoost;
    await db
      .update(products)
      .set({ isFeatured: featured, featuredUntil: featured ? new Date(Date.now() + days * 86400000) : null, searchBoost: Math.round(boost) })
      .where(eq(products.id, p.id));
    await log({ action: "admin.product.feature", entityType: "product", entityId: p.id, before: { isFeatured: p.isFeatured, searchBoost: p.searchBoost }, after: { isFeatured: featured, days: featured ? days : null, searchBoost: boost } });
    revalidate(p.id);
    return ok(undefined, featured ? `Product featured for ${days} days.` : "Product no longer featured.");
  });
}
