import "dotenv/config";
import { Pool } from "pg";

/** Drops and recreates the public schema (development only). */
async function main() {
  if (process.env.NODE_ENV === "production") throw new Error("Refusing to reset a production database");
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  await pool.query("DROP SCHEMA IF EXISTS public CASCADE; CREATE SCHEMA public; DROP SCHEMA IF EXISTS drizzle CASCADE;");
  await pool.query("CREATE EXTENSION IF NOT EXISTS pg_trgm; CREATE EXTENSION IF NOT EXISTS unaccent;");
  console.log("Database reset.");
  await pool.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
