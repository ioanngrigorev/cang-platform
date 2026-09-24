import "dotenv/config";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "@/db/schema";
import type { Db } from "@/db";
import { hashPassword } from "@/modules/auth/password";
import { seedLogisticsPartners } from "./logistics-partners";
import { seedMarketplace } from "./marketplace";
import { seedPlatform } from "./platform";
import { seedReference } from "./reference";

/**
 * Idempotent seed: reference data + platform config are upserted; demo marketplace data is created
 * only when no demo companies exist yet (see marketplace.ts).
 *
 * PRODUCTION: set SEED_DEMO_DATA=false (and a strong SEED_ADMIN_PASSWORD) so only reference data,
 * platform configuration and the admin account are created — no demo companies, products or orders.
 *
 * Demo accounts (password from SEED_DEMO_PASSWORD / SEED_ADMIN_PASSWORD, default "Password123!" / "Admin123!"):
 *   admin@cang.vn                 — SUPER_ADMIN
 *   buyer@nordwind-outdoor.de     — German buyer (Nordwind Outdoor GmbH)
 *   sales@saigonpack.vn           — Vietnamese manufacturer (Saigon Pack Manufacturing)
 *   ops@saigonfreight.vn          — logistics partner dispatcher (Saigon Freight Solutions), driver@saigonfreight.vn — driver
 */
async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const db: Db = drizzle(pool, { schema, casing: "snake_case" });
  const started = Date.now();
  console.log("→ reference data");
  const ref = await seedReference(db);
  console.log("→ platform configuration");
  const platform = await seedPlatform(db);
  console.log("→ admin user");
  const adminEmail = process.env.SEED_ADMIN_EMAIL ?? "admin@cang.vn";
  const adminPassword = process.env.SEED_ADMIN_PASSWORD ?? "Admin123!";
  const existingAdmin = await db.query.users.findFirst({ where: eq(schema.users.email, adminEmail) });
  if (!existingAdmin) {
    await db.insert(schema.users).values({
      email: adminEmail,
      name: "CANG Admin",
      passwordHash: await hashPassword(adminPassword),
      platformRole: "SUPER_ADMIN",
      status: "ACTIVE",
      emailVerifiedAt: new Date(),
    });
  }
  const seedDemo = (process.env.SEED_DEMO_DATA ?? "true").toLowerCase() !== "false";
  if (seedDemo) {
    console.log("→ marketplace demo data");
    await seedMarketplace(db, { ...ref, ...platform });
    console.log("→ logistics partner demo");
    await seedLogisticsPartners(db);
  } else {
    console.log("→ marketplace demo data skipped (SEED_DEMO_DATA=false)");
  }
  console.log(`✓ seed complete in ${((Date.now() - started) / 1000).toFixed(1)}s`);
  await pool.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
