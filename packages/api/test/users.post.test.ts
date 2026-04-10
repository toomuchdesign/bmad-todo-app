import type { FastifyInstance } from "fastify";
import { DEFAULT_USER_ID, MAX_USER_NAME_LENGTH } from "shared";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { buildApp } from "../src/app.js";
import type { PostUsersRouteResponses } from "../src/routes/users/schemas.js";
import {
  ANY_EMAIL,
  ANY_ISO_DATETIME,
  ANY_UUID,
  findUserById,
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
    const user = await findUserById({ id: DEFAULT_USER_ID });

    // Assert
    expect(user).toMatchObject({
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

      const body = response.json();

      const expected: PostUsersRouteResponses[201] = {
        id: ANY_UUID,
        name: "Alice",
        email: ANY_EMAIL,
        createdAt: ANY_ISO_DATETIME,
        updatedAt: ANY_ISO_DATETIME,
      };
      expect(body).toEqual(expected);
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

      const body = response.json();

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

      const body = response.json();

      const expected: PostUsersRouteResponses[400] = {
        code: "VALIDATION_ERROR",
        message: expect.any(String),
      };
      expect(body).toEqual(expected);
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
