import { count, eq, inArray } from "drizzle-orm";
import type { Db } from "@/db";
import { companies, products, users } from "@/db/schema";
import { hashPassword } from "@/modules/auth/password";
import { seedAnalytics } from "./marketplace/analytics";
import { seedCms } from "./marketplace/cms";
import { seedCompanies } from "./marketplace/companies";
import { World, type SeedContext } from "./marketplace/context";
import { finalizeCounters } from "./marketplace/finalize";
import { seedMessaging } from "./marketplace/messaging";
import { seedNotifications } from "./marketplace/notifications";
import { seedOrders } from "./marketplace/orders";
import { seedProducts } from "./marketplace/products";
import { seedReviews } from "./marketplace/reviews";
import { seedRfqs } from "./marketplace/rfqs";

export type { SeedContext } from "./marketplace/context";

const ANCHOR_SLUG = "saigon-pack-manufacturing";
/** Companies created by the earlier minimal bootstrap; removed (with their users) before the full dataset is seeded. */
const BOOTSTRAP = { slugs: ["saigon-pack-manufacturing", "nordwind-outdoor"], emails: ["sales@saigonpack.vn", "buyer@nordwind-outdoor.de"] };

/**
 * Realistic demo marketplace: 32 Vietnamese suppliers, 6 international buyers, ~175 products, 14 RFQs with
 * quotations, 11 orders across every lifecycle stage (payments, invoices, shipments, inspections, a dispute,
 * logistics and financing), 45 reviews, 8 conversations, notifications, analytics, ads and CMS pages.
 *
 * Idempotent: skipped when the anchor supplier already has products. Deterministic: every random choice goes
 * through the seeded PRNG in `marketplace/rng.ts` (only business numbers and "now"-relative dates vary).
 *
 * Demo logins (password from SEED_DEMO_PASSWORD, default "Password123!") are listed in docs/DEMO-ACCOUNTS.md.
 */
export async function seedMarketplace(db: Db, ctx: SeedContext): Promise<void> {
  const anchor = await db.query.companies.findFirst({ where: eq(companies.slug, ANCHOR_SLUG) });
  if (anchor) {
    const [{ n }] = await db.select({ n: count() }).from(products).where(eq(products.companyId, anchor.id));
    if (n >= 1) {
      console.log("  demo data already present — skipping");
      return;
    }
    // Only the minimal bootstrap exists (anchor without products): replace it with the full dataset.
    console.log("  replacing bootstrap companies with the full demo dataset");
    await db.delete(companies).where(inArray(companies.slug, BOOTSTRAP.slugs));
    await db.delete(users).where(inArray(users.email, BOOTSTRAP.emails));
  }

  const started = Date.now();
  const w = new World(ctx);
  w.passwordHash = await hashPassword(process.env.SEED_DEMO_PASSWORD ?? "Password123!");
  const adminEmail = process.env.SEED_ADMIN_EMAIL ?? "admin@cang.vn";
  const admin = await db.query.users.findFirst({ where: eq(users.email, adminEmail) });
  if (!admin) throw new Error(`seed: admin user ${adminEmail} must exist before the marketplace seed runs`);
  w.adminUserId = admin.id;

  await seedCompanies(db, w);
  await seedProducts(db, w);
  await seedRfqs(db, w);
  await seedOrders(db, w);
  await seedReviews(db, w);
  await seedMessaging(db, w);
  await seedNotifications(db, w);
  await seedAnalytics(db, w);
  await seedCms(db, w);
  await finalizeCounters(db, w);
  console.log(`  marketplace demo data seeded in ${((Date.now() - started) / 1000).toFixed(1)}s`);
}
