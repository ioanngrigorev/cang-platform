import { and, asc, eq, inArray, isNull, notInArray, sql } from "drizzle-orm";
import { db, type Tx } from "@/db";
import {
  documents,
  orderItems,
  productCategories,
  productCertifications,
  productImages,
  productPriceTiers,
  productSpecifications,
  productVariants,
  products,
  users,
} from "@/db/schema";
import { ActionError } from "@/lib/action";
import { slugify } from "@/lib/utils";
import { audit } from "@/modules/audit/log";
import { notifyUser } from "@/modules/notifications/service";
import { getSetting } from "@/modules/settings/service";
import type { ProductFormInput } from "./schemas";

type ProductRow = typeof products.$inferSelect;

/** Generate a unique product slug (title + numeric suffix on collision) — mirrors uniqueCompanySlug. */
export async function uniqueProductSlug(title: string, tx?: Tx): Promise<string> {
  const executor = tx ?? db;
  const base = slugify(title) || "product";
  let slug = base;
  for (let i = 2; i < 50; i++) {
    const [existing] = await executor.select({ id: products.id }).from(products).where(eq(products.slug, slug)).limit(1);
    if (!existing) return slug;
    slug = `${base}-${i}`;
  }
  return `${base}-${Date.now().toString(36)}`;
}

/** Keep the denormalised category counter in step with ACTIVE products. */
export async function refreshCategoryCount(categoryId: string, tx?: Tx) {
  const executor = tx ?? db;
  await executor
    .update(productCategories)
    .set({
      productCount: sql`(SELECT COUNT(*)::int FROM products p WHERE p.category_id = ${categoryId} AND p.status = 'ACTIVE' AND p.deleted_at IS NULL)`,
    })
    .where(eq(productCategories.id, categoryId));
}

async function ownedProduct(companyId: string, productId: string, tx?: Tx): Promise<ProductRow> {
  const executor = tx ?? db;
  const [row] = await executor
    .select()
    .from(products)
    .where(and(eq(products.id, productId), eq(products.companyId, companyId), isNull(products.deletedAt)))
    .limit(1);
  if (!row) throw new ActionError("Product not found.", "NOT_FOUND");
  return row;
}

function columnsFromInput(d: ProductFormInput) {
  return {
    title: d.title,
    titleVi: d.titleVi,
    categoryId: d.categoryId,
    sku: d.sku,
    shortDescription: d.shortDescription,
    description: d.description,
    descriptionVi: d.descriptionVi,
    priceType: d.priceType,
    currency: d.currency,
    basePrice: d.priceType === "CONTACT" ? null : d.basePrice,
    unit: d.unit,
    moq: d.moq,
    leadTimeDays: d.leadTimeDays,
    leadTimeNote: d.leadTimeNote,
    hasSample: d.hasSample,
    samplePrice: d.hasSample ? d.samplePrice : null,
    sampleLeadDays: d.hasSample ? d.sampleLeadDays : null,
    customizable: d.customizable,
    oemAvailable: d.oemAvailable,
    odmAvailable: d.odmAvailable,
    packagingDetails: d.packagingDetails,
    shippingInfo: d.shippingInfo,
    hsCode: d.hsCode,
    originCountry: d.originCountry,
    brand: d.brand,
    model: d.model,
    videoUrl: d.videoUrl,
    keywords: d.keywords,
  };
}

/**
 * Replace the product's tiers, specifications and certifications; upsert variants by name (order
 * items may reference a variant, so removed variants that are referenced are deactivated instead).
 */
async function writeProductDetails(tx: Tx, product: ProductRow, d: ProductFormInput) {
  await tx.delete(productPriceTiers).where(eq(productPriceTiers.productId, product.id));
  const tiers = d.priceType === "TIERED" ? [...d.tiersJson].sort((a, b) => a.minQty - b.minQty) : [];
  if (tiers.length) {
    await tx.insert(productPriceTiers).values(tiers.map((t) => ({ productId: product.id, minQty: t.minQty, maxQty: t.maxQty, price: t.price, currency: d.currency })));
  }

  await tx.delete(productSpecifications).where(eq(productSpecifications.productId, product.id));
  if (d.specsJson.length) {
    await tx.insert(productSpecifications).values(d.specsJson.map((s, i) => ({ productId: product.id, name: s.name, value: s.value, unit: s.unit, sortOrder: i })));
  }

  await tx.delete(productCertifications).where(eq(productCertifications.productId, product.id));
  if (d.certificationIds.length) {
    await tx
      .insert(productCertifications)
      .values(d.certificationIds.map((certificationId) => ({ productId: product.id, certificationId })))
      .onConflictDoNothing();
  }

  const existing = await tx.select().from(productVariants).where(eq(productVariants.productId, product.id));
  const byName = new Map(existing.map((v) => [v.name.toLowerCase(), v]));
  const seen = new Set<string>();
  for (const [i, v] of d.variantsJson.entries()) {
    const current = byName.get(v.name.toLowerCase());
    const values = { name: v.name, sku: v.sku, attributes: v.attributes, price: v.price, moq: v.moq, sortOrder: i, isActive: true };
    if (current) {
      seen.add(current.id);
      await tx.update(productVariants).set(values).where(eq(productVariants.id, current.id));
    } else {
      await tx.insert(productVariants).values({ productId: product.id, ...values });
    }
  }
  const removed = existing.filter((v) => !seen.has(v.id));
  if (removed.length) {
    const referenced = await tx
      .selectDistinct({ id: orderItems.variantId })
      .from(orderItems)
      .where(inArray(orderItems.variantId, removed.map((v) => v.id)));
    const keep = new Set(referenced.map((r) => r.id));
    const deletable = removed.filter((v) => !keep.has(v.id)).map((v) => v.id);
    const deactivate = removed.filter((v) => keep.has(v.id)).map((v) => v.id);
    if (deletable.length) await tx.delete(productVariants).where(inArray(productVariants.id, deletable));
    if (deactivate.length) await tx.update(productVariants).set({ isActive: false }).where(inArray(productVariants.id, deactivate));
  }
}

/**
 * Images: keep the listed existing rows in the given order (first = primary), drop the others and
 * append newly uploaded documents (verified to belong to the company, then made PUBLIC/PHOTO).
 */
async function syncImages(tx: Tx, product: ProductRow, companyId: string, keepImageIds: string[], newDocumentIds: string[]) {
  const existing = await tx.select().from(productImages).where(eq(productImages.productId, product.id));
  const existingIds = new Set(existing.map((i) => i.id));
  const keep = keepImageIds.filter((id) => existingIds.has(id));

  let docs: Array<{ id: string; url: string }> = [];
  if (newDocumentIds.length) {
    docs = await tx
      .select({ id: documents.id, url: documents.url })
      .from(documents)
      .where(and(inArray(documents.id, newDocumentIds), eq(documents.ownerCompanyId, companyId), isNull(documents.deletedAt)));
    if (docs.length !== newDocumentIds.length) throw new ActionError("One of the uploaded images could not be found.", "NOT_FOUND");
    await tx
      .update(documents)
      .set({ type: "PHOTO", visibility: "PUBLIC" })
      .where(inArray(documents.id, docs.map((d) => d.id)));
    // preserve the upload order
    const order = new Map(newDocumentIds.map((id, i) => [id, i]));
    docs.sort((a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0));
  }

  const drop = existing.filter((i) => !keep.includes(i.id)).map((i) => i.id);
  if (drop.length) await tx.delete(productImages).where(inArray(productImages.id, drop));
  for (const [i, id] of keep.entries()) {
    await tx.update(productImages).set({ sortOrder: i, isPrimary: i === 0, alt: product.title }).where(eq(productImages.id, id));
  }
  if (docs.length) {
    await tx.insert(productImages).values(
      docs.map((doc, i) => ({ productId: product.id, url: doc.url, alt: product.title, sortOrder: keep.length + i, isPrimary: keep.length === 0 && i === 0 })),
    );
  }
}

export async function createProduct(companyId: string, userId: string, d: ProductFormInput) {
  const product = await db.transaction(async (tx) => {
    const slug = await uniqueProductSlug(d.title, tx);
    const [row] = await tx
      .insert(products)
      .values({ companyId, slug, status: "DRAFT", ...columnsFromInput(d) })
      .returning();
    await writeProductDetails(tx, row, d);
    await syncImages(tx, row, companyId, [], d.imageDocumentIds);
    return row;
  });
  await audit({ actorId: userId, action: "product.create", entityType: "product", entityId: product.id, after: { title: d.title, categoryId: d.categoryId } });
  return product;
}

export async function updateProduct(companyId: string, userId: string, productId: string, d: ProductFormInput) {
  const before = await ownedProduct(companyId, productId);
  const product = await db.transaction(async (tx) => {
    const [row] = await tx
      .update(products)
      .set(columnsFromInput(d))
      .where(and(eq(products.id, productId), eq(products.companyId, companyId)))
      .returning();
    await writeProductDetails(tx, row, d);
    await syncImages(tx, row, companyId, d.keepImageIds, d.imageDocumentIds);
    if (before.categoryId !== row.categoryId) {
      await refreshCategoryCount(before.categoryId, tx);
      await refreshCategoryCount(row.categoryId, tx);
    }
    return row;
  });
  await audit({
    actorId: userId,
    action: "product.update",
    entityType: "product",
    entityId: product.id,
    before: { title: before.title, status: before.status },
    after: { title: product.title, status: product.status },
  });
  return product;
}

/** Everything a product needs before it can go live. Returns the list of problems (empty = ready). */
export async function productReadiness(productId: string) {
  const product = await db.query.products.findFirst({
    where: eq(products.id, productId),
    columns: { id: true, categoryId: true, priceType: true, basePrice: true, title: true, description: true },
    with: { images: { columns: { id: true } }, priceTiers: { columns: { id: true } } },
  });
  const problems: Array<"IMAGE" | "CATEGORY" | "PRICE" | "DESCRIPTION"> = [];
  if (!product) return problems;
  if (product.images.length === 0) problems.push("IMAGE");
  if (!product.categoryId) problems.push("CATEGORY");
  if (product.priceType === "FIXED" && product.basePrice === null) problems.push("PRICE");
  if (product.priceType === "TIERED" && product.priceTiers.length === 0 && product.basePrice === null) problems.push("PRICE");
  if (!product.description || product.description.trim().length < 20) problems.push("DESCRIPTION");
  return problems;
}

const READINESS_MESSAGES: Record<string, string> = {
  IMAGE: "Add at least one product image before publishing.",
  CATEGORY: "Choose a category before publishing.",
  PRICE: "Enter a price or at least one price tier before publishing.",
  DESCRIPTION: "Write a product description of at least 20 characters before publishing.",
};

/** Publish: goes live immediately, or into the moderation queue when the platform requires review. */
export async function submitProduct(companyId: string, userId: string, productId: string) {
  const product = await ownedProduct(companyId, productId);
  if (product.status === "ACTIVE") throw new ActionError("This product is already live.", "INVALID_STATE");
  if (product.status === "PENDING_REVIEW") throw new ActionError("This product is already waiting for review.", "INVALID_STATE");
  const problems = await productReadiness(productId);
  if (problems.length) throw new ActionError(READINESS_MESSAGES[problems[0]], "NOT_READY");

  const requireModeration = await getSetting("products.requireModeration");
  const nextStatus = requireModeration ? ("PENDING_REVIEW" as const) : ("ACTIVE" as const);
  await db.transaction(async (tx) => {
    await tx
      .update(products)
      .set({ status: nextStatus, rejectionReason: null, ...(nextStatus === "ACTIVE" ? { publishedAt: product.publishedAt ?? new Date() } : {}) })
      .where(eq(products.id, productId));
    await refreshCategoryCount(product.categoryId, tx);
  });

  if (nextStatus === "PENDING_REVIEW") {
    const staff = await db
      .select({ id: users.id })
      .from(users)
      .where(and(inArray(users.platformRole, ["MODERATOR", "ADMIN", "SUPER_ADMIN"]), eq(users.status, "ACTIVE"), isNull(users.deletedAt)));
    await Promise.all(
      staff.map((s) =>
        notifyUser(s.id, {
          type: "PRODUCT_MODERATION",
          title: `Product submitted for review: ${product.title}`,
          body: "A supplier submitted a product listing that needs moderation.",
          link: "/admin/products",
          data: { productId },
          email: false,
        }),
      ),
    );
  }
  await audit({ actorId: userId, action: nextStatus === "ACTIVE" ? "product.publish" : "product.submit", entityType: "product", entityId: productId, before: { status: product.status }, after: { status: nextStatus } });
  return { status: nextStatus, slug: product.slug };
}

export async function unpublishProduct(companyId: string, userId: string, productId: string) {
  const product = await ownedProduct(companyId, productId);
  if (product.status !== "ACTIVE" && product.status !== "PENDING_REVIEW") throw new ActionError("Only live or pending products can be unpublished.", "INVALID_STATE");
  await db.transaction(async (tx) => {
    await tx.update(products).set({ status: "INACTIVE" }).where(eq(products.id, productId));
    await refreshCategoryCount(product.categoryId, tx);
  });
  await audit({ actorId: userId, action: "product.unpublish", entityType: "product", entityId: productId, before: { status: product.status }, after: { status: "INACTIVE" } });
  return { slug: product.slug };
}

export async function duplicateProduct(companyId: string, userId: string, productId: string) {
  const source = await ownedProduct(companyId, productId);
  const [tiers, variants, specs, certs, images] = await Promise.all([
    db.select().from(productPriceTiers).where(eq(productPriceTiers.productId, productId)),
    db.select().from(productVariants).where(eq(productVariants.productId, productId)).orderBy(asc(productVariants.sortOrder)),
    db.select().from(productSpecifications).where(eq(productSpecifications.productId, productId)).orderBy(asc(productSpecifications.sortOrder)),
    db.select().from(productCertifications).where(eq(productCertifications.productId, productId)),
    db.select().from(productImages).where(eq(productImages.productId, productId)).orderBy(asc(productImages.sortOrder)),
  ]);
  const copy = await db.transaction(async (tx) => {
    const title = `${source.title} (copy)`.slice(0, 200);
    const slug = await uniqueProductSlug(title, tx);
    const { id: _id, createdAt: _c, updatedAt: _u, deletedAt: _d, searchVector: _sv, ...rest } = source;
    void _id;
    void _c;
    void _u;
    void _d;
    void _sv;
    const [row] = await tx
      .insert(products)
      .values({
        ...rest,
        title,
        slug,
        status: "DRAFT",
        rejectionReason: null,
        reviewedById: null,
        publishedAt: null,
        viewCount: 0,
        inquiryCount: 0,
        rfqCount: 0,
        orderCount: 0,
        isFeatured: false,
        featuredUntil: null,
        searchBoost: 0,
      })
      .returning();
    if (tiers.length) await tx.insert(productPriceTiers).values(tiers.map((t) => ({ productId: row.id, minQty: t.minQty, maxQty: t.maxQty, price: t.price, currency: t.currency })));
    if (variants.length) {
      await tx
        .insert(productVariants)
        .values(variants.map((v) => ({ productId: row.id, sku: v.sku, name: v.name, attributes: v.attributes, price: v.price, moq: v.moq, imageUrl: v.imageUrl, isActive: v.isActive, sortOrder: v.sortOrder })));
    }
    if (specs.length) await tx.insert(productSpecifications).values(specs.map((s) => ({ productId: row.id, name: s.name, value: s.value, unit: s.unit, sortOrder: s.sortOrder })));
    if (certs.length) await tx.insert(productCertifications).values(certs.map((c) => ({ productId: row.id, certificationId: c.certificationId })));
    if (images.length) {
      await tx.insert(productImages).values(images.map((i) => ({ productId: row.id, url: i.url, alt: i.alt, sortOrder: i.sortOrder, isPrimary: i.isPrimary, width: i.width, height: i.height })));
    }
    return row;
  });
  await audit({ actorId: userId, action: "product.duplicate", entityType: "product", entityId: copy.id, after: { sourceId: productId } });
  return copy;
}

/** Soft delete: the row keeps its history but disappears from every listing. */
export async function deleteProduct(companyId: string, userId: string, productId: string) {
  const product = await ownedProduct(companyId, productId);
  await db.transaction(async (tx) => {
    await tx.update(products).set({ deletedAt: new Date(), status: "ARCHIVED", isFeatured: false }).where(eq(products.id, productId));
    await refreshCategoryCount(product.categoryId, tx);
  });
  await audit({ actorId: userId, action: "product.delete", entityType: "product", entityId: productId, before: { status: product.status, title: product.title } });
  return { slug: product.slug };
}

export async function setPrimaryImage(companyId: string, userId: string, productId: string, imageId: string) {
  await ownedProduct(companyId, productId);
  const [image] = await db
    .select({ id: productImages.id })
    .from(productImages)
    .where(and(eq(productImages.id, imageId), eq(productImages.productId, productId)))
    .limit(1);
  if (!image) throw new ActionError("Image not found.", "NOT_FOUND");
  await db.transaction(async (tx) => {
    await tx.update(productImages).set({ isPrimary: false }).where(and(eq(productImages.productId, productId), notInArray(productImages.id, [imageId])));
    await tx.update(productImages).set({ isPrimary: true, sortOrder: -1 }).where(eq(productImages.id, imageId));
    // renumber so the primary sits first
    const rows = await tx.select({ id: productImages.id }).from(productImages).where(eq(productImages.productId, productId)).orderBy(asc(productImages.sortOrder));
    for (const [i, r] of rows.entries()) await tx.update(productImages).set({ sortOrder: i }).where(eq(productImages.id, r.id));
  });
  await audit({ actorId: userId, action: "product.image.primary", entityType: "product", entityId: productId, after: { imageId } });
}
