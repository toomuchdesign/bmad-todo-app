export { default as fetchMock } from "@fetch-mock/vitest";
export { createDeferred, type Deferred } from "./deferred";
export {
  mockGetTodos,
  mockGetTodosError,
  mockGetTodosNetworkError,
  TODO_FIXTURES,
} from "./fetch-mocks";
