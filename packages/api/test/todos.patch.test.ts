import { randomUUID } from "node:crypto";
import { MAX_TODO_TEXT_LENGTH, MAX_TODO_TITLE_LENGTH } from "shared";
import { describe, expect, it } from "vitest";
import type {
  GetTodosRouteResponses,
  PatchTodosRouteResponses,
} from "../src/routes/todos/schemas.js";
import {
  ANY_ISO_DATETIME,
  createTestContext,
  makeSeedTodo,
  runRequestIdHeaderTests,
  runUserScopingTests,
  seedTodo,
} from "./test-utils/index.js";

const getContext = createTestContext();

describe("PATCH /todos/:id", () => {
  describe("valid title and text update", () => {
    it("returns 200 with updated todo and advanced updatedAt", async () => {
      // Arrange
      const { app, testUserId, testHeaders } = getContext();
      const seed = makeSeedTodo({ userId: testUserId });
      await seedTodo(seed);

      // Act
      const response = await app.inject({
        method: "PATCH",
        url: `/todos/${seed.id}`,
        headers: testHeaders,
        payload: {
          title: "  updated title  ",
          text: "  some details  ",
        },
      });

      // Assert
      expect(response.statusCode).toBe(200);
      expect(response.headers["x-request-id"]).toBeTypeOf("string");

      const body = response.json<PatchTodosRouteResponses[200]>();

      expect(body).toEqual({
        id: seed.id,
        title: "updated title",
        text: "some details",
        completed: false,
        userId: testUserId,
        createdAt: seed.createdAt,
        updatedAt: ANY_ISO_DATETIME,
      });

      expect(body.updatedAt > "2026-01-01T00:00:00.000Z").toBe(true);

      const getResponse = await app.inject({
        method: "GET",
        url: "/todos",
        headers: testHeaders,
      });
      const listed = getResponse.json<GetTodosRouteResponses[200]>();

      expect(listed.todos).toEqual([
        expect.objectContaining({ id: seed.id, title: "updated title" }),
      ]);
    });
  });

  describe("valid completion update", () => {
    it("returns 200 with updated todo", async () => {
      // Arrange
      const { app, testUserId, testHeaders } = getContext();
      const seed = makeSeedTodo({ userId: testUserId });
      await seedTodo(seed);

      // Act
      const response = await app.inject({
        method: "PATCH",
        url: `/todos/${seed.id}`,
        headers: testHeaders,
        payload: { completed: true },
      });

      // Assert
      expect(response.statusCode).toBe(200);

      const body = response.json<PatchTodosRouteResponses[200]>();

      expect(body).toEqual({
        id: seed.id,
        title: seed.title,
        text: "",
        completed: true,
        userId: testUserId,
        createdAt: seed.createdAt,
        updatedAt: ANY_ISO_DATETIME,
      });
    });
  });

  describe("valid title and completion update", () => {
    it("returns 200 with both fields updated", async () => {
      // Arrange
      const { app, testUserId, testHeaders } = getContext();
      const seed = makeSeedTodo({ userId: testUserId });
      await seedTodo(seed);

      // Act
      const response = await app.inject({
        method: "PATCH",
        url: `/todos/${seed.id}`,
        headers: testHeaders,
        payload: { title: "new title", completed: true },
      });

      // Assert
      expect(response.statusCode).toBe(200);

      const body = response.json<PatchTodosRouteResponses[200]>();

      expect(body).toEqual({
        id: seed.id,
        title: "new title",
        text: "",
        completed: true,
        userId: testUserId,
        createdAt: seed.createdAt,
        updatedAt: ANY_ISO_DATETIME,
      });

      const getResponse = await app.inject({
        method: "GET",
        url: "/todos",
        headers: testHeaders,
      });
      const listed = getResponse.json<GetTodosRouteResponses[200]>();

      expect(listed.todos).toEqual([
        expect.objectContaining({
          id: seed.id,
          title: "new title",
          completed: true,
        }),
      ]);
    });
  });

  describe("validation errors", () => {
    it.each([
      { name: "empty title", payload: { title: "   " } },
      {
        name: "title exceeding MAX_TODO_TITLE_LENGTH",
        payload: { title: "a".repeat(MAX_TODO_TITLE_LENGTH + 1) },
      },
      {
        name: "text exceeding MAX_TODO_TEXT_LENGTH",
        payload: { text: "a".repeat(MAX_TODO_TEXT_LENGTH + 1) },
      },
    ])("returns 400 with VALIDATION_ERROR for $name", async ({ payload }) => {
      // Arrange
      const { app, testUserId, testHeaders } = getContext();
      const seed = makeSeedTodo({ userId: testUserId });
      await seedTodo(seed);

      // Act
      const response = await app.inject({
        method: "PATCH",
        url: `/todos/${seed.id}`,
        headers: testHeaders,
        payload,
      });

      // Assert
      expect(response.statusCode).toBe(400);

      const body = response.json<PatchTodosRouteResponses[400]>();

      expect(body).toEqual({
        code: "VALIDATION_ERROR",
        message: expect.any(String),
      });
    });
  });

  describe("non-existent ID", () => {
    it("returns 404 with NOT_FOUND", async () => {
      // Arrange
      const { app, testHeaders } = getContext();
      const fakeId = randomUUID();

      // Act
      const response = await app.inject({
        method: "PATCH",
        url: `/todos/${fakeId}`,
        headers: testHeaders,
        payload: { title: "whatever" },
      });

      // Assert
      expect(response.statusCode).toBe(404);

      const body = response.json<PatchTodosRouteResponses[404]>();

      expect(body).toEqual({
        code: "NOT_FOUND",
        message: "Todo not found",
      });
    });
  });

  describe("soft-deleted todo", () => {
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
        method: "PATCH",
        url: `/todos/${seed.id}`,
        headers: testHeaders,
        payload: { title: "should not work" },
      });

      // Assert
      expect(response.statusCode).toBe(404);

      const body = response.json<PatchTodosRouteResponses[404]>();

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
        method: "PATCH",
        url: "/todos/not-a-uuid",
        headers: testHeaders,
        payload: { title: "whatever" },
      });

      // Assert
      expect(response.statusCode).toBe(400);

      const body = response.json<PatchTodosRouteResponses[400]>();

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
        method: "PATCH",
        url: `/todos/${randomUUID()}`,
        headers: testHeaders,
        payload: { title: "task" },
      },
    };
  });

  runUserScopingTests(() => {
    const { app, testHeaders } = getContext();
    return {
      app,
      injectInput: {
        method: "PATCH",
        url: `/todos/${randomUUID()}`,
        headers: testHeaders,
        payload: { title: "task" },
      },
    };
  });
});
