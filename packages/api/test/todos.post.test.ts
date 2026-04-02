import type { FastifyInstance } from "fastify";
import { MAX_TODO_TEXT_LENGTH } from "shared";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { buildApp } from "../src/app.js";
import type { PostTodosRouteResponses } from "../src/routes/schemas.js";
import { runRequestIdHeaderTests } from "./test-utils/index.js";

let app: FastifyInstance;

beforeEach(async () => {
  app = await buildApp({ logger: false });
});

afterEach(async () => {
  await app.close();
});

describe("POST /todos", () => {
  describe("valid payload", () => {
    it("returns 201 with the created todo and server-assigned timestamps", async () => {
      // Arrange
      const payload = {
        text: "  buy milk  ",
      };

      // Act
      const response = await app.inject({
        method: "POST",
        url: "/todos",
        payload,
      });

      // Assert
      expect(response.statusCode).toBe(201);
      expect(response.headers["content-type"]).toContain("application/json");
      expect(response.headers["x-request-id"]).toBeTypeOf("string");

      const body = response.json<PostTodosRouteResponses[201]>();

      expect(body).toEqual({
        id: expect.any(String),
        text: "buy milk",
        completed: false,
        createdAt: expect.any(String),
        updatedAt: expect.any(String),
        deletedAt: null,
      });
    });
  });

  describe("invalid payload", () => {
    describe("empty or whitespace text", () => {
      it("returns 400 with VALIDATION_ERROR and displayable message", async () => {
        // Arrange
        const payload = {
          text: "   ",
        };

        // Act
        const response = await app.inject({
          method: "POST",
          url: "/todos",
          payload,
        });

        // Assert
        expect(response.statusCode).toBe(400);
        expect(response.headers["x-request-id"]).toBeTypeOf("string");

        const body = response.json<PostTodosRouteResponses[400]>();

        expect(body).toEqual({
          code: "VALIDATION_ERROR",
          message: expect.any(String),
        });
      });
    });

    describe("text exceeding MAX_TODO_TEXT_LENGTH", () => {
      it("returns 400 with max detail for text", async () => {
        // Arrange
        const payload = {
          text: "a".repeat(MAX_TODO_TEXT_LENGTH + 1),
        };

        // Act
        const response = await app.inject({
          method: "POST",
          url: "/todos",
          payload,
        });

        // Assert
        expect(response.statusCode).toBe(400);

        const body = response.json<PostTodosRouteResponses[400]>();

        expect(body).toEqual({
          code: "VALIDATION_ERROR",
          message: expect.any(String),
        });
      });
    });
  });

  runRequestIdHeaderTests({
    app: () => app,
    injectInput: {
      method: "POST",
      url: "/todos",
      payload: {
        text: "task",
      },
    },
  });
});
