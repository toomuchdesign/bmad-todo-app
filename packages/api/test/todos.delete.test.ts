import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";
import type { GetTodosRouteResponses } from "../src/routes/todos/schemas.js";
import {
  createTestContext,
  makeSeedTodo,
  runQuery,
  runRequestIdHeaderTests,
  runUserScopingTests,
  seedTodo,
} from "./test-utils/index.js";

const getContext = createTestContext();

describe("DELETE /todos/:id", () => {
  describe("existing todo", () => {
    it("returns 204 with no body", async () => {
      // Arrange
      const { app, testUserId, testHeaders } = getContext();
      const seed = makeSeedTodo({ userId: testUserId });
      await seedTodo(seed);

      // Act
      const response = await app.inject({
        method: "DELETE",
        url: `/todos/${seed.id}`,
        headers: testHeaders,
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
      const { app, testUserId, testHeaders } = getContext();
      const seed = makeSeedTodo({ userId: testUserId });
      await seedTodo(seed);

      // Act
      const response = await app.inject({
        method: "DELETE",
        url: `/todos/${seed.id}`,
        headers: testHeaders,
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
      const { app, testUserId, testHeaders } = getContext();
      const seed = makeSeedTodo({ userId: testUserId });
      await seedTodo(seed);

      // Act
      await app.inject({
        method: "DELETE",
        url: `/todos/${seed.id}`,
        headers: testHeaders,
      });

      const getResponse = await app.inject({
        method: "GET",
        url: "/todos",
        headers: testHeaders,
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
      const { app, testHeaders } = getContext();
      const fakeId = randomUUID();

      // Act
      const response = await app.inject({
        method: "DELETE",
        url: `/todos/${fakeId}`,
        headers: testHeaders,
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
      const { app, testUserId, testHeaders } = getContext();
      const seed = makeSeedTodo({
        userId: testUserId,
        deletedAt: "2026-01-02T00:00:00.000Z",
      });
      await seedTodo(seed);

      // Act
      const response = await app.inject({
        method: "DELETE",
        url: `/todos/${seed.id}`,
        headers: testHeaders,
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
      // Arrange
      const { app, testHeaders } = getContext();

      // Act
      const response = await app.inject({
        method: "DELETE",
        url: "/todos/not-a-uuid",
        headers: testHeaders,
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

  runRequestIdHeaderTests(() => {
    const { app, testHeaders } = getContext();
    return {
      app,
      injectInput: {
        method: "DELETE",
        url: `/todos/${randomUUID()}`,
        headers: testHeaders,
      },
    };
  });

  runUserScopingTests(() => {
    const { app, testHeaders } = getContext();
    return {
      app,
      injectInput: {
        method: "DELETE",
        url: `/todos/${randomUUID()}`,
        headers: testHeaders,
      },
    };
  });
});
