import type { FastifyInstance, InjectOptions } from "fastify";
import { describe, expect, it } from "vitest";

type RequestIdHeaderTestsInput = () => {
  app: FastifyInstance;
  injectInput: InjectOptions;
};

/**
 * Defines the standard `x-request-id header` tests for a route.
 * Accepts a getter to support per-file dynamic user headers.
 */
export function runRequestIdHeaderTests(
  getContext: RequestIdHeaderTestsInput,
): void {
  describe("x-request-id header", () => {
    describe("provided inbound x-request-id", () => {
      it("returns provided request", async () => {
        // Arrange
        const requestId = "request-id-from-client";
        const { app, injectInput } = getContext();

        // Act
        const response = await app.inject({
          ...injectInput,
          headers: {
            ...injectInput.headers,
            "x-request-id": requestId,
          },
        });

        // Assert
        expect(response.headers["x-request-id"]).toBe(requestId);
      });
    });

    describe("omitted inbound x-request-id", () => {
      it("generates and returns a request id in header", async () => {
        // Arrange
        const { app, injectInput } = getContext();

        // Act
        const response = await app.inject(injectInput);

        // Assert
        expect(response.headers["x-request-id"]).toBeTypeOf("string");
        expect(response.headers["x-request-id"]).not.toBe("");
      });
    });
  });
}
