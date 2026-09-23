import "server-only";
import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { apiKeys } from "@/db/schema";

export async function listApiKeys(companyId: string) {
  return db.query.apiKeys.findMany({
    where: eq(apiKeys.companyId, companyId),
    columns: { id: true, name: true, prefix: true, scopes: true, status: true, lastUsedAt: true, expiresAt: true, revokedAt: true, createdAt: true },
    with: { createdBy: { columns: { id: true, name: true } } },
    orderBy: [desc(apiKeys.createdAt)],
  });
}
export type ApiKeyRow = Awaited<ReturnType<typeof listApiKeys>>[number];
