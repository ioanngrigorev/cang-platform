import "server-only";
import { and, count, desc, eq, ilike, isNull, or, type SQL } from "drizzle-orm";
import { db } from "@/db";
import { auditLogs, sessions, users } from "@/db/schema";
import { PAGE_SIZE, pageInfo } from "../shared";

export type UserFilters = { q?: string; role?: string; status?: string; page?: number };

const ROLES = ["USER", "SUPPORT", "MODERATOR", "FINANCE", "COMPLIANCE", "ADMIN", "SUPER_ADMIN"] as const;
const STATUSES = ["PENDING_VERIFICATION", "ACTIVE", "SUSPENDED", "DEACTIVATED"] as const;
export const USER_ROLES = ROLES;
export const USER_STATUSES = STATUSES;

export async function listUsers(f: UserFilters) {
  const page = Math.max(1, f.page ?? 1);
  const conds: SQL[] = [isNull(users.deletedAt)];
  if (f.q) conds.push(or(ilike(users.name, `%${f.q}%`), ilike(users.email, `%${f.q}%`))!);
  if (f.role && (ROLES as readonly string[]).includes(f.role)) conds.push(eq(users.platformRole, f.role as (typeof ROLES)[number]));
  if (f.status && (STATUSES as readonly string[]).includes(f.status)) conds.push(eq(users.status, f.status as (typeof STATUSES)[number]));
  const where = and(...conds);
  const [rows, [{ total }]] = await Promise.all([
    db.query.users.findMany({
      where,
      columns: { id: true, name: true, email: true, platformRole: true, status: true, locale: true, lastLoginAt: true, createdAt: true, emailVerifiedAt: true },
      with: { memberships: { where: (m, { eq: e }) => e(m.status, "ACTIVE"), with: { company: { columns: { id: true, name: true, isSeller: true, isBuyer: true } } } } },
      orderBy: [desc(users.createdAt)],
      limit: PAGE_SIZE,
      offset: (page - 1) * PAGE_SIZE,
    }),
    db.select({ total: count() }).from(users).where(where),
  ]);
  return { rows, ...pageInfo(total, page) };
}

export async function getAdminUser(userId: string) {
  const user = await db.query.users.findFirst({
    where: and(eq(users.id, userId), isNull(users.deletedAt)),
    with: { memberships: { with: { company: { columns: { id: true, name: true, slug: true, isSeller: true, isBuyer: true, status: true, verificationStatus: true } } } } },
  });
  if (!user) return null;
  const [[{ sessionCount }], trail, actions] = await Promise.all([
    db.select({ sessionCount: count() }).from(sessions).where(eq(sessions.userId, userId)),
    db.select().from(auditLogs).where(eq(auditLogs.actorId, userId)).orderBy(desc(auditLogs.createdAt)).limit(25),
    db.select().from(auditLogs).where(and(eq(auditLogs.entityType, "user"), eq(auditLogs.entityId, userId), ilike(auditLogs.action, "admin.%"))).orderBy(desc(auditLogs.createdAt)).limit(25),
  ]);
  const { passwordHash: _ph, twoFactorSecret: _tf, ...safe } = user;
  void _ph;
  void _tf;
  return { ...safe, sessionCount, trail, actions };
}

export type AdminUserRow = Awaited<ReturnType<typeof listUsers>>["rows"][number];
