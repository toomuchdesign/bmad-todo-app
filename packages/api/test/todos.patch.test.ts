import { randomUUID } from "node:crypto";
import type { FastifyInstance } from "fastify";
import { MAX_TODO_TEXT_LENGTH } from "shared";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { buildApp } from "../src/app.js";
import type {
  GetTodosRouteResponses,
  PatchTodosRouteResponses,
} from "../src/routes/schemas.js";
import {
  makeSeedTodo,
  runRequestIdHeaderTests,
  seedTodo,
} from "./test-utils/index.js";

let app: FastifyInstance;

beforeEach(async () => {
  app = await buildApp({ logger: false });
});

afterEach(async () => {
  await app.close();
});

describe("PATCH /todos/:id", () => {
  describe("valid text update", () => {
    it("returns 200 with updated todo and advanced updatedAt", async () => {
      // Arrange
      const seed = makeSeedTodo();
      await seedTodo(seed);

      // Act
      const response = await app.inject({
        method: "PATCH",
        url: `/todos/${seed.id}`,
        payload: { text: "  updated text  " },
      });

      // Assert
      expect(response.statusCode).toBe(200);
      expect(response.headers["x-request-id"]).toBeTypeOf("string");

      const body = response.json<PatchTodosRouteResponses[200]>();

      expect(body).toEqual({
        id: seed.id,
        text: "updated text",
        completed: false,
        createdAt: seed.createdAt,
        updatedAt: expect.any(String),
        deletedAt: null,
      });

      expect(body.updatedAt > "2026-01-01T00:00:00.000Z").toBe(true);

      const getResponse = await app.inject({ method: "GET", url: "/todos" });
      const listed = getResponse.json<GetTodosRouteResponses[200]>();

      expect(listed.todos).toEqual([
        expect.objectContaining({ id: seed.id, text: "updated text" }),
      ]);
    });
  });

  describe("valid completion update", () => {
    it("returns 200 with updated todo", async () => {
      // Arrange
      const seed = makeSeedTodo();
      await seedTodo(seed);

      // Act
      const response = await app.inject({
        method: "PATCH",
        url: `/todos/${seed.id}`,
        payload: { completed: true },
      });

      // Assert
      expect(response.statusCode).toBe(200);

      const body = response.json<PatchTodosRouteResponses[200]>();

      expect(body).toEqual({
        id: seed.id,
        text: seed.text,
        completed: true,
        createdAt: seed.createdAt,
        updatedAt: expect.any(String),
        deletedAt: null,
      });
    });
  });

  describe("valid text and completion update", () => {
    it("returns 200 with both fields updated", async () => {
      // Arrange
      const seed = makeSeedTodo();
      await seedTodo(seed);

      // Act
      const response = await app.inject({
        method: "PATCH",
        url: `/todos/${seed.id}`,
        payload: { text: "new text", completed: true },
      });

      // Assert
      expect(response.statusCode).toBe(200);

      const body = response.json<PatchTodosRouteResponses[200]>();

      expect(body).toEqual({
        id: seed.id,
        text: "new text",
        completed: true,
        createdAt: seed.createdAt,
        updatedAt: expect.any(String),
        deletedAt: null,
      });

      const getResponse = await app.inject({ method: "GET", url: "/todos" });
      const listed = getResponse.json<GetTodosRouteResponses[200]>();

      expect(listed.todos).toEqual([
        expect.objectContaining({
          id: seed.id,
          text: "new text",
          completed: true,
        }),
      ]);
    });
  });

  describe("empty or whitespace text", () => {
    it("returns 400 with VALIDATION_ERROR", async () => {
      // Arrange
      const seed = makeSeedTodo();
      await seedTodo(seed);

      // Act
      const response = await app.inject({
        method: "PATCH",
        url: `/todos/${seed.id}`,
        payload: { text: "   " },
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

  describe("text exceeding MAX_TODO_TEXT_LENGTH", () => {
    it("returns 400 with VALIDATION_ERROR", async () => {
      // Arrange
      const seed = makeSeedTodo();
      await seedTodo(seed);

      // Act
      const response = await app.inject({
        method: "PATCH",
        url: `/todos/${seed.id}`,
        payload: { text: "a".repeat(MAX_TODO_TEXT_LENGTH + 1) },
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
      const fakeId = randomUUID();

      // Act
      const response = await app.inject({
        method: "PATCH",
        url: `/todos/${fakeId}`,
        payload: { text: "whatever" },
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
      const seed = makeSeedTodo({
        deletedAt: "2026-01-02T00:00:00.000Z",
      });
      await seedTodo(seed);

      // Act
      const response = await app.inject({
        method: "PATCH",
        url: `/todos/${seed.id}`,
        payload: { text: "should not work" },
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

  runRequestIdHeaderTests({
    app: () => app,
    injectInput: {
      method: "PATCH",
      url: `/todos/${randomUUID()}`,
      payload: { text: "task" },
    },
  });
});
