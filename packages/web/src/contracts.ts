import { MAX_TODO_TEXT_LENGTH } from "shared";
import type { paths } from "./api/generated";
import type { ApiResponses } from "./api/helpers";

export const TODOS_API_PATH: keyof paths = "/todos";

export type { ApiResponses };
export { MAX_TODO_TEXT_LENGTH };
