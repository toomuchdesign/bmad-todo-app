import type { ApiErrorResponse } from "@bmad-todo/shared";
import type { FastifyPluginAsync } from "fastify";

const todoSchema = {
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

const apiErrorResponseSchema = {
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

const todosRoutes: FastifyPluginAsync = async (app) => {
  app.get(
    "/todos",
    {
      schema: {
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
      },
    },
    async (_request, reply) => {
      const response: ApiErrorResponse = {
        code: "NOT_IMPLEMENTED",
        message: "Not implemented",
      };

      return reply.code(501).send(response);
    },
  );
};

export default todosRoutes;
