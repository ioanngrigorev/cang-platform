import "server-only";
import { and, desc, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { plans, subscriptions } from "@/db/schema";

/** The subscription that is currently in force (ACTIVE / PAST_DUE), newest first. */
export async function currentSubscription(companyId: string) {
  const row = await db.query.subscriptions.findFirst({
    where: and(eq(subscriptions.companyId, companyId), inArray(subscriptions.status, ["ACTIVE", "PAST_DUE"])),
    with: { plan: true },
    orderBy: [desc(subscriptions.currentPeriodStart)],
  });
  return row ?? null;
}

/**
 * An upgrade that was requested but not yet confirmed by CANG. There is no PENDING status in the
 * enum, so a request is stored as a TRIALING row for the requested plan.
 */
export async function pendingUpgrade(companyId: string) {
  const row = await db.query.subscriptions.findFirst({
    where: and(eq(subscriptions.companyId, companyId), eq(subscriptions.status, "TRIALING")),
    with: { plan: true },
    orderBy: [desc(subscriptions.createdAt)],
  });
  return row ?? null;
}

export async function subscriptionHistory(companyId: string, limit = 10) {
  return db.query.subscriptions.findMany({
    where: eq(subscriptions.companyId, companyId),
    with: { plan: { columns: { id: true, code: true, name: true, nameVi: true, tier: true } } },
    orderBy: [desc(subscriptions.createdAt)],
    limit,
  });
}

export async function freePlan() {
  const [row] = await db.select().from(plans).where(eq(plans.code, "FREE")).limit(1);
  return row ?? null;
}
