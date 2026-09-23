"use server";

import { and, eq, like, ne } from "drizzle-orm";
import { db, type Tx } from "@/db";
import { productCategories } from "@/db/schema";
import { ActionError, formDataToObject, ok, parseInput, runAction, type ActionResult } from "@/lib/action";
import { slugify } from "@/lib/utils";
import { adminActor, revalidateAdmin } from "../context";
import { categoryFormSchema, categoryToggleSchema } from "./schemas";

type Row = typeof productCategories.$inferSelect;

async function uniqueSlug(base: string, excludeId: string | null, tx: Tx) {
  let slug = slugify(base) || "category";
  for (let i = 0; i < 50; i++) {
    const candidate = i === 0 ? slug : `${slug}-${i + 1}`;
    const [hit] = await tx
      .select({ id: productCategories.id })
      .from(productCategories)
      .where(excludeId ? and(eq(productCategories.slug, candidate), ne(productCategories.id, excludeId)) : eq(productCategories.slug, candidate))
      .limit(1);
    if (!hit) return candidate;
  }
  throw new ActionError("Could not derive a unique slug.", "VALIDATION");
}

/** Recompute level/path for every descendant after a parent or slug change (same layout as the seed: ancestor slugs joined by "/"). */
async function relinkDescendants(parent: Row, tx: Tx) {
  const children = await tx.select().from(productCategories).where(eq(productCategories.parentId, parent.id));
  for (const child of children) {
    const path = `${parent.path}${parent.slug}/`;
    const [updated] = await tx.update(productCategories).set({ path, level: parent.level + 1 }).where(eq(productCategories.id, child.id)).returning();
    await relinkDescendants(updated, tx);
  }
}

export async function saveCategoryAction(_prev: ActionResult<{ id: string }> | null, formData: FormData): Promise<ActionResult<{ id: string }>> {
  return runAction(async () => {
    const { log } = await adminActor("admin.categories.write");
    const parsed = parseInput(categoryFormSchema, formDataToObject(formData));
    if (!parsed.success) return parsed.result;
    const d = parsed.data;
    const result = await db.transaction(async (tx) => {
      let before: Row | null = null;
      if (d.categoryId) {
        [before] = await tx.select().from(productCategories).where(eq(productCategories.id, d.categoryId)).limit(1);
        if (!before) throw new ActionError("Category not found.", "NOT_FOUND");
      }
      let parent: Row | null = null;
      if (d.parentId) {
        [parent] = await tx.select().from(productCategories).where(eq(productCategories.id, d.parentId)).limit(1);
        if (!parent) throw new ActionError("Parent category not found.", "NOT_FOUND");
        // A category cannot be nested under itself or one of its own descendants.
        if (before && (parent.id === before.id || `${parent.path}${parent.slug}/`.startsWith(`${before.path}${before.slug}/`))) {
          throw new ActionError("A category cannot be nested under itself.", "VALIDATION");
        }
      }
      const level = parent ? parent.level + 1 : 0;
      const path = parent ? `${parent.path}${parent.slug}/` : "";
      const values = {
        name: d.name,
        nameVi: d.nameVi,
        parentId: parent?.id ?? null,
        industryId: d.industryId ?? parent?.industryId ?? null,
        description: d.description,
        descriptionVi: d.descriptionVi,
        icon: d.icon,
        sortOrder: d.sortOrder,
        isActive: d.isActive,
        isFeatured: d.isFeatured,
        level,
        path,
      };
      if (before) {
        const slug = d.slug && d.slug !== before.slug ? await uniqueSlug(d.slug, before.id, tx) : before.slug;
        const [row] = await tx.update(productCategories).set({ ...values, slug }).where(eq(productCategories.id, before.id)).returning();
        if (slug !== before.slug || path !== before.path || level !== before.level) await relinkDescendants(row, tx);
        return { row, before };
      }
      const slug = await uniqueSlug(d.slug ?? d.name, null, tx);
      const [row] = await tx.insert(productCategories).values({ ...values, slug }).returning();
      return { row, before: null };
    });
    await log({ action: result.before ? "admin.category.update" : "admin.category.create", entityType: "product_category", entityId: result.row.id, before: result.before ? { name: result.before.name, slug: result.before.slug, parentId: result.before.parentId, isActive: result.before.isActive } : null, after: { name: result.row.name, slug: result.row.slug, parentId: result.row.parentId, path: result.row.path, isActive: result.row.isActive } });
    revalidateAdmin("/admin/categories", "/admin/products");
    return ok({ id: result.row.id }, result.before ? "Category updated." : "Category created.");
  });
}

export async function toggleCategoryAction(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  return runAction(async () => {
    const { log } = await adminActor("admin.categories.write");
    const parsed = parseInput(categoryToggleSchema, formDataToObject(formData));
    if (!parsed.success) return parsed.result;
    const active = parsed.data.isActive === "true";
    const [row] = await db.update(productCategories).set({ isActive: active }).where(eq(productCategories.id, parsed.data.categoryId)).returning();
    if (!row) throw new ActionError("Category not found.", "NOT_FOUND");
    if (!active) {
      // Deactivating a branch hides its descendants too (they share the path prefix).
      await db.update(productCategories).set({ isActive: false }).where(like(productCategories.path, `${row.path}${row.slug}/%`));
    }
    await log({ action: active ? "admin.category.activate" : "admin.category.deactivate", entityType: "product_category", entityId: row.id, after: { isActive: active, slug: row.slug } });
    revalidateAdmin("/admin/categories", "/admin/products");
    return ok(undefined, active ? "Category activated." : "Category deactivated.");
  });
}
