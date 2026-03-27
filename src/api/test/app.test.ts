import { describe, expect, it } from "vitest";
import { buildApp } from "../src/app.js";

describe("app", () => {
  describe("buildApp()", () => {
    it("boots the Fastify app", async () => {
      const app = buildApp({ logger: false });

      try {
        await app.ready();
        expect(true).toBe(true);
      } finally {
        await app.close();
      }
    });
  });
});
