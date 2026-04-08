import type { FastifyInstance } from "fastify";
import { DEFAULT_USER_ID } from "shared";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { buildApp } from "../src/app.js";
import type { GetTodosRouteResponses } from "../src/routes/schemas.js";
import {
  makeSeedTodo,
  makeSeedUser,
  seedTodo,
  seedUser,
} from "./test-utils/index.js";

let app: FastifyInstance;

beforeEach(async () => {
  app = await buildApp({ logger: false });
});

afterEach(async () => {
  await app.close();
});

describe("cross-user todo isolation", () => {
  const userB = makeSeedUser({
    id: "99999999-9999-4999-9999-999999999999",
    name: "User B",
  });

  beforeEach(async () => {
    await seedUser(userB);
  });

  it("user B cannot see user A's todos via GET", async () => {
    // Arrange
    const todoA = makeSeedTodo({ userId: DEFAULT_USER_ID });
    await seedTodo(todoA);

    // Act
    const response = await app.inject({
      method: "GET",
      url: "/todos",
      headers: { "x-user-id": userB.id },
    });

    // Assert
    const body = response.json<GetTodosRouteResponses[200]>();
    expect(body.todos).toEqual([]);
  });

  it("user B cannot PATCH user A's todo (returns 404)", async () => {
    // Arrange
    const todoA = makeSeedTodo({ userId: DEFAULT_USER_ID });
    await seedTodo(todoA);

    // Act
    const response = await app.inject({
      method: "PATCH",
      url: `/todos/${todoA.id}`,
      headers: { "x-user-id": userB.id },
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
    const todoA = makeSeedTodo({ userId: DEFAULT_USER_ID });
    await seedTodo(todoA);

    // Act
    const response = await app.inject({
      method: "DELETE",
      url: `/todos/${todoA.id}`,
      headers: { "x-user-id": userB.id },
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
      headers: { "x-user-id": userB.id },
      payload: { title: "User B's todo" },
    });

    expect(createResponse.statusCode).toBe(201);

    // Assert — user B sees it
    const listB = await app.inject({
      method: "GET",
      url: "/todos",
      headers: { "x-user-id": userB.id },
    });
    expect(listB.json<GetTodosRouteResponses[200]>().todos).toHaveLength(1);

    // Assert — user A does not see it
    const listA = await app.inject({
      method: "GET",
      url: "/todos",
      headers: { "x-user-id": DEFAULT_USER_ID },
    });
    expect(listA.json<GetTodosRouteResponses[200]>().todos).toEqual([]);
  });
});
