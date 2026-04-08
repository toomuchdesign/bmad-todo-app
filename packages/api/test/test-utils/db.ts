import { randomUUID } from "node:crypto";
import type { FastifyInstance } from "fastify";
import type { QueryResult } from "pg";
import { Client } from "pg";
import { DEFAULT_USER_ID } from "shared";
import { afterAll, beforeAll, beforeEach } from "vitest";
import { buildApp } from "../../src/app.js";

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
 * Creates a unique test user via POST /users and returns its ID and headers.
 * Intended for per-file beforeAll setup to enable parallel test execution.
 */
export async function createTestUser({
  app,
}: {
  app: FastifyInstance;
}): Promise<{
  userId: string;
  headers: Record<string, string>;
}> {
  const response = await app.inject({
    method: "POST",
    url: "/users",
    payload: { name: `test-user-${randomUUID()}` },
  });

  if (response.statusCode !== 201) {
    throw new Error(
      `createTestUser failed: ${response.statusCode} ${response.body}`,
    );
  }

  const body = response.json<{ id: string }>();

  return {
    userId: body.id,
    headers: { "x-user-id": body.id },
  };
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
  await runQuery("DELETE FROM todos WHERE user_id = $1", [userId]);
}

export type TestContext = {
  app: FastifyInstance;
  testUserId: string;
  testHeaders: Record<string, string>;
};

/**
 * Registers beforeAll/afterAll/beforeEach hooks that build the app, create an
 * isolated test user, and clean up that user's todos between tests.
 * Returns a getter for the context (values are available once beforeAll runs).
 */
export function createTestContext(): () => TestContext {
  let app: FastifyInstance;
  let testUserId: string;
  let testHeaders: Record<string, string>;

  beforeAll(async () => {
    app = await buildApp({ logger: false });
    ({ userId: testUserId, headers: testHeaders } = await createTestUser({
      app,
    }));
  });

  afterAll(async () => {
    // Delete todos before the user to satisfy the FK constraint (no CASCADE on the FK).
    if (testUserId) {
      await runQuery("DELETE FROM todos WHERE user_id = $1", [testUserId]);
      await runQuery("DELETE FROM users WHERE id = $1", [testUserId]);
    }
    if (app) {
      await app.close();
    }
  });

  beforeEach(async () => {
    if (!testUserId) {
      throw new Error("testUserId not initialized — beforeAll may have failed");
    }
    await cleanupUserTodos({ userId: testUserId });
  });

  return () => {
    if (!app) {
      throw new Error("getContext() called before beforeAll completed");
    }
    return { app, testUserId, testHeaders };
  };
}

/**
 * Truncates all application tables and re-seeds the default user.
 * Used by the db-reset script — not called from tests (per-user cleanup is preferred).
 */
export async function cleanupTestDatabase(): Promise<void> {
  await runQuery("TRUNCATE TABLE todos, users CASCADE;");
  await runQuery(
    `INSERT INTO users (id, name, created_at, updated_at)
     VALUES ($1, 'Default User', NOW(), NOW())
     ON CONFLICT (id) DO NOTHING;`,
    [DEFAULT_USER_ID],
  );
}
