import { randomUUID } from "node:crypto";
import type { FastifyInstance } from "fastify";

/**
 * Creates a unique test user via POST /auth/register and returns its ID and
 * Bearer auth headers. Intended for per-file beforeAll setup to enable
 * parallel test execution.
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
    url: "/auth/register",
    payload: {
      email: `test-${randomUUID()}@test.local`,
      password: randomUUID(),
      name: `test-user-${randomUUID()}`,
    },
  });

  if (response.statusCode !== 201) {
    throw new Error(
      `createTestUser failed: ${response.statusCode} ${response.body}`,
    );
  }

  const body = response.json<{ user: { id: string }; token: string }>();

  return {
    userId: body.user.id,
    headers: { authorization: `Bearer ${body.token}` },
  };
}
