import type { QueryResult } from "pg";
import { Client } from "pg";
import { DEFAULT_USER_ID } from "shared";

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
 * Re-seeds the default user so it is always available.
 * Truncates todos first due to FK constraint on user_id → users.id.
 */
export async function cleanupTestDatabase(): Promise<void> {
  await runQuery(`TRUNCATE TABLE todos, users CASCADE;`);
  await runQuery(
    `INSERT INTO users (id, name, created_at, updated_at)
     VALUES ($1, 'Default User', NOW(), NOW())
     ON CONFLICT (id) DO NOTHING;`,
    [DEFAULT_USER_ID],
  );
}
