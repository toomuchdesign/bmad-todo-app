import { randomUUID } from "node:crypto";
import type { FastifyInstance } from "fastify";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { buildApp } from "../src/app.js";
import type {
  PostLoginRouteResponses,
  PostRegisterRouteResponses,
} from "../src/routes/auth/schemas.js";
import { ANY_ISO_DATETIME, ANY_UUID, runQuery } from "./test-utils/index.js";

let app: FastifyInstance;

beforeAll(async () => {
  app = await buildApp({ logger: false });
});

afterAll(async () => {
  // Clean up any users created during tests (except the seeded user)
  await runQuery("DELETE FROM users WHERE email LIKE '%@auth-test.local'");
  await app.close();
});

function uniqueEmail(): string {
  return `${randomUUID()}@auth-test.local`;
}

async function registerUser({
  email,
  password = "validpassword",
  name = "Test User",
}: {
  email: string;
  password?: string;
  name?: string;
}) {
  return app.inject({
    method: "POST",
    url: "/auth/register",
    payload: { email, password, name },
  });
}

describe("POST /auth/register", () => {
  describe("valid payload", () => {
    it("returns 201 with { user, token }", async () => {
      // Arrange
      const email = uniqueEmail();

      // Act
      const response = await registerUser({ email, name: "Alice" });

      // Assert
      expect(response.statusCode).toBe(201);

      const body = response.json<PostRegisterRouteResponses[201]>();
      expect(body).toEqual({
        user: {
          id: ANY_UUID,
          name: "Alice",
          email,
          createdAt: ANY_ISO_DATETIME,
          updatedAt: ANY_ISO_DATETIME,
        },
        token: expect.any(String),
      });

      // passwordHash must never appear in the user object
      expect(body.user).not.toHaveProperty("passwordHash");
      expect(body.user).not.toHaveProperty("password_hash");

      // Token is a valid JWT (3 dot-separated segments)
      expect(body.token.split(".")).toHaveLength(3);
    });
  });

  describe("duplicate email", () => {
    it("returns 409 with CONFLICT", async () => {
      // Arrange
      const email = uniqueEmail();
      await registerUser({ email });

      // Act
      const response = await registerUser({ email });

      // Assert
      expect(response.statusCode).toBe(409);
      const body = response.json<PostRegisterRouteResponses[409]>();
      expect(body).toEqual({
        code: "CONFLICT",
        message: expect.any(String),
      });
    });
  });

  describe("invalid payload", () => {
    it.each([
      {
        name: "missing email",
        payload: { password: "validpassword", name: "A" },
      },
      {
        name: "missing password",
        payload: { email: "test@example.com", name: "A" },
      },
      {
        name: "missing name",
        payload: { email: "test@example.com", password: "validpassword" },
      },
      {
        name: "short password (< 8 chars)",
        payload: { email: "test@example.com", password: "short", name: "A" },
      },
    ])("returns 400 with VALIDATION_ERROR for $name", async ({ payload }) => {
      // Act
      const response = await app.inject({
        method: "POST",
        url: "/auth/register",
        payload,
      });

      // Assert
      expect(response.statusCode).toBe(400);
      const body = response.json<PostRegisterRouteResponses[400]>();
      expect(body).toEqual({
        code: "VALIDATION_ERROR",
        message: expect.any(String),
      });
    });
  });
});

describe("POST /auth/login", () => {
  const loginEmail = uniqueEmail();
  const loginPassword = "myloginpassword";

  beforeAll(async () => {
    await registerUser({ email: loginEmail, password: loginPassword });
  });

  describe("valid credentials", () => {
    it("returns 200 with { user, token }", async () => {
      // Act
      const response = await app.inject({
        method: "POST",
        url: "/auth/login",
        payload: { email: loginEmail, password: loginPassword },
      });

      // Assert
      expect(response.statusCode).toBe(200);

      const body = response.json<PostLoginRouteResponses[200]>();
      expect(body).toEqual({
        user: {
          id: ANY_UUID,
          name: "Test User",
          email: loginEmail,
          createdAt: ANY_ISO_DATETIME,
          updatedAt: ANY_ISO_DATETIME,
        },
        token: expect.any(String),
      });

      // passwordHash must never appear in the user object
      expect(body.user).not.toHaveProperty("passwordHash");
      expect(body.user).not.toHaveProperty("password_hash");

      // Token is a valid JWT (3 dot-separated segments)
      expect(body.token.split(".")).toHaveLength(3);
    });
  });

  describe("invalid credentials", () => {
    it("returns 401 with UNAUTHORIZED for wrong password", async () => {
      // Act
      const response = await app.inject({
        method: "POST",
        url: "/auth/login",
        payload: { email: loginEmail, password: "wrongpassword" },
      });

      // Assert
      expect(response.statusCode).toBe(401);
      const body = response.json<PostLoginRouteResponses[401]>();
      expect(body).toEqual({
        code: "UNAUTHORIZED",
        message: expect.any(String),
      });
    });

    it("returns 401 with UNAUTHORIZED for unknown email", async () => {
      // Act
      const response = await app.inject({
        method: "POST",
        url: "/auth/login",
        payload: { email: "nonexistent@example.com", password: "anypassword" },
      });

      // Assert
      expect(response.statusCode).toBe(401);
      const body = response.json<PostLoginRouteResponses[401]>();
      expect(body).toEqual({
        code: "UNAUTHORIZED",
        message: expect.any(String),
      });
    });
  });

  describe("invalid payload", () => {
    it.each([
      { name: "missing email", payload: { password: "validpassword" } },
      { name: "missing password", payload: { email: "test@example.com" } },
    ])("returns 400 with VALIDATION_ERROR for $name", async ({ payload }) => {
      // Act
      const response = await app.inject({
        method: "POST",
        url: "/auth/login",
        payload,
      });

      // Assert
      expect(response.statusCode).toBe(400);
      const body = response.json<PostLoginRouteResponses[400]>();
      expect(body).toEqual({
        code: "VALIDATION_ERROR",
        message: expect.any(String),
      });
    });
  });
});

describe("POST /auth/logout", () => {
  it("returns 204 with no body", async () => {
    // Act
    const response = await app.inject({
      method: "POST",
      url: "/auth/logout",
    });

    // Assert
    expect(response.statusCode).toBe(204);
    expect(response.body).toBe("");
  });
});
