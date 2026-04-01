import type { QueryResult } from "pg";
import { Client } from "pg";

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
 * Cleans all configured test tables so each test starts from a known-empty state.
 */
export async function cleanupTestDatabase(): Promise<void> {
  const truncateStatement = `TRUNCATE TABLE todos;`;
  await runQuery(truncateStatement);
}
