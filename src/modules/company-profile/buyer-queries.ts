import "server-only";
import { and, desc, eq, inArray, isNull } from "drizzle-orm";
import { db } from "@/db";
import { beneficialOwners, buyerProfiles, companies, countries, documents, productCategories, verifications } from "@/db/schema";

export async function getBuyerCompanyProfile(companyId: string) {
  const company = await db.query.companies.findFirst({
    where: eq(companies.id, companyId),
    with: { buyerProfile: true, country: true, province: true },
  });
  return company ?? null;
}

export async function ensureBuyerProfile(companyId: string) {
  const [existing] = await db.select().from(buyerProfiles).where(eq(buyerProfiles.companyId, companyId)).limit(1);
  if (existing) return existing;
  const [created] = await db.insert(buyerProfiles).values({ companyId }).onConflictDoNothing().returning();
  if (created) return created;
  const [again] = await db.select().from(buyerProfiles).where(eq(buyerProfiles.companyId, companyId)).limit(1);
  return again;
}

export async function getKybState(companyId: string) {
  const [company] = await db
    .select({
      id: companies.id,
      kybStatus: companies.kybStatus,
      verificationStatus: companies.verificationStatus,
      legalName: companies.legalName,
      registrationNumber: companies.registrationNumber,
      taxId: companies.taxId,
      address: companies.address,
      countryCode: companies.countryCode,
    })
    .from(companies)
    .where(eq(companies.id, companyId))
    .limit(1);
  const submissions = await db
    .select()
    .from(verifications)
    .where(and(eq(verifications.companyId, companyId), eq(verifications.type, "KYB")))
    .orderBy(desc(verifications.submittedAt));
  const owners = await db.select().from(beneficialOwners).where(eq(beneficialOwners.companyId, companyId)).orderBy(desc(beneficialOwners.ownershipPercent));
  const verificationIds = submissions.map((s) => s.id);
  const docs = verificationIds.length
    ? await db
        .select()
        .from(documents)
        .where(and(inArray(documents.verificationId, verificationIds), isNull(documents.deletedAt)))
    : [];
  return { company, submissions, owners, documents: docs };
}

/** All documents owned by the company (Documents page). */
export async function listCompanyDocuments(companyId: string, opts: { type?: string } = {}) {
  return db.query.documents.findMany({
    where: and(
      eq(documents.ownerCompanyId, companyId),
      isNull(documents.deletedAt),
      opts.type ? eq(documents.type, opts.type as typeof documents.$inferSelect.type) : undefined,
    ),
    with: {
      order: { columns: { id: true, orderNumber: true } },
      rfq: { columns: { id: true, rfqNumber: true, title: true } },
      uploadedBy: { columns: { id: true, name: true } },
    },
    orderBy: [desc(documents.createdAt)],
    limit: 200,
  });
}

/** Documents shared with the buyer by counterparties on its own orders. */
export async function listCounterpartyDocuments(companyId: string, orderIds: string[]) {
  if (!orderIds.length) return [];
  return db.query.documents.findMany({
    where: and(inArray(documents.orderId, orderIds), isNull(documents.deletedAt), inArray(documents.visibility, ["COUNTERPARTY", "PUBLIC"])),
    with: { order: { columns: { id: true, orderNumber: true } }, ownerCompany: { columns: { id: true, name: true, slug: true } } },
    orderBy: [desc(documents.createdAt)],
    limit: 200,
  });
}

export async function countryOptionsAll() {
  return db.select({ code: countries.code, name: countries.name, nameVi: countries.nameVi }).from(countries).where(eq(countries.isEnabled, true)).orderBy(countries.sortOrder, countries.name);
}

/** Top-level categories used for the "sourcing categories" picker (the tree is rooted at level 0). */
export async function topCategories() {
  return db
    .select({ id: productCategories.id, slug: productCategories.slug, name: productCategories.name, nameVi: productCategories.nameVi })
    .from(productCategories)
    .where(and(eq(productCategories.isActive, true), eq(productCategories.level, 0)))
    .orderBy(productCategories.sortOrder, productCategories.name);
}
