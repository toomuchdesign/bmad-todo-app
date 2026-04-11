import type { FastifyInstance } from "fastify";
import { afterAll, beforeAll, beforeEach } from "vitest";
import { buildApp } from "../../src/app.js";
import { createTestUser } from "./auth.js";
import { cleanupUserTodos, deleteUser } from "./db.js";

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
