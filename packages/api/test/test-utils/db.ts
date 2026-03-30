import type { QueryResult } from "pg";
import { Client } from "pg";

const testTablesToCleanup = ["todos"] as const;

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("Missing DATABASE_URL");
}

/**
 * Creates a new Postgres client connected to the test database URL.
 */
export function createDbClient(): Client {
  return new Client({ connectionString: databaseUrl });
}

/**
 * Executes a SQL query using a short-lived client and returns the result.
 */
export async function runQuery(
  text: string,
  values: unknown[] = [],
): Promise<QueryResult> {
  const client = createDbClient();

  try {
    await client.connect();
    return await client.query(text, values);
  } finally {
    await client.end();
  }
}

/**
 * Ensures required test tables exist before cleanup and test execution.
 */
export async function ensureTestTables(): Promise<void> {
  await runQuery(`
    CREATE TABLE IF NOT EXISTS todos (
      id uuid PRIMARY KEY NOT NULL,
      text text NOT NULL,
      completed boolean DEFAULT false NOT NULL,
      created_at timestamp with time zone NOT NULL,
      updated_at timestamp with time zone NOT NULL,
      deleted_at timestamp with time zone
    );
  `);
}

/**
 * Cleans all configured test tables so each test starts from a known-empty state.
 */
export async function cleanupTestDatabase(): Promise<void> {
  await ensureTestTables();

  const truncateStatement = `TRUNCATE TABLE ${testTablesToCleanup.join(", ")};`;
  await runQuery(truncateStatement);
}
