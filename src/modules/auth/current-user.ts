import "server-only";
import { and, eq } from "drizzle-orm";
import { cache } from "react";
import { db } from "@/db";
import { companies, companyMembers, users } from "@/db/schema";
import { ForbiddenError, UnauthorizedError } from "@/lib/action";
import { getSessionRecord, setActiveCompany } from "./session";
import { memberCan, platformCan, type CompanyPermission, type PlatformPermission } from "./rbac";

export type CurrentUser = typeof users.$inferSelect;
export type Membership = typeof companyMembers.$inferSelect & { company: typeof companies.$inferSelect };

export type AuthContext = {
  user: CurrentUser;
  sessionId: string;
  memberships: Membership[];
  /** The company the user is currently acting for (null if none yet). */
  activeMembership: Membership | null;
};

/**
 * Resolve the current user + company context once per request (React cache()).
 * Safe to call from layouts, pages and server actions.
 */
export const getAuth = cache(async (): Promise<AuthContext | null> => {
  const session = await getSessionRecord();
  if (!session) return null;
  const [user] = await db.select().from(users).where(eq(users.id, session.userId)).limit(1);
  if (!user || user.deletedAt || user.status === "SUSPENDED" || user.status === "DEACTIVATED") return null;

  const rows = await db
    .select({ member: companyMembers, company: companies })
    .from(companyMembers)
    .innerJoin(companies, eq(companies.id, companyMembers.companyId))
    .where(and(eq(companyMembers.userId, user.id), eq(companyMembers.status, "ACTIVE")));
  const memberships: Membership[] = rows.map((r) => ({ ...r.member, company: r.company }));

  let activeMembership = memberships.find((m) => m.companyId === session.activeCompanyId) ?? null;
  if (!activeMembership && memberships.length > 0) {
    activeMembership = memberships.find((m) => m.isPrimary) ?? memberships[0];
    // Persist the default so subsequent requests are consistent.
    setActiveCompany(session.id, activeMembership.companyId).catch(() => {});
  }
  return { user, sessionId: session.id, memberships, activeMembership };
});

export async function getCurrentUser() {
  return (await getAuth())?.user ?? null;
}

export async function requireAuth(): Promise<AuthContext> {
  const auth = await getAuth();
  if (!auth) throw new UnauthorizedError();
  return auth;
}

/** Require an active company membership (optionally a specific permission and/or seller/buyer capability). */
export async function requireCompany(opts: { permission?: CompanyPermission; seller?: boolean; buyer?: boolean } = {}) {
  const auth = await requireAuth();
  const m = auth.activeMembership;
  if (!m) throw new ForbiddenError("Create or join a company to continue.");
  if (opts.permission && !memberCan(m.role, opts.permission)) throw new ForbiddenError();
  if (opts.seller && !m.company.isSeller) throw new ForbiddenError("This action requires a supplier account.");
  if (opts.buyer && !m.company.isBuyer) throw new ForbiddenError("This action requires a buyer account.");
  return { ...auth, membership: m, company: m.company };
}

export async function requireAdmin(permission: PlatformPermission = "admin.access") {
  const auth = await requireAuth();
  if (!platformCan(auth.user.platformRole, permission)) throw new ForbiddenError();
  return auth;
}

export function canCompany(auth: AuthContext | null, permission: CompanyPermission): boolean {
  return !!auth?.activeMembership && memberCan(auth.activeMembership.role, permission);
}

export function canPlatform(auth: AuthContext | null, permission: PlatformPermission): boolean {
  return !!auth && platformCan(auth.user.platformRole, permission);
}
