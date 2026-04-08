import type { FromSchema, JSONSchema } from "json-schema-to-ts";
import {
  apiErrorResponseSchema,
  MAX_TODO_TEXT_LENGTH,
  MAX_TODO_TITLE_LENGTH,
  MAX_USER_NAME_LENGTH,
  todoSchema,
  userSchema,
} from "shared";

const requestHeadersSchema = {
  type: "object",
  properties: {
    "x-request-id": {
      type: "string",
      description:
        "Optional correlation ID for request tracing. If provided, the API echoes it back in the response; otherwise a new UUID is generated.",
    },
  },
} as const;

const responseHeadersSchema = {
  "x-request-id": {
    required: true,
    type: "string",
    description: "Request correlation identifier",
  },
} as const;

/** Standard error response with request-id headers, reused across all routes. */
const errorResponseSchema = {
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

export const getTodosRouteSchema = {
  tags: ["todos"],
  summary: "List todos",
  headers: requestHeadersSchema,
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
    default: errorResponseSchema,
  },
} as const;

export type GetTodosRouteResponses = InferRouteResponses<
  typeof getTodosRouteSchema.response
>;

export const postTodosRouteSchema = {
  tags: ["todos"],
  summary: "Create todo",
  headers: requestHeadersSchema,
  body: {
    type: "object",
    required: ["title"],
    additionalProperties: false,
    properties: {
      title: {
        type: "string",
        minLength: 1,
        maxLength: MAX_TODO_TITLE_LENGTH,
        pattern: ".*\\S.*",
      },
      text: {
        type: "string",
        maxLength: MAX_TODO_TEXT_LENGTH,
      },
    },
  },
  response: {
    201: {
      headers: responseHeadersSchema,
      ...todoSchema,
    },
    400: errorResponseSchema,
    default: errorResponseSchema,
  },
} as const;

export type PostTodosRouteResponses = InferRouteResponses<
  typeof postTodosRouteSchema.response
>;

export const patchTodosRouteSchema = {
  tags: ["todos"],
  summary: "Update todo",
  headers: requestHeadersSchema,
  params: {
    type: "object",
    required: ["id"],
    properties: {
      id: { type: "string", format: "uuid" },
    },
  },
  body: {
    type: "object",
    additionalProperties: false,
    properties: {
      title: {
        type: "string",
        minLength: 1,
        maxLength: MAX_TODO_TITLE_LENGTH,
        pattern: ".*\\S.*",
      },
      text: {
        type: "string",
        maxLength: MAX_TODO_TEXT_LENGTH,
      },
      completed: {
        type: "boolean",
      },
    },
  },
  response: {
    200: {
      headers: responseHeadersSchema,
      ...todoSchema,
    },
    400: errorResponseSchema,
    404: errorResponseSchema,
    default: errorResponseSchema,
  },
} as const;

export type PatchTodosRouteResponses = InferRouteResponses<
  typeof patchTodosRouteSchema.response
>;

export const deleteTodosRouteSchema = {
  tags: ["todos"],
  summary: "Delete todo",
  headers: requestHeadersSchema,
  params: {
    type: "object",
    required: ["id"],
    properties: {
      id: { type: "string", format: "uuid" },
    },
  },
  response: {
    204: {
      headers: responseHeadersSchema,
      type: "null",
      description: "Todo deleted",
    },
    400: errorResponseSchema,
    404: errorResponseSchema,
    default: errorResponseSchema,
  },
} as const;

export type DeleteTodosRouteResponses = InferRouteResponses<
  typeof deleteTodosRouteSchema.response
>;

export const postUsersRouteSchema = {
  tags: ["users"],
  summary: "Create user",
  headers: requestHeadersSchema,
  body: {
    type: "object",
    required: ["name"],
    additionalProperties: false,
    properties: {
      name: {
        type: "string",
        minLength: 1,
        maxLength: MAX_USER_NAME_LENGTH,
        pattern: ".*\\S.*",
      },
    },
  },
  response: {
    201: {
      headers: responseHeadersSchema,
      ...userSchema,
    },
    400: errorResponseSchema,
    default: errorResponseSchema,
  },
} as const;

export type PostUsersRouteResponses = InferRouteResponses<
  typeof postUsersRouteSchema.response
>;
