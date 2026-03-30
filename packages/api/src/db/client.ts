import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { getConfig } from "../config.js";
import * as schema from "./schema.js";

let pool: Pool | undefined;
let db: NodePgDatabase<typeof schema> | undefined;

export function getDb(): NodePgDatabase<typeof schema> {
  if (db) {
    return db;
  }

  const config = getConfig();

  pool = new Pool({
    connectionString: config.DATABASE_URL,
  });

  db = drizzle(pool, {
    schema,
  });

  return db;
}

export async function closeDb(): Promise<void> {
  if (!pool) {
    return;
  }

  await pool.end();

  pool = undefined;
  db = undefined;
}
