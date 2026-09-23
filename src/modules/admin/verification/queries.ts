import "server-only";
import { and, count, desc, eq, ilike, inArray, isNull, or, type SQL } from "drizzle-orm";
import { db } from "@/db";
import { beneficialOwners, companies, complianceChecks, documents, verifications } from "@/db/schema";
import { PAGE_SIZE, pageInfo } from "../shared";

export type VerificationTab = "pending" | "in_review" | "verified" | "rejected" | "all";
export const VERIFICATION_TABS: VerificationTab[] = ["pending", "in_review", "verified", "rejected", "all"];
export const VERIFICATION_TYPES = ["KYB", "BUSINESS_LICENSE", "TAX_REGISTRATION", "FACTORY_AUDIT", "EXPORT_LICENSE", "BANK_ACCOUNT", "UBO", "IDENTITY"] as const;

const TAB_STATUS: Record<Exclude<VerificationTab, "all">, Array<typeof verifications.$inferSelect.status>> = {
  pending: ["PENDING"],
  in_review: ["IN_REVIEW"],
  verified: ["VERIFIED"],
  rejected: ["REJECTED", "EXPIRED"],
};

function conds(f: { tab: VerificationTab; type?: string; q?: string }): SQL[] {
  const out: SQL[] = [];
  if (f.tab !== "all") out.push(inArray(verifications.status, TAB_STATUS[f.tab]));
  if (f.type && (VERIFICATION_TYPES as readonly string[]).includes(f.type)) out.push(eq(verifications.type, f.type as (typeof VERIFICATION_TYPES)[number]));
  if (f.q) out.push(or(ilike(companies.name, `%${f.q}%`), ilike(companies.legalName, `%${f.q}%`), ilike(companies.taxId, `%${f.q}%`))!);
  return out;
}

export async function listVerifications(f: { tab: VerificationTab; type?: string; q?: string; page?: number }) {
  const page = Math.max(1, f.page ?? 1);
  const where = and(...conds(f));
  const [rows, [{ total }]] = await Promise.all([
    db
      .select({
        id: verifications.id,
        type: verifications.type,
        status: verifications.status,
        submittedAt: verifications.submittedAt,
        reviewedAt: verifications.reviewedAt,
        company: { id: companies.id, name: companies.name, countryCode: companies.countryCode, isSeller: companies.isSeller, isBuyer: companies.isBuyer, verificationStatus: companies.verificationStatus },
      })
      .from(verifications)
      .innerJoin(companies, eq(companies.id, verifications.companyId))
      .where(where)
      .orderBy(verifications.submittedAt)
      .limit(PAGE_SIZE)
      .offset((page - 1) * PAGE_SIZE),
    db.select({ total: count() }).from(verifications).innerJoin(companies, eq(companies.id, verifications.companyId)).where(where),
  ]);
  return { rows, ...pageInfo(total, page) };
}

export async function verificationTabCounts(type?: string): Promise<Record<VerificationTab, number>> {
  const out = {} as Record<VerificationTab, number>;
  await Promise.all(
    VERIFICATION_TABS.map(async (tab) => {
      const [{ n }] = await db.select({ n: count() }).from(verifications).innerJoin(companies, eq(companies.id, verifications.companyId)).where(and(...conds({ tab, type })));
      out[tab] = n;
    }),
  );
  return out;
}

export async function getAdminVerification(id: string) {
  const v = await db.query.verifications.findFirst({
    where: eq(verifications.id, id),
    with: {
      company: { with: { country: { columns: { code: true, name: true, nameVi: true } } } },
      reviewedBy: { columns: { id: true, name: true } },
    },
  });
  if (!v) return null;
  const [docs, owners, checks, history] = await Promise.all([
    db.select().from(documents).where(and(eq(documents.verificationId, v.id), isNull(documents.deletedAt))).orderBy(documents.createdAt),
    db.query.beneficialOwners.findMany({ where: eq(beneficialOwners.companyId, v.companyId), with: { idDocument: { columns: { id: true, name: true, url: true } } }, orderBy: [desc(beneficialOwners.ownershipPercent)] }),
    db.query.complianceChecks.findMany({ where: eq(complianceChecks.companyId, v.companyId), with: { reviewedBy: { columns: { id: true, name: true } } }, orderBy: [desc(complianceChecks.createdAt)] }),
    db.select({ id: verifications.id, type: verifications.type, status: verifications.status, submittedAt: verifications.submittedAt }).from(verifications).where(eq(verifications.companyId, v.companyId)).orderBy(desc(verifications.submittedAt)),
  ]);
  return { ...v, documents: docs, owners, checks, history };
}

export type AdminVerificationDetail = NonNullable<Awaited<ReturnType<typeof getAdminVerification>>>;
