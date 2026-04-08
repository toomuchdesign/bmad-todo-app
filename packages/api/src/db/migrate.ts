/**
 * Standalone migration script — used by the Docker entrypoint and local
 * npm scripts (db:migrate:local, db:migrate:test). Reads DATABASE_URL
 * directly from process.env to avoid pulling in getConfig(), which
 * requires all server env vars and a .env file that may not exist in
 * the container.
 */
import { resolve } from "node:path";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { Pool } from "pg";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error("DATABASE_URL is required");
  process.exit(1);
}

const pool = new Pool({ connectionString: databaseUrl });
const db = drizzle(pool);

const migrationsFolder = resolve(import.meta.dirname, "../../drizzle");

try {
  await migrate(db, { migrationsFolder });
} finally {
  await pool.end();
}
console.log("Migrations complete");
