import "server-only";
import { and, count, desc, eq, inArray, type SQL } from "drizzle-orm";
import { db } from "@/db";
import { companies, complianceChecks, riskFlags, users } from "@/db/schema";
import { PAGE_SIZE, pageInfo } from "../shared";

export const RISK_SEVERITIES = ["LOW", "MEDIUM", "HIGH", "CRITICAL"] as const;
export const RISK_STATUSES = ["OPEN", "INVESTIGATING", "RESOLVED", "DISMISSED"] as const;

export async function listRiskFlags(f: { status?: string; severity?: string; page?: number; open?: boolean }) {
  const page = Math.max(1, f.page ?? 1);
  const conds: SQL[] = [];
  if (f.status && (RISK_STATUSES as readonly string[]).includes(f.status)) conds.push(eq(riskFlags.status, f.status as (typeof RISK_STATUSES)[number]));
  else if (f.open) conds.push(inArray(riskFlags.status, ["OPEN", "INVESTIGATING"]));
  if (f.severity && (RISK_SEVERITIES as readonly string[]).includes(f.severity)) conds.push(eq(riskFlags.severity, f.severity as (typeof RISK_SEVERITIES)[number]));
  const where = conds.length ? and(...conds) : undefined;
  const [rows, [{ total }]] = await Promise.all([
    db
      .select({ flag: riskFlags, company: { id: companies.id, name: companies.name }, resolvedBy: { id: users.id, name: users.name } })
      .from(riskFlags)
      .leftJoin(companies, eq(companies.id, riskFlags.companyId))
      .leftJoin(users, eq(users.id, riskFlags.resolvedById))
      .where(where)
      .orderBy(desc(riskFlags.createdAt))
      .limit(PAGE_SIZE)
      .offset((page - 1) * PAGE_SIZE),
    db.select({ total: count() }).from(riskFlags).where(where),
  ]);
  return { rows, ...pageInfo(total, page) };
}

export async function riskFlagCounts() {
  const rows = await db.select({ status: riskFlags.status, n: count() }).from(riskFlags).groupBy(riskFlags.status);
  const out: Record<string, number> = { OPEN: 0, INVESTIGATING: 0, RESOLVED: 0, DISMISSED: 0 };
  for (const r of rows) out[r.status] = r.n;
  return out;
}

/** Sanctions / PEP hits and other non-clear compliance checks, newest first. */
export async function flaggedComplianceChecks(limit = 25) {
  return db
    .select({ check: complianceChecks, company: { id: companies.id, name: companies.name, sanctionsStatus: companies.sanctionsStatus } })
    .from(complianceChecks)
    .leftJoin(companies, eq(companies.id, complianceChecks.companyId))
    .where(inArray(complianceChecks.status, ["FLAGGED", "MANUAL_REVIEW", "REJECTED", "PENDING"]))
    .orderBy(desc(complianceChecks.createdAt))
    .limit(limit);
}

export async function sanctionedCompanies(limit = 25) {
  return db
    .select({ id: companies.id, name: companies.name, sanctionsStatus: companies.sanctionsStatus, status: companies.status, countryCode: companies.countryCode })
    .from(companies)
    .where(inArray(companies.sanctionsStatus, ["POTENTIAL_MATCH", "MATCH"]))
    .orderBy(companies.name)
    .limit(limit);
}
