import { MAX_TODO_TEXT_LENGTH, MAX_TODO_TITLE_LENGTH } from "shared";
import type { paths } from "./api/generated";
import type { ApiRequestBody, ApiResponses } from "./api/helpers";

export const TODOS_API_PATH = "/todos" satisfies keyof paths;
export const TODO_BY_ID_API_PATH = "/todos/{id}" satisfies keyof paths;

/** Fields accepted by PATCH /todos/:id, derived from the API contract. */
export type TodoUpdatableFields = ApiRequestBody<
  typeof TODO_BY_ID_API_PATH,
  "patch"
>;

export type { ApiResponses };
export { MAX_TODO_TEXT_LENGTH, MAX_TODO_TITLE_LENGTH };
