import type { FastifyInstance } from "fastify";
import { DEFAULT_USER_ID, MAX_USER_NAME_LENGTH } from "shared";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { buildApp } from "../src/app.js";
import type { PostUsersRouteResponses } from "../src/routes/users/schemas.js";
import {
  ANY_EMAIL,
  ANY_ISO_DATETIME,
  ANY_UUID,
  runQuery,
  runRequestIdHeaderTests,
} from "./test-utils/index.js";

// This file tests POST /users itself, so using createTestContext() would create
// a circular dependency: setup would fail if the endpoint under test is broken.
// A lightweight manual setup (app only, no user creation) is used instead.
let app: FastifyInstance;

beforeAll(async () => {
  app = await buildApp({ logger: false });
});

afterAll(async () => {
  await app.close();
});

describe("default user seed", () => {
  it("exists in the database after migration", async () => {
    // Act
    const result = await runQuery("SELECT id, name FROM users WHERE id = $1", [
      DEFAULT_USER_ID,
    ]);

    // Assert
    expect(result.rows).toHaveLength(1);
    expect(result.rows[0]).toEqual({
      id: DEFAULT_USER_ID,
      name: "Default User",
    });
  });
});

describe("POST /users", () => {
  describe("valid payload", () => {
    it("returns 201 with user shape", async () => {
      // Arrange
      const payload = { name: "Alice" };

      // Act
      const response = await app.inject({
        method: "POST",
        url: "/users",
        payload,
      });

      // Assert
      expect(response.statusCode).toBe(201);

      const body = response.json<PostUsersRouteResponses[201]>();

      expect(body).toEqual({
        id: ANY_UUID,
        name: "Alice",
        email: ANY_EMAIL,
        createdAt: ANY_ISO_DATETIME,
        updatedAt: ANY_ISO_DATETIME,
      });
    });

    it("trims whitespace from the name", async () => {
      // Arrange
      const payload = { name: "  Bob  " };

      // Act
      const response = await app.inject({
        method: "POST",
        url: "/users",
        payload,
      });

      // Assert
      expect(response.statusCode).toBe(201);

      const body = response.json<PostUsersRouteResponses[201]>();

      expect(body.name).toBe("Bob");
    });
  });

  describe("invalid payload", () => {
    it.each([
      { name: "empty name", payload: { name: "" } },
      { name: "whitespace-only name", payload: { name: "   " } },
      {
        name: "name exceeding MAX_USER_NAME_LENGTH",
        payload: { name: "a".repeat(MAX_USER_NAME_LENGTH + 1) },
      },
    ])("returns 400 with VALIDATION_ERROR for $name", async ({ payload }) => {
      // Arrange — payload provided by it.each

      // Act
      const response = await app.inject({
        method: "POST",
        url: "/users",
        payload,
      });

      // Assert
      expect(response.statusCode).toBe(400);
      expect(response.headers["x-request-id"]).toBeTypeOf("string");

      const body = response.json<PostUsersRouteResponses[400]>();

      expect(body).toEqual({
        code: "VALIDATION_ERROR",
        message: expect.any(String),
      });
    });
  });

  runRequestIdHeaderTests(() => {
    // app is the module-level instance from beforeAll
    return {
      app,
      injectInput: {
        method: "POST",
        url: "/users",
        payload: { name: "TestUser" },
      },
    };
  });
});
