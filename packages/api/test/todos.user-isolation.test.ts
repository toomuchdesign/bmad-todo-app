import type { FastifyInstance } from "fastify";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { buildApp } from "../src/app.js";
import type { GetTodosRouteResponses } from "../src/routes/todos/schemas.js";
import {
  cleanupUserTodos,
  createTestUser,
  makeSeedTodo,
  runQuery,
  seedTodo,
} from "./test-utils/index.js";

// This file tests cross-user isolation and requires two independent users (A and B).
// createTestContext() only creates one user, so setup is done manually here.
let app: FastifyInstance;
let userAId: string;
let userAHeaders: Record<string, string>;
let userBId: string;
let userBHeaders: Record<string, string>;

beforeAll(async () => {
  app = await buildApp({ logger: false });
  ({ userId: userAId, headers: userAHeaders } = await createTestUser({ app }));
  ({ userId: userBId, headers: userBHeaders } = await createTestUser({ app }));
});

afterAll(async () => {
  // Delete todos before users to satisfy the FK constraint (no CASCADE on the FK).
  if (userAId)
    await runQuery("DELETE FROM todos WHERE user_id = $1", [userAId]);
  if (userBId)
    await runQuery("DELETE FROM todos WHERE user_id = $1", [userBId]);
  if (userAId) await runQuery("DELETE FROM users WHERE id = $1", [userAId]);
  if (userBId) await runQuery("DELETE FROM users WHERE id = $1", [userBId]);
  if (app) await app.close();
});

beforeEach(async () => {
  await cleanupUserTodos({ userId: userAId });
  await cleanupUserTodos({ userId: userBId });
});

describe("cross-user todo isolation", () => {
  it("user B cannot see user A's todos via GET", async () => {
    // Arrange
    const todoA = makeSeedTodo({ userId: userAId });
    await seedTodo(todoA);

    // Act
    const response = await app.inject({
      method: "GET",
      url: "/todos",
      headers: userBHeaders,
    });

    // Assert
    const body = response.json();

    const expected: GetTodosRouteResponses[200] = { todos: [] };
    expect(body).toEqual(expected);
  });

  it("user B cannot PATCH user A's todo (returns 404)", async () => {
    // Arrange
    const todoA = makeSeedTodo({ userId: userAId });
    await seedTodo(todoA);

    // Act
    const response = await app.inject({
      method: "PATCH",
      url: `/todos/${todoA.id}`,
      headers: userBHeaders,
      payload: { title: "hijacked" },
    });

    // Assert
    expect(response.statusCode).toBe(404);
    expect(response.json()).toEqual({
      code: "NOT_FOUND",
      message: "Todo not found",
    });
  });

  it("user B cannot DELETE user A's todo (returns 404)", async () => {
    // Arrange
    const todoA = makeSeedTodo({ userId: userAId });
    await seedTodo(todoA);

    // Act
    const response = await app.inject({
      method: "DELETE",
      url: `/todos/${todoA.id}`,
      headers: userBHeaders,
    });

    // Assert
    expect(response.statusCode).toBe(404);
    expect(response.json()).toEqual({
      code: "NOT_FOUND",
      message: "Todo not found",
    });
  });

  it("todo created by user B is visible only in user B's list", async () => {
    // Act — user B creates a todo
    const createResponse = await app.inject({
      method: "POST",
      url: "/todos",
      headers: userBHeaders,
      payload: { title: "User B's todo" },
    });

    expect(createResponse.statusCode).toBe(201);

    // Assert — user B sees it
    const listB = await app.inject({
      method: "GET",
      url: "/todos",
      headers: userBHeaders,
    });
    expect(listB.json().todos).toHaveLength(1);

    // Assert — user A does not see it
    const listA = await app.inject({
      method: "GET",
      url: "/todos",
      headers: userAHeaders,
    });

    const expectedEmpty: GetTodosRouteResponses[200] = { todos: [] };
    expect(listA.json()).toEqual(expectedEmpty);
  });
});
