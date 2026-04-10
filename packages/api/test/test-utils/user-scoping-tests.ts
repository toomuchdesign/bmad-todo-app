import type { FastifyInstance, InjectOptions } from "fastify";
import { describe, expect, it } from "vitest";

type AuthScopingTestsInput = () => {
  app: FastifyInstance;
  injectInput: InjectOptions;
};

/**
 * Defines the standard auth scoping tests for a protected route.
 * Tests 401 when no auth is provided, 401 with invalid Bearer token,
 * and success when valid auth is provided.
 * Accepts a getter to support per-file dynamic user headers.
 */
export function runUserScopingTests(getContext: AuthScopingTestsInput): void {
  describe("auth scoping", () => {
    it("returns 401 when no auth is provided", async () => {
      // Arrange — strip both authorization and x-user-id headers
      const { app, injectInput } = getContext();
      const { headers: _headers, ...rest } = injectInput;

      // Act
      const response = await app.inject(rest);

      // Assert — auth plugin rejects with 401
      expect(response.statusCode).toBe(401);
      expect(response.json()).toEqual({
        code: "UNAUTHORIZED",
        message: "Authentication required",
      });
    });

    it("returns 401 with invalid Bearer token", async () => {
      // Arrange
      const { app, injectInput } = getContext();

      // Act
      const response = await app.inject({
        ...injectInput,
        headers: {
          ...injectInput.headers,
          authorization: "Bearer invalid-token",
        },
      });

      // Assert
      expect(response.statusCode).toBe(401);
      expect(response.json()).toEqual({
        code: "UNAUTHORIZED",
        message: "Authentication required",
      });
    });

    it("does not return 401 with valid auth", async () => {
      // Arrange
      const { app, injectInput } = getContext();

      // Act — injectInput includes the file's valid test user headers
      const response = await app.inject(injectInput);

      // Assert — auth should pass; route-level errors (404, 422) are acceptable
      expect(response.statusCode).not.toBe(401);
      expect(response.statusCode).not.toBe(500);
    });
  });
}
