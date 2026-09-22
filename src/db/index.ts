import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

declare global {
  // eslint-disable-next-line no-var
  var __cangPool: Pool | undefined;
}

function createPool() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is not set");
  }
  return new Pool({ connectionString, max: Number(process.env.DB_POOL_MAX ?? 10) });
}

// Reuse the pool across hot reloads in development.
const pool = globalThis.__cangPool ?? createPool();
if (process.env.NODE_ENV !== "production") {
  globalThis.__cangPool = pool;
}

export const db: NodePgDatabase<typeof schema> = drizzle(pool, { schema, casing: "snake_case" });
export type Db = typeof db;
export type Tx = Parameters<Parameters<Db["transaction"]>[0]>[0];
export { schema, pool };
