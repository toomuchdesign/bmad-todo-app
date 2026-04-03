import { MAX_TODO_TEXT_LENGTH, MAX_TODO_TITLE_LENGTH } from "shared";
import type { paths } from "./api/generated";
import type { ApiResponses } from "./api/helpers";

export const TODOS_API_PATH: keyof paths = "/todos";
export const TODO_BY_ID_API_PATH: keyof paths = "/todos/{id}";

export type { ApiResponses };
export { MAX_TODO_TEXT_LENGTH, MAX_TODO_TITLE_LENGTH };
