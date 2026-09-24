import { eq } from "drizzle-orm";
import { db, type Tx } from "@/db";
import { buyerProfiles, companies, companyMembers, logisticsProviders, manufacturerProfiles, plans, subscriptions } from "@/db/schema";
import { slugify } from "@/lib/utils";

export type CreateCompanyInput = {
  name: string;
  countryCode: string;
  accountType: "BUYER" | "SELLER" | "LOGISTICS";
  ownerUserId: string;
  provinceId?: string | null;
  city?: string | null;
  businessType?: typeof companies.$inferInsert.businessType;
};

/** Generate a unique slug for a company (name + numeric suffix on collision). */
export async function uniqueCompanySlug(name: string, tx?: Tx): Promise<string> {
  const executor = tx ?? db;
  const base = slugify(name) || "company";
  let slug = base;
  for (let i = 2; i < 50; i++) {
    const [existing] = await executor.select({ id: companies.id }).from(companies).where(eq(companies.slug, slug)).limit(1);
    if (!existing) return slug;
    slug = `${base}-${i}`;
  }
  return `${base}-${Date.now().toString(36)}`;
}

/**
 * Create a company with its owner membership, the matching profile row, and a FREE subscription.
 * Sellers start as PENDING (visible after they publish a profile / are approved per settings); buyers are ACTIVE.
 */
export async function createCompanyForUser(input: CreateCompanyInput, tx?: Tx) {
  const run = async (t: Tx) => {
    const slug = await uniqueCompanySlug(input.name, t);
    const isSeller = input.accountType === "SELLER";
    const isPartner = input.accountType === "LOGISTICS";
    const [company] = await t
      .insert(companies)
      .values({
        slug,
        name: input.name,
        countryCode: input.countryCode,
        provinceId: input.provinceId ?? null,
        city: input.city ?? null,
        businessType: input.businessType ?? (isSeller ? "MANUFACTURER" : isPartner ? "LOGISTICS_PROVIDER" : "IMPORTER"),
        isSeller,
        isBuyer: !isSeller && !isPartner,
        isLogisticsPartner: isPartner,
        status: "ACTIVE",
      })
      .returning();
    await t.insert(companyMembers).values({
      companyId: company.id,
      userId: input.ownerUserId,
      role: "OWNER",
      status: "ACTIVE",
      isPrimary: true,
    });
    if (isPartner) {
      // Pending until CANG approves it (admin → Logistics → Providers).
      let code = slug.toUpperCase().replace(/[^A-Z0-9]+/g, "_").slice(0, 50);
      const [clash] = await t.select({ id: logisticsProviders.id }).from(logisticsProviders).where(eq(logisticsProviders.code, code)).limit(1);
      if (clash) code = `${code.slice(0, 40)}_${Date.now().toString(36).toUpperCase()}`;
      await t.insert(logisticsProviders).values({
        companyId: company.id,
        code,
        name: input.name,
        countries: [input.countryCode],
        adapterCode: "manual",
        isActive: false,
        sortOrder: 100,
      });
    } else if (isSeller) {
      await t.insert(manufacturerProfiles).values({ companyId: company.id });
    } else {
      await t.insert(buyerProfiles).values({ companyId: company.id, destinationCountries: [input.countryCode] });
    }
    const [free] = isPartner ? [] : await t.select().from(plans).where(eq(plans.code, "FREE")).limit(1);
    if (free) {
      const now = new Date();
      await t.insert(subscriptions).values({
        companyId: company.id,
        planId: free.id,
        status: "ACTIVE",
        billingCycle: "monthly",
        currentPeriodStart: now,
        currentPeriodEnd: new Date(now.getTime() + 365 * 24 * 3600 * 1000),
      });
    }
    return company;
  };
  return tx ? run(tx) : db.transaction(run);
}

/** Enable the buyer or seller capability on an existing company (a factory can also buy materials). */
export async function enableCapability(companyId: string, capability: "BUYER" | "SELLER") {
  await db.transaction(async (t) => {
    if (capability === "SELLER") {
      await t.update(companies).set({ isSeller: true }).where(eq(companies.id, companyId));
      await t.insert(manufacturerProfiles).values({ companyId }).onConflictDoNothing();
    } else {
      await t.update(companies).set({ isBuyer: true }).where(eq(companies.id, companyId));
      await t.insert(buyerProfiles).values({ companyId }).onConflictDoNothing();
    }
  });
}
