import fetchMock from "@fetch-mock/vitest";
import type { FetchMock } from "fetch-mock";
import type { Todo } from "shared";

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

/**
 * Sets up fetchMock with a GET /todos route returning the given todos.
 * Chains fluently — call additional .route() / .once() after this.
 */
export function mockGetTodos(todos: Todo[]): FetchMock {
  return fetchMock.mockGlobal().get("/todos", { todos });
}

/**
 * Sets up fetchMock with a GET /todos route that returns an HTTP error.
 * When no body is provided, the response body cannot be parsed (simulates unparseable error).
 */
export function mockGetTodosError(body?: {
  code: string;
  message: string;
}): FetchMock {
  if (body) {
    return fetchMock.mockGlobal().get("/todos", { status: 500, body });
  }
  return fetchMock.mockGlobal().get("/todos", { throws: new Error("no body") });
}

/** Sets up fetchMock with a GET /todos route that rejects with a network error. */
export function mockGetTodosNetworkError(): FetchMock {
  return fetchMock
    .mockGlobal()
    .get("/todos", { throws: new Error("Network error") });
}
