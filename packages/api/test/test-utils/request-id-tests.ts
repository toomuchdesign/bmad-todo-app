import type { FastifyInstance, InjectOptions } from "fastify";
import { describe, expect, it } from "vitest";

type RequestIdHeaderTestsInput = {
  app: () => FastifyInstance;
  injectInput: InjectOptions;
};

/**
 * Defines the standard `x-request-id header` tests for a route.
 */
export function runRequestIdHeaderTests({
  app,
  injectInput,
}: RequestIdHeaderTestsInput): void {
  describe("x-request-id header", () => {
    describe("provided inbound x-request-id", () => {
      it("returns provided request", async () => {
        // Arrange
        const requestId = "request-id-from-client";

        // Act
        const response = await app().inject({
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
        // Act
        const response = await app().inject(injectInput);

        // Assert
        expect(response.headers["x-request-id"]).toBeTypeOf("string");
        expect(response.headers["x-request-id"]).not.toBe("");
      });
    });
  });
}
