import "server-only";
import { eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { analyticsEvents, companies, products } from "@/db/schema";

/**
 * Fire-and-forget view tracking for public pages. Never throws: a failed counter must not break a page render.
 * Call inside `after()` from a Server Component so it runs once the response has been sent.
 */
export async function trackProductView(opts: { productId: string; companyId: string; path: string; userId?: string | null; referrer?: string | null }) {
  try {
    await Promise.all([
      db.update(products).set({ viewCount: sql`${products.viewCount} + 1` }).where(eq(products.id, opts.productId)),
      db.insert(analyticsEvents).values({
        type: "PRODUCT_VIEW",
        productId: opts.productId,
        companyId: opts.companyId,
        userId: opts.userId ?? null,
        path: opts.path,
        referrer: opts.referrer ?? null,
      }),
    ]);
  } catch (err) {
    console.error("[catalog] trackProductView failed", err);
  }
}

export async function trackSupplierView(opts: { companyId: string; path: string; userId?: string | null; referrer?: string | null }) {
  try {
    await Promise.all([
      db.update(companies).set({ viewCount: sql`${companies.viewCount} + 1` }).where(eq(companies.id, opts.companyId)),
      db.insert(analyticsEvents).values({
        type: "SUPPLIER_VIEW",
        companyId: opts.companyId,
        userId: opts.userId ?? null,
        path: opts.path,
        referrer: opts.referrer ?? null,
      }),
    ]);
  } catch (err) {
    console.error("[catalog] trackSupplierView failed", err);
  }
}
