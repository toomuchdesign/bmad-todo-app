import type { paths } from "./generated";

type HttpMethod = "get" | "post" | "put" | "patch" | "delete";

/**
 * Extract the JSON response body for a given path, method, and status code.
 * Supports numeric status codes (200, 201, 400) and "default".
 */
type ApiResponseBody<
  P extends keyof paths,
  M extends HttpMethod & keyof paths[P],
  S extends keyof (paths[P][M] & { responses: unknown })["responses"],
> = (paths[P][M] & {
  responses: Record<string, { content: { "application/json": unknown } }>;
})["responses"][S]["content"]["application/json"];

/**
 * Map of status code → JSON response body for a given path and method.
 */
export type ApiResponses<
  P extends keyof paths,
  M extends HttpMethod & keyof paths[P],
> = {
  [S in keyof (paths[P][M] & {
    responses: unknown;
  })["responses"]]: ApiResponseBody<P, M, S>;
};
