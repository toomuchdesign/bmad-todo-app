export const todoSchema = {
  type: "object",
  required: ["id", "text", "completed", "createdAt", "updatedAt"],
  properties: {
    id: { type: "string" },
    text: { type: "string" },
    completed: { type: "boolean" },
    createdAt: { type: "string" },
    updatedAt: { type: "string" },
    deletedAt: { anyOf: [{ type: "string" }, { type: "null" }] },
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
      type: "array",
      items: todoSchema,
    },
    501: {
      ...apiErrorResponseSchema,
    },
  },
} as const;
