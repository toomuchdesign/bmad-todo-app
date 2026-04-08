import type { FastifyInstance } from "fastify";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { buildApp } from "../src/app.js";
import { getConfig } from "../src/config.js";

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

  describe("CORS", () => {
    it("returns access-control-allow-origin header matching WEB_ORIGIN", async () => {
      const webOrigin = getConfig().WEB_ORIGIN;

      const response = await app.inject({
        method: "GET",
        url: "/healthcheck",
        headers: { origin: webOrigin },
      });

      expect(response.headers["access-control-allow-origin"]).toBe(webOrigin);
    });
  });
});
