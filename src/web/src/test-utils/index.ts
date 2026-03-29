import type { Todo } from "@bmad-todo/shared";
import { vi } from "vitest";

export const TODO_FIXTURES: Todo[] = [
  {
    id: "1",
    text: "Buy milk",
    completed: false,
    createdAt: "2026-03-01T10:00:00.000Z",
    updatedAt: "2026-03-01T10:00:00.000Z",
  },
  {
    id: "2",
    text: "Walk the dog",
    completed: true,
    createdAt: "2026-03-02T12:00:00.000Z",
    updatedAt: "2026-03-02T14:00:00.000Z",
  },
];

/** Stubs global fetch to return a successful GET /todos response. */
export function mockFetchSuccess(todos: Todo[]): void {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ todos }),
    }),
  );
}

/** Stubs global fetch to return a failed response with optional error body. */
export function mockFetchError(body?: { code: string; message: string }): void {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      json: body
        ? () => Promise.resolve(body)
        : () => Promise.reject(new Error("no body")),
    }),
  );
}

/** Stubs global fetch to reject with a network error. */
export function mockFetchNetworkError(): void {
  vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("Network error")));
}
