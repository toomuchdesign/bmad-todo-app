import { randomUUID } from "node:crypto";

import type { APIRequestContext } from "@playwright/test";

/**
 * Registers a unique test user via the auth API and returns their userId and JWT token.
 * Used in E2E beforeAll hooks to create isolated user contexts per spec file.
 */
async function registerTestUser({
  request,
}: {
  request: APIRequestContext;
}): Promise<{ userId: string; token: string }> {
  const apiHost = process.env.API_HOST ?? "127.0.0.1";
  const apiPort = process.env.API_PORT ?? "3002";
  const response = await request.post(
    `http://${apiHost}:${apiPort}/auth/register`,
    {
      data: {
        email: `e2e-${randomUUID()}@test.local`,
        name: `e2e-${randomUUID()}`,
        password: randomUUID(),
      },
    },
  );
  if (!response.ok()) {
    const text = await response.text();
    throw new Error(
      `registerTestUser: POST /auth/register failed with status ${response.status()} — ${text}`,
    );
  }
  const body = (await response.json()) as {
    user: { id: string };
    token: string;
  };
  return { userId: body.user.id, token: body.token };
}

type UserCredentials = {
  email: string;
  password: string;
  userId: string;
  token: string;
};

/**
 * Registers a user with known email/password via the auth API.
 * Used by specs that test the login UI — they need credentials to type into the form.
 */
async function registerUserWithCredentials({
  request,
}: {
  request: APIRequestContext;
}): Promise<UserCredentials> {
  const email = `e2e-${randomUUID()}@test.local`;
  const password = randomUUID();
  const apiHost = process.env.API_HOST ?? "127.0.0.1";
  const apiPort = process.env.API_PORT ?? "3002";
  const response = await request.post(
    `http://${apiHost}:${apiPort}/auth/register`,
    {
      data: { email, password, name: `e2e-${randomUUID()}` },
    },
  );
  if (!response.ok()) {
    const text = await response.text();
    throw new Error(
      `registerUserWithCredentials: POST /auth/register failed with status ${response.status()} — ${text}`,
    );
  }
  const body = (await response.json()) as {
    user: { id: string };
    token: string;
  };
  return { email, password, userId: body.user.id, token: body.token };
}

export type { UserCredentials };
export { registerTestUser, registerUserWithCredentials };
