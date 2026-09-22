"use server";

import { and, eq, isNull } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/db";
import { companies, products, savedItems } from "@/db/schema";
import { ActionError, formDataToObject, ok, parseInput, runAction, type ActionResult } from "@/lib/action";
import { requireAuth } from "@/modules/auth/current-user";

const supplierSchema = z.object({
  supplierCompanyId: z.string().min(1),
  note: z
    .string()
    .trim()
    .max(500)
    .optional()
    .transform((v) => (v ? v : null)),
});
const productSchema = z.object({
  productId: z.string().min(1),
  note: z
    .string()
    .trim()
    .max(500)
    .optional()
    .transform((v) => (v ? v : null)),
});

function revalidate() {
  revalidatePath("/[locale]/buyer/saved/suppliers", "page");
  revalidatePath("/[locale]/buyer/saved/products", "page");
  revalidatePath("/[locale]/buyer", "page");
}

/** Save / unsave a supplier for the signed-in user. Returns the new state. */
export async function toggleSavedSupplier(_prev: ActionResult<{ saved: boolean }> | null, formData: FormData): Promise<ActionResult<{ saved: boolean }>> {
  return runAction(async () => {
    const auth = await requireAuth();
    const parsed = parseInput(supplierSchema, formDataToObject(formData));
    if (!parsed.success) return parsed.result;
    const [supplier] = await db
      .select({ id: companies.id, name: companies.name })
      .from(companies)
      .where(and(eq(companies.id, parsed.data.supplierCompanyId), eq(companies.isSeller, true), isNull(companies.deletedAt)))
      .limit(1);
    if (!supplier) throw new ActionError("Supplier not found.", "NOT_FOUND");
    const [existing] = await db
      .select({ id: savedItems.id })
      .from(savedItems)
      .where(and(eq(savedItems.userId, auth.user.id), eq(savedItems.supplierCompanyId, supplier.id)))
      .limit(1);
    if (existing) {
      await db.delete(savedItems).where(eq(savedItems.id, existing.id));
      revalidate();
      return ok<{ saved: boolean }>({ saved: false }, `${supplier.name} removed from your saved suppliers.`);
    }
    await db.insert(savedItems).values({ userId: auth.user.id, type: "SUPPLIER", supplierCompanyId: supplier.id, note: parsed.data.note });
    revalidate();
    return ok<{ saved: boolean }>({ saved: true }, `${supplier.name} saved.`);
  });
}

/** Save / unsave a product for the signed-in user. */
export async function toggleSavedProduct(_prev: ActionResult<{ saved: boolean }> | null, formData: FormData): Promise<ActionResult<{ saved: boolean }>> {
  return runAction(async () => {
    const auth = await requireAuth();
    const parsed = parseInput(productSchema, formDataToObject(formData));
    if (!parsed.success) return parsed.result;
    const [product] = await db
      .select({ id: products.id, title: products.title })
      .from(products)
      .where(and(eq(products.id, parsed.data.productId), isNull(products.deletedAt)))
      .limit(1);
    if (!product) throw new ActionError("Product not found.", "NOT_FOUND");
    const [existing] = await db
      .select({ id: savedItems.id })
      .from(savedItems)
      .where(and(eq(savedItems.userId, auth.user.id), eq(savedItems.productId, product.id)))
      .limit(1);
    if (existing) {
      await db.delete(savedItems).where(eq(savedItems.id, existing.id));
      revalidate();
      return ok<{ saved: boolean }>({ saved: false }, "Removed from your saved products.");
    }
    await db.insert(savedItems).values({ userId: auth.user.id, type: "PRODUCT", productId: product.id, note: parsed.data.note });
    revalidate();
    return ok<{ saved: boolean }>({ saved: true }, "Product saved.");
  });
}

const noteSchema = z.object({ savedItemId: z.string().min(1), note: z.string().trim().max(500) });

export async function updateSavedNote(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  return runAction(async () => {
    const auth = await requireAuth();
    const parsed = parseInput(noteSchema, formDataToObject(formData));
    if (!parsed.success) return parsed.result;
    await db
      .update(savedItems)
      .set({ note: parsed.data.note || null })
      .where(and(eq(savedItems.id, parsed.data.savedItemId), eq(savedItems.userId, auth.user.id)));
    revalidate();
    return ok(undefined, "Note saved.");
  });
}
