import type { FastifyInstance } from "fastify";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { buildApp } from "../src/app.js";
import type { GetTodosRouteResponses } from "../src/routes/schemas.js";
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

describe("GET /todos", () => {
  it("returns 200 with active todos ordered newest-first and includes x-request-id", async () => {
    // Arrange
    const olderActive = makeSeedTodo({
      id: "11111111-1111-1111-1111-111111111111",
      title: "older active",
      createdAt: "2026-03-01T10:00:00.000Z",
      updatedAt: "2026-03-01T10:00:00.000Z",
    });
    const deletedTodo = makeSeedTodo({
      id: "22222222-2222-2222-2222-222222222222",
      title: "deleted should be excluded",
      createdAt: "2026-03-02T10:00:00.000Z",
      updatedAt: "2026-03-02T10:00:00.000Z",
      deletedAt: "2026-03-03T10:00:00.000Z",
    });
    const newerActive = makeSeedTodo({
      id: "33333333-3333-3333-3333-333333333333",
      title: "newer active",
      completed: true,
      createdAt: "2026-03-04T10:00:00.000Z",
      updatedAt: "2026-03-04T10:00:00.000Z",
    });
    await seedTodo(olderActive);
    await seedTodo(deletedTodo);
    await seedTodo(newerActive);

    // Act
    const response = await app.inject({
      method: "GET",
      url: "/todos",
    });

    // Assert
    expect(response.statusCode).toBe(200);
    expect(response.headers["content-type"]).toContain("application/json");
    expect(response.headers["x-request-id"]).toBeTypeOf("string");

    const body = response.json<GetTodosRouteResponses[200]>();

    expect(body).toEqual({
      todos: [
        {
          id: "33333333-3333-3333-3333-333333333333",
          title: "newer active",
          text: "",
          completed: true,
          createdAt: "2026-03-04T10:00:00.000Z",
          updatedAt: "2026-03-04T10:00:00.000Z",
          deletedAt: null,
        },
        {
          id: "11111111-1111-1111-1111-111111111111",
          title: "older active",
          text: "",
          completed: false,
          createdAt: "2026-03-01T10:00:00.000Z",
          updatedAt: "2026-03-01T10:00:00.000Z",
          deletedAt: null,
        },
      ],
    });
  });

  runRequestIdHeaderTests({
    app: () => app,
    injectInput: {
      method: "GET",
      url: "/todos",
    },
  });
});
