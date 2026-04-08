import type { FromSchema, JSONSchema } from "json-schema-to-ts";
import { apiErrorResponseSchema } from "shared";

export const requestHeadersSchema = {
  type: "object",
  properties: {
    "x-request-id": {
      type: "string",
      description:
        "Optional correlation ID for request tracing. If provided, the API echoes it back in the response; otherwise a new UUID is generated.",
    },
  },
} as const;

export const responseHeadersSchema = {
  "x-request-id": {
    required: true,
    type: "string",
    description: "Request correlation identifier",
  },
} as const;

/** Standard error response with request-id headers, reused across all routes. */
export const errorResponseSchema = {
  headers: responseHeadersSchema,
  ...apiErrorResponseSchema,
} as const;

type RouteResponseSchemas = Partial<Record<number | "default", JSONSchema>>;

/**
 * Infers a route response-type map from a Fastify `response` schema object.
 */
export type InferRouteResponses<TResponse extends RouteResponseSchemas> = {
  [TStatus in keyof TResponse]: TResponse[TStatus] extends JSONSchema
    ? FromSchema<TResponse[TStatus]>
    : never;
};
