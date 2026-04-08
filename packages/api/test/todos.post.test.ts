import { MAX_TODO_TEXT_LENGTH, MAX_TODO_TITLE_LENGTH } from "shared";
import { describe, expect, it } from "vitest";
import type { PostTodosRouteResponses } from "../src/routes/todos/schemas.js";
import {
  ANY_ISO_DATETIME,
  ANY_UUID,
  createTestContext,
  runRequestIdHeaderTests,
  runUserScopingTests,
} from "./test-utils/index.js";

const getContext = createTestContext();

describe("POST /todos", () => {
  describe("valid payload", () => {
    it("returns 201 with title and text when both provided", async () => {
      // Arrange
      const { app, testUserId, testHeaders } = getContext();
      const payload = {
        title: "  buy milk  ",
        text: "  whole milk from the store  ",
      };

      // Act
      const response = await app.inject({
        method: "POST",
        url: "/todos",
        headers: testHeaders,
        payload,
      });

      // Assert
      expect(response.statusCode).toBe(201);

      const body = response.json<PostTodosRouteResponses[201]>();

      expect(body).toEqual({
        id: ANY_UUID,
        title: "buy milk",
        text: "whole milk from the store",
        completed: false,
        userId: testUserId,
        createdAt: ANY_ISO_DATETIME,
        updatedAt: ANY_ISO_DATETIME,
      });
      expect(body).not.toHaveProperty("deletedAt");
    });

    it("returns 201 with empty text when only title provided", async () => {
      // Arrange
      const { app, testUserId, testHeaders } = getContext();
      const payload = { title: "title only" };

      // Act
      const response = await app.inject({
        method: "POST",
        url: "/todos",
        headers: testHeaders,
        payload,
      });

      // Assert
      expect(response.statusCode).toBe(201);

      const body = response.json<PostTodosRouteResponses[201]>();

      expect(body).toEqual({
        id: ANY_UUID,
        title: "title only",
        text: "",
        completed: false,
        userId: testUserId,
        createdAt: ANY_ISO_DATETIME,
        updatedAt: ANY_ISO_DATETIME,
      });
    });
  });

  describe("invalid payload", () => {
    it.each([
      { name: "empty title", payload: { title: "   " } },
      {
        name: "title exceeding MAX_TODO_TITLE_LENGTH",
        payload: { title: "a".repeat(MAX_TODO_TITLE_LENGTH + 1) },
      },
      {
        name: "text exceeding MAX_TODO_TEXT_LENGTH",
        payload: {
          title: "valid title",
          text: "a".repeat(MAX_TODO_TEXT_LENGTH + 1),
        },
      },
    ])("returns 400 with VALIDATION_ERROR for $name", async ({ payload }) => {
      // Arrange
      const { app, testHeaders } = getContext();

      // Act
      const response = await app.inject({
        method: "POST",
        url: "/todos",
        headers: testHeaders,
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

  runRequestIdHeaderTests(() => {
    const { app, testHeaders } = getContext();
    return {
      app,
      injectInput: {
        method: "POST",
        url: "/todos",
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
        method: "POST",
        url: "/todos",
        headers: testHeaders,
        payload: { title: "task" },
      },
    };
  });
});
