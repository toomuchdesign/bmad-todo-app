import { eq } from "drizzle-orm";
import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "../../src/db/schema.js";

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("Missing DATABASE_URL");
}

let testPool: Pool | undefined;
let testDb: NodePgDatabase<typeof schema> | undefined;

/**
 * Returns a Drizzle instance backed by DATABASE_URL for type-safe test
 * setup queries. Bypasses getConfig() so only DATABASE_URL is needed.
 */
export function getTestDb(): NodePgDatabase<typeof schema> {
  if (testDb) {
    return testDb;
  }

  testPool = new Pool({ connectionString: databaseUrl });
  testDb = drizzle(testPool, { schema });
  return testDb;
}

/**
 * Closes the shared test Pool. Call from a global afterAll to avoid
 * connection leaks under parallel CI execution.
 */
export async function closeTestDb(): Promise<void> {
  if (testPool) {
    await testPool.end();
    testPool = undefined;
    testDb = undefined;
  }
}

/**
 * Deletes all todos belonging to a specific user.
 * Used in per-file beforeEach to isolate test data without affecting other files.
 */
export async function cleanupUserTodos({
  userId,
}: {
  userId: string;
}): Promise<void> {
  const db = getTestDb();
  await db.delete(schema.todos).where(eq(schema.todos.userId, userId));
}

/**
 * Deletes a user by ID. Must be called after cleanupUserTodos to satisfy FK constraints.
 */
export async function deleteUser({
  userId,
}: {
  userId: string;
}): Promise<void> {
  const db = getTestDb();
  await db.delete(schema.users).where(eq(schema.users.id, userId));
}

/**
 * Deletes all rows from application tables.
 * Used by the db-reset script — not called from tests (per-user cleanup is preferred).
 */
export async function cleanupTestDatabase(): Promise<void> {
  const db = getTestDb();
  await db.delete(schema.todos);
  await db.delete(schema.users);
}
