import "server-only";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { logisticsProviders } from "@/db/schema";
import { ForbiddenError } from "@/lib/action";
import { requireCompany } from "@/modules/auth/current-user";
import type { CompanyPermission } from "@/modules/auth/rbac";

/**
 * The signed-in user acting for a logistics-partner company with a linked provider row.
 * `requireActive`: the provider must be approved by CANG (pending partners can only see their profile).
 */
export async function requirePartner(opts: { permission?: CompanyPermission; requireActive?: boolean } = {}) {
  const ctx = await requireCompany({ permission: opts.permission });
  if (!ctx.company.isLogisticsPartner) throw new ForbiddenError("This area is for CANG logistics partners.");
  const [provider] = await db.select().from(logisticsProviders).where(eq(logisticsProviders.companyId, ctx.company.id)).limit(1);
  if (!provider) throw new ForbiddenError("Your partner profile is not set up yet — contact CANG support.");
  if (opts.requireActive && !provider.isActive) throw new ForbiddenError("Your partner account is waiting for CANG approval.");
  return { ...ctx, provider };
}

export async function providerForCompany(companyId: string) {
  const [provider] = await db.select().from(logisticsProviders).where(and(eq(logisticsProviders.companyId, companyId))).limit(1);
  return provider ?? null;
}
