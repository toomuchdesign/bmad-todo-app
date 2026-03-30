import type { FromSchema, JSONSchema } from "json-schema-to-ts";
import {
  apiErrorResponseSchema,
  MAX_TODO_TEXT_LENGTH,
  todoSchema,
} from "shared";

const responseHeadersSchema = {
  "x-request-id": {
    required: true,
    type: "string",
    description: "Request correlation identifier",
  },
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

export const getTodosRouteSchema = {
  tags: ["todos"],
  summary: "List todos",
  response: {
    200: {
      headers: responseHeadersSchema,
      type: "object",
      required: ["todos"],
      properties: {
        todos: {
          type: "array",
          items: todoSchema,
        },
      },
    },
    default: {
      headers: responseHeadersSchema,
      ...apiErrorResponseSchema,
    },
  },
} as const;

export type GetTodosRouteResponses = InferRouteResponses<
  typeof getTodosRouteSchema.response
>;

export const postTodosRouteSchema = {
  tags: ["todos"],
  summary: "Create todo",
  body: {
    type: "object",
    required: ["text"],
    additionalProperties: false,
    properties: {
      text: {
        type: "string",
        minLength: 1,
        maxLength: MAX_TODO_TEXT_LENGTH,
        pattern: ".*\\S.*",
      },
    },
  },
  response: {
    201: {
      headers: responseHeadersSchema,
      ...todoSchema,
    },
    400: {
      headers: responseHeadersSchema,
      ...apiErrorResponseSchema,
    },
    default: {
      headers: responseHeadersSchema,
      ...apiErrorResponseSchema,
    },
  },
} as const;

export type PostTodosRouteResponses = InferRouteResponses<
  typeof postTodosRouteSchema.response
>;
