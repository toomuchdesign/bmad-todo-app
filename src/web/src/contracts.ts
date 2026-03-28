import {
  type ApiErrorResponse,
  MAX_TODO_TEXT_LENGTH,
  type Todo,
} from "@bmad-todo/shared";
import type { ApiPath } from "./api/generated";

export const TODOS_API_PATH: ApiPath = "/todos";

export type TodosResponse = Todo[];
export type TodosErrorResponse = ApiErrorResponse;

export { MAX_TODO_TEXT_LENGTH };
