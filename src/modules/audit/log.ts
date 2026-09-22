import { db, type Tx } from "@/db";
import { auditLogs } from "@/db/schema";

export type AuditActorType = "USER" | "ADMIN" | "SYSTEM" | "API";

export type AuditInput = {
  actorId?: string | null;
  actorType?: AuditActorType;
  action: string; // dotted, e.g. "product.publish", "admin.company.verify"
  entityType: string;
  entityId?: string | null;
  before?: Record<string, unknown> | null;
  after?: Record<string, unknown> | null;
  ipAddress?: string | null;
  userAgent?: string | null;
};

/** Append an immutable audit record. Never throws (audit must not break business flows). */
export async function audit(input: AuditInput, tx?: Tx): Promise<void> {
  try {
    const executor = tx ?? db;
    await executor.insert(auditLogs).values({
      actorId: input.actorId ?? null,
      actorType: input.actorType ?? (input.actorId ? "USER" : "SYSTEM"),
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId ?? null,
      before: input.before ?? null,
      after: input.after ?? null,
      ipAddress: input.ipAddress ?? null,
      userAgent: input.userAgent ?? null,
    });
  } catch (err) {
    console.error("[audit] failed to write audit log", err);
  }
}
