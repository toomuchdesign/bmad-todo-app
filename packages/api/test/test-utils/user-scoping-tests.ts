import { randomUUID } from "node:crypto";
import type { FastifyInstance, InjectOptions } from "fastify";
import { DEFAULT_USER_ID } from "shared";
import { describe, expect, it } from "vitest";

type UserScopingTestsInput = {
  app: () => FastifyInstance;
  injectInput: InjectOptions;
};

/**
 * Defines the standard x-user-id scoping tests for a todo route.
 * Tests 401 when header is missing and 401 when header references a non-existent user.
 */
export function runUserScopingTests({
  app,
  injectInput,
}: UserScopingTestsInput): void {
  describe("x-user-id scoping", () => {
    it("returns 400 when x-user-id header is missing", async () => {
      // Arrange — ensure no x-user-id in headers
      const { headers: _headers, ...rest } = injectInput;

      // Act
      const response = await app().inject(rest);

      // Assert — schema-level validation rejects missing required header with 400
      expect(response.statusCode).toBe(400);
    });

    it("returns 401 when x-user-id references a non-existent user", async () => {
      // Arrange
      const nonExistentUserId = randomUUID();

      // Act
      const response = await app().inject({
        ...injectInput,
        headers: {
          ...injectInput.headers,
          "x-user-id": nonExistentUserId,
        },
      });

      // Assert
      expect(response.statusCode).toBe(401);
      expect(response.json()).toEqual({
        code: "UNAUTHORIZED",
        message: "Valid x-user-id header is required",
      });
    });

    it("does not return 401 when x-user-id references the default user", async () => {
      // Act
      const response = await app().inject({
        ...injectInput,
        headers: {
          ...injectInput.headers,
          "x-user-id": DEFAULT_USER_ID,
        },
      });

      // Assert — auth should pass; route-level errors (404, 422) are acceptable
      expect(response.statusCode).not.toBe(401);
      expect(response.statusCode).not.toBe(500);
    });
  });
}
