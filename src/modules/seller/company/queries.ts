import "server-only";
import { and, asc, desc, eq, isNull } from "drizzle-orm";
import { db } from "@/db";
import { companies, companyCertifications, companyIndustries, companyMedia, industries, manufacturerProfiles, provinces } from "@/db/schema";

/** Company + manufacturer profile + industries, for the seller profile forms. */
export async function getSellerCompanyProfile(companyId: string) {
  const company = await db.query.companies.findFirst({
    where: eq(companies.id, companyId),
    with: {
      manufacturerProfile: true,
      industries: { columns: { industryId: true, isPrimary: true } },
      country: { columns: { code: true, name: true, nameVi: true } },
      province: { columns: { id: true, name: true, nameVi: true } },
    },
  });
  return company ?? null;
}

/** Sellers always have a manufacturer profile row so the forms can upsert without surprises. */
export async function ensureManufacturerProfile(companyId: string) {
  const [existing] = await db.select().from(manufacturerProfiles).where(eq(manufacturerProfiles.companyId, companyId)).limit(1);
  if (existing) return existing;
  const [created] = await db.insert(manufacturerProfiles).values({ companyId }).onConflictDoNothing().returning();
  if (created) return created;
  const [again] = await db.select().from(manufacturerProfiles).where(eq(manufacturerProfiles.companyId, companyId)).limit(1);
  return again;
}

export async function provinceOptions(countryCode = "VN") {
  return db
    .select({ id: provinces.id, name: provinces.name, nameVi: provinces.nameVi, region: provinces.region })
    .from(provinces)
    .where(eq(provinces.countryCode, countryCode))
    .orderBy(asc(provinces.region), asc(provinces.name));
}

export async function industryOptions() {
  return db
    .select({ id: industries.id, slug: industries.slug, name: industries.name, nameVi: industries.nameVi })
    .from(industries)
    .where(eq(industries.isActive, true))
    .orderBy(asc(industries.sortOrder), asc(industries.name));
}

export async function listCompanyIndustries(companyId: string) {
  return db.select().from(companyIndustries).where(eq(companyIndustries.companyId, companyId));
}

/** Factory photos & videos live in company_media (kind PHOTO | VIDEO). */
export async function listFactoryMedia(companyId: string) {
  return db.select().from(companyMedia).where(eq(companyMedia.companyId, companyId)).orderBy(asc(companyMedia.sortOrder), asc(companyMedia.createdAt));
}

export async function listSellerCertifications(companyId: string) {
  return db.query.companyCertifications.findMany({
    where: eq(companyCertifications.companyId, companyId),
    with: {
      certification: { columns: { id: true, code: true, name: true, issuingBody: true, category: true } },
      document: { columns: { id: true, name: true, url: true, deletedAt: true } },
    },
    orderBy: [desc(companyCertifications.status), asc(companyCertifications.createdAt)],
  });
}

export type SellerCertificationRow = Awaited<ReturnType<typeof listSellerCertifications>>[number];

/** Ownership helper used by the actions. */
export async function ownedCompanyCertification(companyId: string, id: string) {
  const [row] = await db
    .select()
    .from(companyCertifications)
    .where(and(eq(companyCertifications.id, id), eq(companyCertifications.companyId, companyId)))
    .limit(1);
  return row ?? null;
}

export async function ownedMedia(companyId: string, id: string) {
  const [row] = await db
    .select()
    .from(companyMedia)
    .where(and(eq(companyMedia.id, id), eq(companyMedia.companyId, companyId)))
    .limit(1);
  return row ?? null;
}

export async function activeCompanyRow(companyId: string) {
  const [row] = await db.select().from(companies).where(and(eq(companies.id, companyId), isNull(companies.deletedAt))).limit(1);
  return row ?? null;
}
