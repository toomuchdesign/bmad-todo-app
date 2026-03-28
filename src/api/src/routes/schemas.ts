import { todoSchema } from "../definitions/todo.js";

const responseHeadersSchema = {
  "x-request-id": {
    required: true,
    type: "string",
    description: "Request correlation identifier",
  },
} as const;

export const apiErrorResponseSchema = {
  type: "object",
  required: ["code", "message"],
  properties: {
    code: { type: "string" },
    message: { type: "string" },
    requestId: { type: "string" },
    details: {
      type: "array",
      items: {
        type: "object",
        properties: {
          field: { type: "string" },
          min: { type: "number" },
          max: { type: "number" },
          reason: { type: "string" },
        },
        additionalProperties: true,
      },
    },
  },
} as const;

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
    500: {
      headers: responseHeadersSchema,
      ...apiErrorResponseSchema,
    },
  },
} as const;
