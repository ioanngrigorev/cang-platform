import "server-only";
import { and, count, desc, eq, gte, ilike, lte, or, type SQL } from "drizzle-orm";
import { db } from "@/db";
import { auditLogs, users } from "@/db/schema";
import { PAGE_SIZE, pageInfo } from "../shared";

export type AuditFilters = { action?: string; actorType?: string; entityType?: string; entityId?: string; actor?: string; from?: string; to?: string; page?: number };
export const ACTOR_TYPES = ["USER", "ADMIN", "SYSTEM", "API"] as const;

function conds(f: AuditFilters): SQL[] {
  const out: SQL[] = [];
  if (f.action) out.push(ilike(auditLogs.action, `${f.action}%`));
  if (f.actorType && (ACTOR_TYPES as readonly string[]).includes(f.actorType)) out.push(eq(auditLogs.actorType, f.actorType as (typeof ACTOR_TYPES)[number]));
  if (f.entityType) out.push(ilike(auditLogs.entityType, `${f.entityType}%`));
  if (f.entityId) out.push(eq(auditLogs.entityId, f.entityId));
  if (f.actor) out.push(or(ilike(users.name, `%${f.actor}%`), ilike(users.email, `%${f.actor}%`), eq(auditLogs.actorId, f.actor))!);
  if (f.from) {
    const d = new Date(f.from);
    if (!Number.isNaN(d.getTime())) out.push(gte(auditLogs.createdAt, d));
  }
  if (f.to) {
    const d = new Date(f.to);
    if (!Number.isNaN(d.getTime())) out.push(lte(auditLogs.createdAt, new Date(d.getTime() + 86400000 - 1)));
  }
  return out;
}

export async function listAuditLogs(f: AuditFilters) {
  const page = Math.max(1, f.page ?? 1);
  const c = conds(f);
  const where = c.length ? and(...c) : undefined;
  const [rows, [{ total }]] = await Promise.all([
    db
      .select({ log: auditLogs, actor: { id: users.id, name: users.name, email: users.email } })
      .from(auditLogs)
      .leftJoin(users, eq(users.id, auditLogs.actorId))
      .where(where)
      .orderBy(desc(auditLogs.createdAt))
      .limit(PAGE_SIZE)
      .offset((page - 1) * PAGE_SIZE),
    db.select({ total: count() }).from(auditLogs).leftJoin(users, eq(users.id, auditLogs.actorId)).where(where),
  ]);
  return { rows, ...pageInfo(total, page) };
}

/** Streams every matching row (capped) for the CSV export. */
export async function exportAuditLogs(f: AuditFilters, limit = 5000) {
  const c = conds(f);
  return db
    .select({ log: auditLogs, actorName: users.name, actorEmail: users.email })
    .from(auditLogs)
    .leftJoin(users, eq(users.id, auditLogs.actorId))
    .where(c.length ? and(...c) : undefined)
    .orderBy(desc(auditLogs.createdAt))
    .limit(limit);
}

export async function auditActionPrefixes() {
  const rows = await db.select({ action: auditLogs.action }).from(auditLogs).groupBy(auditLogs.action).orderBy(auditLogs.action);
  return Array.from(new Set(rows.map((r) => r.action.split(".")[0])));
}
