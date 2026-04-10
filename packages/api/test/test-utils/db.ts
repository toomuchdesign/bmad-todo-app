import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import type { FastifyInstance } from "fastify";
import { Pool } from "pg";
import { DEFAULT_USER_ID } from "shared";
import { afterAll, beforeAll, beforeEach } from "vitest";
import { buildApp } from "../../src/app.js";
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
      await cleanupUserTodos({ userId: testUserId });
      await deleteUser({ userId: testUserId });
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
 * Deletes all rows from application tables and re-seeds the default user.
 * Used by the db-reset script — not called from tests (per-user cleanup is preferred).
 */
export async function cleanupTestDatabase(): Promise<void> {
  const db = getTestDb();
  await db.delete(schema.todos);
  await db.delete(schema.users);
  const now = new Date();
  await db
    .insert(schema.users)
    .values({
      id: DEFAULT_USER_ID,
      name: "Default User",
      email: "seed@example.com",
      passwordHash: "no-auth",
      createdAt: now,
      updatedAt: now,
    })
    .onConflictDoNothing();
}
