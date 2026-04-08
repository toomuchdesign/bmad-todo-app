import { randomUUID } from "node:crypto";
import type { FastifyInstance } from "fastify";
import { DEFAULT_USER_ID } from "shared";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { buildApp } from "../src/app.js";
import type { GetTodosRouteResponses } from "../src/routes/todos/schemas.js";
import {
  makeSeedTodo,
  runQuery,
  runRequestIdHeaderTests,
  runUserScopingTests,
  seedTodo,
} from "./test-utils/index.js";

const DEFAULT_HEADERS = { "x-user-id": DEFAULT_USER_ID };

let app: FastifyInstance;

beforeEach(async () => {
  app = await buildApp({ logger: false });
});

afterEach(async () => {
  await app.close();
});

describe("DELETE /todos/:id", () => {
  describe("existing todo", () => {
    it("returns 204 with no body", async () => {
      // Arrange
      const seed = makeSeedTodo();
      await seedTodo(seed);

      // Act
      const response = await app.inject({
        method: "DELETE",
        url: `/todos/${seed.id}`,
        headers: DEFAULT_HEADERS,
      });

      // Assert
      expect(response.statusCode).toBe(204);
      expect(response.body).toBe("");
      expect(response.headers["x-request-id"]).toBeTypeOf("string");
    });
  });

  describe("after deleting a todo", () => {
    it("sets deletedAt in the database", async () => {
      // Arrange
      const seed = makeSeedTodo();
      await seedTodo(seed);

      // Act
      const response = await app.inject({
        method: "DELETE",
        url: `/todos/${seed.id}`,
        headers: DEFAULT_HEADERS,
      });

      // Assert
      expect(response.statusCode).toBe(204);

      const result = await runQuery(
        "SELECT deleted_at FROM todos WHERE id = $1::uuid",
        [seed.id],
      );

      expect(result.rows).toHaveLength(1);
      expect(result.rows[0].deleted_at).not.toBeNull();
    });

    it("excludes the deleted todo from GET /todos", async () => {
      // Arrange
      const seed = makeSeedTodo();
      await seedTodo(seed);

      // Act
      await app.inject({
        method: "DELETE",
        url: `/todos/${seed.id}`,
        headers: DEFAULT_HEADERS,
      });

      const getResponse = await app.inject({
        method: "GET",
        url: "/todos",
        headers: DEFAULT_HEADERS,
      });
      const listed = getResponse.json<GetTodosRouteResponses[200]>();

      // Assert
      const ids = listed.todos.map((t) => t.id);
      expect(ids).not.toContain(seed.id);
    });
  });

  describe("non-existent UUID", () => {
    it("returns 404 with NOT_FOUND", async () => {
      // Arrange
      const fakeId = randomUUID();

      // Act
      const response = await app.inject({
        method: "DELETE",
        url: `/todos/${fakeId}`,
        headers: DEFAULT_HEADERS,
      });

      // Assert
      expect(response.statusCode).toBe(404);

      const body = response.json();

      expect(body).toEqual({
        code: "NOT_FOUND",
        message: "Todo not found",
      });
    });
  });

  describe("already soft-deleted todo", () => {
    it("returns 404 with NOT_FOUND", async () => {
      // Arrange
      const seed = makeSeedTodo({
        deletedAt: "2026-01-02T00:00:00.000Z",
      });
      await seedTodo(seed);

      // Act
      const response = await app.inject({
        method: "DELETE",
        url: `/todos/${seed.id}`,
        headers: DEFAULT_HEADERS,
      });

      // Assert
      expect(response.statusCode).toBe(404);

      const body = response.json();

      expect(body).toEqual({
        code: "NOT_FOUND",
        message: "Todo not found",
      });
    });
  });

  describe("invalid UUID format", () => {
    it("returns 400 with VALIDATION_ERROR", async () => {
      // Act
      const response = await app.inject({
        method: "DELETE",
        url: "/todos/not-a-uuid",
        headers: DEFAULT_HEADERS,
      });

      // Assert
      expect(response.statusCode).toBe(400);

      const body = response.json();

      expect(body).toEqual({
        code: "VALIDATION_ERROR",
        message: expect.any(String),
      });
    });
  });

  runRequestIdHeaderTests({
    app: () => app,
    injectInput: {
      method: "DELETE",
      url: `/todos/${randomUUID()}`,
      headers: DEFAULT_HEADERS,
    },
  });

  runUserScopingTests({
    app: () => app,
    injectInput: {
      method: "DELETE",
      url: `/todos/${randomUUID()}`,
    },
  });
});
