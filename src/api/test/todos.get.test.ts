import type { ApiErrorResponse, Todo } from "@bmad-todo/shared";
import type { FastifyInstance } from "fastify";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { buildApp } from "../src/app.js";
import { dropTodosTable, seedTodo } from "./test-utils/index.js";

let app: FastifyInstance;

beforeEach(async () => {
  app = await buildApp({ logger: false });
});

afterEach(async () => {
  await app.close();
});

describe("GET /todos", () => {
  it("returns 200 with active todos ordered newest-first and includes x-request-id", async () => {
    // Arrange
    await seedTodo({
      id: "11111111-1111-1111-1111-111111111111",
      text: "older active",
      completed: false,
      createdAt: "2026-03-01T10:00:00.000Z",
      updatedAt: "2026-03-01T10:00:00.000Z",
      deletedAt: null,
    });
    await seedTodo({
      id: "22222222-2222-2222-2222-222222222222",
      text: "deleted should be excluded",
      completed: false,
      createdAt: "2026-03-02T10:00:00.000Z",
      updatedAt: "2026-03-02T10:00:00.000Z",
      deletedAt: "2026-03-03T10:00:00.000Z",
    });
    await seedTodo({
      id: "33333333-3333-3333-3333-333333333333",
      text: "newer active",
      completed: true,
      createdAt: "2026-03-04T10:00:00.000Z",
      updatedAt: "2026-03-04T10:00:00.000Z",
      deletedAt: null,
    });

    // Act
    const response = await app.inject({
      method: "GET",
      url: "/todos",
    });

    // Assert
    expect(response.statusCode).toBe(200);
    expect(response.headers["content-type"]).toContain("application/json");
    expect(response.headers["x-request-id"]).toBeTypeOf("string");

    const body = response.json<{ todos: Todo[] }>();

    expect(body).toEqual({
      todos: [
        {
          id: "33333333-3333-3333-3333-333333333333",
          text: "newer active",
          completed: true,
          createdAt: "2026-03-04T10:00:00.000Z",
          updatedAt: "2026-03-04T10:00:00.000Z",
          deletedAt: null,
        },
        {
          id: "11111111-1111-1111-1111-111111111111",
          text: "older active",
          completed: false,
          createdAt: "2026-03-01T10:00:00.000Z",
          updatedAt: "2026-03-01T10:00:00.000Z",
          deletedAt: null,
        },
      ],
    });
  });

  describe("x-request-id header", () => {
    describe("provided inbound x-request-id on success", () => {
      it("reuses the same request id in the response header", async () => {
        // Act
        const response = await app.inject({
          method: "GET",
          url: "/todos",
          headers: {
            "x-request-id": "request-id-from-client",
          },
        });

        // Assert
        expect(response.statusCode).toBe(200);
        expect(response.headers["x-request-id"]).toBe("request-id-from-client");
      });
    });

    describe("provided inbound x-request-id on unexpected failure", () => {
      it("reuses the same request id in both response header and error body", async () => {
        // Arrange
        await dropTodosTable();

        // Act
        const response = await app.inject({
          method: "GET",
          url: "/todos",
          headers: {
            "x-request-id": "error-request-id",
          },
        });

        // Assert
        expect(response.statusCode).toBe(500);
        expect(response.headers["content-type"]).toContain("application/json");
        expect(response.headers["x-request-id"]).toBe("error-request-id");

        const body = response.json<ApiErrorResponse>();

        expect(body).toEqual({
          code: "INTERNAL_ERROR",
          message: "Internal server error",
          requestId: "error-request-id",
        });
      });
    });

    describe("omitted inbound x-request-id on unexpected failure", () => {
      it("generates and returns a request id in header and error body", async () => {
        // Arrange
        await dropTodosTable();

        // Act
        const response = await app.inject({
          method: "GET",
          url: "/todos",
        });

        // Assert
        expect(response.statusCode).toBe(500);
        expect(response.headers["x-request-id"]).toBeTypeOf("string");

        const body = response.json<ApiErrorResponse>();

        expect(body.code).toBe("INTERNAL_ERROR");
        expect(body.message).toBe("Internal server error");
        expect(body.requestId).toBe(response.headers["x-request-id"]);
      });
    });
  });
});
