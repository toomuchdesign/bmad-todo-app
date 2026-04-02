import fetchMock from "@fetch-mock/vitest";
import { describe, expect, expectTypeOf, it } from "vitest";
import { HttpError, httpClient } from ".";

describe("httpClient", () => {
  describe("get", () => {
    it("sends a GET request and returns parsed JSON", async () => {
      fetchMock.get("/api/items", { items: [1, 2] });

      const result = await httpClient.get<{ items: number[] }>("/api/items");

      expect(result).toEqual({ items: [1, 2] });
    });

    it("returns the expected type", () => {
      type Items = { items: number[] };

      expectTypeOf(httpClient.get<Items>).returns.toEqualTypeOf<
        Promise<Items>
      >();
    });
  });

  describe("post", () => {
    it("sends a POST request with JSON body and returns parsed JSON", async () => {
      fetchMock.post("/api/items", { id: "1", text: "new" });

      const result = await httpClient.post<{ id: string; text: string }>(
        "/api/items",
        { body: { text: "new" } },
      );

      expect(result).toEqual({ id: "1", text: "new" });
      const call = fetchMock.callHistory.lastCall();
      expect(call?.options.method).toBe("post");
      expect(call?.options.headers).toEqual({
        "content-type": "application/json",
      });
      expect(call?.options.body).toBe(JSON.stringify({ text: "new" }));
    });

    it("returns the expected type", () => {
      type Created = { id: string; text: string };

      expectTypeOf(httpClient.post<Created>).returns.toEqualTypeOf<
        Promise<Created>
      >();
    });
  });

  describe("patch", () => {
    it("sends a PATCH request with JSON body and returns parsed JSON", async () => {
      fetchMock.patch("/api/items/1", { id: "1", text: "updated" });

      const result = await httpClient.patch<{ id: string; text: string }>(
        "/api/items/1",
        { body: { text: "updated" } },
      );

      expect(result).toEqual({ id: "1", text: "updated" });
      const call = fetchMock.callHistory.lastCall();
      expect(call?.options.method).toBe("patch");
    });

    it("returns the expected type", () => {
      type Updated = { id: string; text: string };

      expectTypeOf(httpClient.patch<Updated>).returns.toEqualTypeOf<
        Promise<Updated>
      >();
    });
  });

  describe("del", () => {
    it("sends a DELETE request", async () => {
      fetchMock.delete("/api/items/1", 204);

      await httpClient.del("/api/items/1");

      const call = fetchMock.callHistory.lastCall();
      expect(call?.options.method).toBe("delete");
    });

    it("returns the expected type", () => {
      expectTypeOf(httpClient.del<void>).returns.toEqualTypeOf<Promise<void>>();
    });
  });

  describe("failure handling", () => {
    it("throws HttpError with server message on non-ok response", async () => {
      fetchMock.get("/api/fail", {
        status: 400,
        body: { message: "Invalid request" },
      });

      const error = await httpClient
        .get("/api/fail")
        .catch((err: unknown) => err);

      expect(error).toBeInstanceOf(HttpError);
      expect((error as HttpError).message).toBe("Invalid request");
      expect((error as HttpError).status).toBe(400);
    });

    it("throws HttpError with empty message when body has no message field", async () => {
      fetchMock.get("/api/fail", {
        status: 500,
        body: { error: "something" },
      });

      const error = await httpClient
        .get("/api/fail")
        .catch((err: unknown) => err);

      expect(error).toBeInstanceOf(HttpError);
      expect((error as HttpError).message).toBe("");
      expect((error as HttpError).status).toBe(500);
    });

    it("throws HttpError with empty message when body is not JSON", async () => {
      fetchMock.get("/api/fail", {
        status: 500,
        body: "not json",
        headers: { "Content-Type": "text/plain" },
      });

      const error = await httpClient
        .get("/api/fail")
        .catch((err: unknown) => err);

      expect(error).toBeInstanceOf(HttpError);
      expect((error as HttpError).message).toBe("");
      expect((error as HttpError).status).toBe(500);
    });

    it("propagates network errors as-is", async () => {
      fetchMock.get("/api/fail", { throws: new TypeError("Failed to fetch") });

      const error = await httpClient
        .get("/api/fail")
        .catch((err: unknown) => err);

      expect(error).toBeInstanceOf(TypeError);
      expect((error as TypeError).message).toBe("Failed to fetch");
    });
  });

  describe("signal passthrough", () => {
    it("passes AbortSignal to fetch", async () => {
      fetchMock.get("/api/items", { items: [] });
      const controller = new AbortController();

      await httpClient.get("/api/items", { signal: controller.signal });

      const call = fetchMock.callHistory.lastCall();
      expect(call?.signal).toBe(controller.signal);
    });
  });

  describe("request without body", () => {
    it("does not set Content-Type header when no body is provided", async () => {
      fetchMock.get("/api/items", { items: [] });

      await httpClient.get("/api/items");

      const call = fetchMock.callHistory.lastCall();
      expect(call?.options.headers).toBeUndefined();
    });
  });
});
