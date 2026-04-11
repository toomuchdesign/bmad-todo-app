import {
  MAX_TODO_TEXT_LENGTH,
  MAX_TODO_TITLE_LENGTH,
  todoSchema,
} from "shared";

import type { InferRouteResponses } from "../shared/schemas.js";
import {
  authenticatedRequestHeadersSchema,
  errorResponseSchema,
  responseHeadersSchema,
} from "../shared/schemas.js";

export const getTodosRouteSchema = {
  tags: ["todos"],
  summary: "List todos",
  headers: authenticatedRequestHeadersSchema,
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
  headers: authenticatedRequestHeadersSchema,
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
  headers: authenticatedRequestHeadersSchema,
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
  headers: authenticatedRequestHeadersSchema,
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
