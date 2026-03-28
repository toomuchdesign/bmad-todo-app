import type { ApiErrorResponse } from "@bmad-todo/shared";
import { describe, expect, it } from "vitest";
import { buildApp } from "../src/app.js";

describe("GET /todos", () => {
  it("returns 501 with a stable error contract until implemented", async () => {
    const app = buildApp({ logger: false });

    try {
      await app.ready();

      const response = await app.inject({
        method: "GET",
        url: "/todos",
      });

      expect(response.statusCode).toBe(501);
      expect(response.headers["content-type"]).toContain("application/json");
      const body = response.json<ApiErrorResponse>();

      expect(body).toEqual({
        code: "NOT_IMPLEMENTED",
        message: "Not implemented",
      });
    } finally {
      await app.close();
    }
  });
});
