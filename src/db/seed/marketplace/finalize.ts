/**
 * Step 10 — denormalised counters that depend on everything else: supplier transaction counters,
 * product order counts and category product counts.
 */
import { sql } from "drizzle-orm";
import type { Db } from "@/db";
import { companies, productCategories, products } from "@/db/schema";
import { eq } from "drizzle-orm";
import { REVIEWS } from "../data/reviews";
import type { World } from "./context";
import { round2 } from "./rng";

export async function finalizeCounters(db: Db, w: World): Promise<void> {
  const { rng } = w;
  // transaction counters: platform orders (not cancelled) + historical deals evidenced by non-order reviews
  const perSupplier = new Map<string, { count: number; volume: number }>();
  for (const o of w.orders.values()) {
    if (o.status === "CANCELLED") continue;
    const st = perSupplier.get(o.supplierSlug) ?? { count: 0, volume: 0 };
    st.count += 1;
    st.volume += o.total;
    perSupplier.set(o.supplierSlug, st);
  }
  for (const r of REVIEWS) {
    if (r.order) continue;
    const st = perSupplier.get(r.target) ?? { count: 0, volume: 0 };
    const supplier = w.supplier(r.target);
    st.count += 1;
    st.volume += supplier.seed.factory.minOrderUsd * rng.float(2.5, 9);
    perSupplier.set(r.target, st);
  }
  for (const [slug, st] of perSupplier) {
    await db.update(companies).set({ transactionCount: st.count, transactionVolumeUsd: round2(st.volume) }).where(eq(companies.id, w.supplier(slug).id));
  }

  // product order counts from seeded orders
  await db.execute(sql`
    UPDATE products p SET order_count = p.order_count + sub.n
    FROM (SELECT oi.product_id, COUNT(*)::int AS n FROM order_items oi JOIN orders o ON o.id = oi.order_id WHERE oi.product_id IS NOT NULL AND o.status_code <> 'CANCELLED' GROUP BY oi.product_id) sub
    WHERE p.id = sub.product_id
  `);

  // category product counts (leaf + parent)
  await db.execute(sql`
    UPDATE ${productCategories} c SET product_count = COALESCE(sub.n, 0)
    FROM (
      SELECT cat.id, COUNT(p.id)::int AS n
      FROM ${productCategories} cat
      LEFT JOIN ${productCategories} child ON child.parent_id = cat.id
      LEFT JOIN ${products} p ON p.status = 'ACTIVE' AND p.deleted_at IS NULL AND (p.category_id = cat.id OR p.category_id = child.id)
      GROUP BY cat.id
    ) sub
    WHERE c.id = sub.id
  `);
  console.log(`  counters updated for ${perSupplier.size} suppliers`);
}
