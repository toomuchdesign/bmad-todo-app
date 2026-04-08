import type { FastifyInstance } from "fastify";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { buildApp } from "../src/app.js";

let app: FastifyInstance;

beforeAll(async () => {
  app = await buildApp({ logger: false });
});

afterAll(async () => {
  await app.close();
});

describe("app", () => {
  describe("buildApp()", () => {
    it("boots the Fastify app", async () => {
      expect(app).toBeDefined();
    });

    it("exposes Swagger UI at /documentation/", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/documentation/",
      });

      expect(response.statusCode).toBe(200);
      expect(response.headers["content-type"]).toContain("text/html");
    });
  });
});
