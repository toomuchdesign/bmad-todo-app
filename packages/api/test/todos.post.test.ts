import type { FastifyInstance } from "fastify";
import { MAX_TODO_TEXT_LENGTH, MAX_TODO_TITLE_LENGTH } from "shared";
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
    it("returns 201 with title and text when both provided", async () => {
      // Arrange
      const payload = {
        title: "  buy milk  ",
        text: "  whole milk from the store  ",
      };

      // Act
      const response = await app.inject({
        method: "POST",
        url: "/todos",
        payload,
      });

      // Assert
      expect(response.statusCode).toBe(201);

      const body = response.json<PostTodosRouteResponses[201]>();

      expect(body).toEqual({
        id: expect.any(String),
        title: "buy milk",
        text: "whole milk from the store",
        completed: false,
        createdAt: expect.any(String),
        updatedAt: expect.any(String),
      });
    });

    it("returns 201 with empty text when only title provided", async () => {
      // Arrange
      const payload = { title: "title only" };

      // Act
      const response = await app.inject({
        method: "POST",
        url: "/todos",
        payload,
      });

      // Assert
      expect(response.statusCode).toBe(201);

      const body = response.json<PostTodosRouteResponses[201]>();

      expect(body).toEqual({
        id: expect.any(String),
        title: "title only",
        text: "",
        completed: false,
        createdAt: expect.any(String),
        updatedAt: expect.any(String),
      });
    });
  });

  describe("invalid payload", () => {
    describe("empty or whitespace title", () => {
      it("returns 400 with VALIDATION_ERROR and displayable message", async () => {
        // Arrange
        const payload = {
          title: "   ",
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

    describe("title exceeding MAX_TODO_TITLE_LENGTH", () => {
      it("returns 400 with VALIDATION_ERROR", async () => {
        // Arrange
        const payload = {
          title: "a".repeat(MAX_TODO_TITLE_LENGTH + 1),
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

    describe("text exceeding MAX_TODO_TEXT_LENGTH", () => {
      it("returns 400 with VALIDATION_ERROR", async () => {
        // Arrange
        const payload = {
          title: "valid title",
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
        title: "task",
      },
    },
  });
});
