import "server-only";
import { and, desc, eq, isNull } from "drizzle-orm";
import { db } from "@/db";
import { savedItems } from "@/db/schema";

export async function listSavedSuppliers(userId: string) {
  const rows = await db.query.savedItems.findMany({
    where: and(eq(savedItems.userId, userId), eq(savedItems.type, "SUPPLIER")),
    with: {
      supplier: {
        columns: { id: true, name: true, slug: true, logoUrl: true, city: true, countryCode: true, verificationStatus: true, ratingAvg: true, ratingCount: true, tagline: true, businessType: true, deletedAt: true },
        with: { badges: { with: { badge: { columns: { code: true, name: true, nameVi: true } } } } },
      },
    },
    orderBy: [desc(savedItems.createdAt)],
  });
  return rows.filter((r) => r.supplier && !r.supplier.deletedAt);
}

export async function listSavedProducts(userId: string) {
  const rows = await db.query.savedItems.findMany({
    where: and(eq(savedItems.userId, userId), eq(savedItems.type, "PRODUCT")),
    with: {
      product: {
        columns: { id: true, slug: true, title: true, titleVi: true, basePrice: true, currency: true, moq: true, unit: true, status: true, deletedAt: true },
        with: {
          company: { columns: { id: true, name: true, slug: true, verificationStatus: true } },
          images: { orderBy: (t, { asc }) => [asc(t.sortOrder)], limit: 1 },
        },
      },
    },
    orderBy: [desc(savedItems.createdAt)],
  });
  return rows.filter((r) => r.product && !r.product.deletedAt);
}

export async function savedCounts(userId: string) {
  const rows = await db.select({ type: savedItems.type, id: savedItems.id }).from(savedItems).where(eq(savedItems.userId, userId));
  return {
    suppliers: rows.filter((r) => r.type === "SUPPLIER").length,
    products: rows.filter((r) => r.type === "PRODUCT").length,
  };
}

export async function savedProductIds(userId: string) {
  const rows = await db
    .select({ id: savedItems.productId })
    .from(savedItems)
    .where(and(eq(savedItems.userId, userId), eq(savedItems.type, "PRODUCT"), isNull(savedItems.rfqId)));
  return rows.map((r) => r.id).filter((x): x is string => !!x);
}
