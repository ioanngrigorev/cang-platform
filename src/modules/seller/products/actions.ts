"use server";

import { revalidatePath } from "next/cache";
import { getLocale } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import { formDataToObject, ok, parseInput, runAction, type ActionResult } from "@/lib/action";
import { requireCompany } from "@/modules/auth/current-user";
import { productFormSchema, productIdSchema, productImageSchema } from "./schemas";
import { createProduct, deleteProduct, duplicateProduct, setPrimaryImage, submitProduct, unpublishProduct, updateProduct } from "./service";

function revalidate(productId?: string, publicSlug?: string | null, companySlug?: string | null) {
  revalidatePath("/[locale]/seller/products", "page");
  revalidatePath("/[locale]/seller", "page");
  if (productId) revalidatePath(`/[locale]/seller/products/${productId}`, "page");
  if (publicSlug) {
    for (const locale of ["en", "vi"]) revalidatePath(`/${locale}/product/${publicSlug}`, "page");
  }
  if (companySlug) {
    for (const locale of ["en", "vi"]) revalidatePath(`/${locale}/supplier/${companySlug}`, "page");
  }
}

type SavedProduct = { id: string; status: string };

/** Create a DRAFT (optionally publishing it straight away when the form asked for it). */
export async function createProductAction(_prev: ActionResult<SavedProduct> | null, formData: FormData): Promise<ActionResult<SavedProduct>> {
  return runAction(async () => {
    const { user, company } = await requireCompany({ permission: "products.write", seller: true });
    const parsed = parseInput(productFormSchema, formDataToObject(formData));
    if (!parsed.success) return parsed.result;
    const product = await createProduct(company.id, user.id, parsed.data);
    let status: string = product.status;
    if (parsed.data.intent === "publish") {
      await requireCompany({ permission: "products.publish", seller: true });
      status = (await submitProduct(company.id, user.id, product.id)).status;
    }
    revalidate(product.id, product.slug, company.slug);
    redirect({ href: `/seller/products/${product.id}?saved=${status === "DRAFT" ? "draft" : status.toLowerCase()}`, locale: await getLocale() });
    return ok({ id: product.id, status });
  });
}

export async function updateProductAction(_prev: ActionResult<SavedProduct> | null, formData: FormData): Promise<ActionResult<SavedProduct>> {
  return runAction(async () => {
    const { user, company } = await requireCompany({ permission: "products.write", seller: true });
    const productId = String(formData.get("productId") ?? "");
    const parsed = parseInput(productFormSchema, formDataToObject(formData));
    if (!parsed.success) return parsed.result;
    const product = await updateProduct(company.id, user.id, productId, parsed.data);
    let status: string = product.status;
    let message = "Product saved.";
    if (parsed.data.intent === "publish" && product.status !== "ACTIVE") {
      await requireCompany({ permission: "products.publish", seller: true });
      status = (await submitProduct(company.id, user.id, product.id)).status;
      message = status === "ACTIVE" ? "Product published — it is live on the marketplace." : "Product submitted for review.";
    }
    revalidate(product.id, product.slug, company.slug);
    return ok({ id: product.id, status }, message);
  });
}

export async function submitProductAction(_prev: ActionResult<SavedProduct> | null, formData: FormData): Promise<ActionResult<SavedProduct>> {
  return runAction(async () => {
    const { user, company } = await requireCompany({ permission: "products.publish", seller: true });
    const parsed = parseInput(productIdSchema, formDataToObject(formData));
    if (!parsed.success) return parsed.result;
    const { status, slug } = await submitProduct(company.id, user.id, parsed.data.productId);
    revalidate(parsed.data.productId, slug, company.slug);
    return ok({ id: parsed.data.productId, status }, status === "ACTIVE" ? "Product published — it is live on the marketplace." : "Product submitted for review.");
  });
}

export async function unpublishProductAction(_prev: ActionResult<SavedProduct> | null, formData: FormData): Promise<ActionResult<SavedProduct>> {
  return runAction(async () => {
    const { user, company } = await requireCompany({ permission: "products.publish", seller: true });
    const parsed = parseInput(productIdSchema, formDataToObject(formData));
    if (!parsed.success) return parsed.result;
    const { slug } = await unpublishProduct(company.id, user.id, parsed.data.productId);
    revalidate(parsed.data.productId, slug, company.slug);
    return ok({ id: parsed.data.productId, status: "INACTIVE" }, "Product unpublished.");
  });
}

export async function duplicateProductAction(_prev: ActionResult<SavedProduct> | null, formData: FormData): Promise<ActionResult<SavedProduct>> {
  return runAction(async () => {
    const { user, company } = await requireCompany({ permission: "products.write", seller: true });
    const parsed = parseInput(productIdSchema, formDataToObject(formData));
    if (!parsed.success) return parsed.result;
    const copy = await duplicateProduct(company.id, user.id, parsed.data.productId);
    revalidate(copy.id);
    return ok({ id: copy.id, status: copy.status }, "Product duplicated as a draft.");
  });
}

export async function deleteProductAction(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  return runAction(async () => {
    const { user, company } = await requireCompany({ permission: "products.write", seller: true });
    const parsed = parseInput(productIdSchema, formDataToObject(formData));
    if (!parsed.success) return parsed.result;
    const { slug } = await deleteProduct(company.id, user.id, parsed.data.productId);
    revalidate(parsed.data.productId, slug, company.slug);
    return ok(undefined, "Product deleted.");
  });
}

export async function setPrimaryImageAction(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  return runAction(async () => {
    const { user, company } = await requireCompany({ permission: "products.write", seller: true });
    const parsed = parseInput(productImageSchema, formDataToObject(formData));
    if (!parsed.success) return parsed.result;
    await setPrimaryImage(company.id, user.id, parsed.data.productId, parsed.data.imageId);
    revalidate(parsed.data.productId);
    return ok(undefined, "Primary image updated.");
  });
}
