import { MAX_TODO_TEXT_LENGTH, MAX_TODO_TITLE_LENGTH } from "shared";
import type { paths } from "./api/generated";
import type { ApiRequestBody, ApiResponses } from "./api/helpers";

/**
 * OpenAPI spec path keys — used only for type extraction via ApiResponses /
 * ApiRequestBody. These match the keys in the generated OpenAPI types.
 */
export const TODOS_SPEC_PATH = "/todos" satisfies keyof paths;
export const TODO_BY_ID_SPEC_PATH = "/todos/{id}" satisfies keyof paths;

const API_PREFIX = "/api";

/** Runtime API paths (prefixed for proxy routing). */
export const TODOS_API_PATH = `${API_PREFIX}${TODOS_SPEC_PATH}`;

const AUTH_API_PREFIX = `${API_PREFIX}/auth`;
export const AUTH_LOGIN_API_PATH = `${AUTH_API_PREFIX}/login`;
export const AUTH_REGISTER_API_PATH = `${AUTH_API_PREFIX}/register`;
export const AUTH_LOGOUT_API_PATH = `${AUTH_API_PREFIX}/logout`;

/** Fields accepted by PATCH /todos/:id, derived from the API contract. */
export type TodoUpdatableFields = ApiRequestBody<
  typeof TODO_BY_ID_SPEC_PATH,
  "patch"
>;

export type { ApiResponses };
export { MAX_TODO_TEXT_LENGTH, MAX_TODO_TITLE_LENGTH };
