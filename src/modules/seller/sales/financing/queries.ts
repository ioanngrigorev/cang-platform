import "server-only";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { financingProviders } from "@/db/schema";

/** Partners a supplier in this country could be routed to (seller-side or side-agnostic products). */
export async function sellerFinancingPartners(countryCode: string) {
  const rows = await db.select().from(financingProviders).where(eq(financingProviders.isActive, true)).orderBy(financingProviders.sortOrder);
  return rows.filter((p) => {
    const rules = (p.routingRules ?? {}) as { side?: string };
    if (rules.side && rules.side !== "SELLER") return false;
    return p.countries.length === 0 || p.countries.includes(countryCode);
  });
}
