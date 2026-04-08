import { describe, expect, it } from "vitest";
import type { GetTodosRouteResponses } from "../src/routes/todos/schemas.js";
import {
  createTestContext,
  makeSeedTodo,
  runRequestIdHeaderTests,
  runUserScopingTests,
  seedTodo,
} from "./test-utils/index.js";

const getContext = createTestContext();

describe("GET /todos", () => {
  it("returns 200 with empty array when no todos exist", async () => {
    // Arrange
    const { app, testHeaders } = getContext();

    // Act
    const response = await app.inject({
      method: "GET",
      url: "/todos",
      headers: testHeaders,
    });

    // Assert
    expect(response.statusCode).toBe(200);
    expect(response.headers["content-type"]).toContain("application/json");

    const body = response.json<GetTodosRouteResponses[200]>();

    expect(body).toEqual({ todos: [] });
  });

  it("returns 200 with active todos ordered newest-first and includes x-request-id", async () => {
    // Arrange
    const { app, testUserId, testHeaders } = getContext();
    const olderActive = makeSeedTodo({
      id: "11111111-1111-1111-1111-111111111111",
      title: "older active",
      userId: testUserId,
      createdAt: "2026-03-01T10:00:00.000Z",
      updatedAt: "2026-03-01T10:00:00.000Z",
    });
    const deletedTodo = makeSeedTodo({
      id: "22222222-2222-2222-2222-222222222222",
      title: "deleted should be excluded",
      userId: testUserId,
      createdAt: "2026-03-02T10:00:00.000Z",
      updatedAt: "2026-03-02T10:00:00.000Z",
      deletedAt: "2026-03-03T10:00:00.000Z",
    });
    const newerActive = makeSeedTodo({
      id: "33333333-3333-3333-3333-333333333333",
      title: "newer active",
      completed: true,
      userId: testUserId,
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
      headers: testHeaders,
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
          userId: testUserId,
          createdAt: "2026-03-04T10:00:00.000Z",
          updatedAt: "2026-03-04T10:00:00.000Z",
        },
        {
          id: "11111111-1111-1111-1111-111111111111",
          title: "older active",
          text: "",
          completed: false,
          userId: testUserId,
          createdAt: "2026-03-01T10:00:00.000Z",
          updatedAt: "2026-03-01T10:00:00.000Z",
        },
      ],
    });
  });

  runRequestIdHeaderTests(() => {
    const { app, testHeaders } = getContext();
    return {
      app,
      injectInput: { method: "GET", url: "/todos", headers: testHeaders },
    };
  });

  runUserScopingTests(() => {
    const { app, testHeaders } = getContext();
    return {
      app,
      injectInput: { method: "GET", url: "/todos", headers: testHeaders },
    };
  });
});
