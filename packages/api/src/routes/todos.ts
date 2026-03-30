import type { FastifyPluginAsyncJsonSchemaToTs } from "@fastify/type-provider-json-schema-to-ts";
import {
  createTodoInDatabase,
  listTodosFromDatabase,
  updateTodoInDatabase,
} from "../db/todos.js";
import {
  getTodosRouteSchema,
  patchTodosRouteSchema,
  postTodosRouteSchema,
} from "./schemas.js";

const todosRoutes: FastifyPluginAsyncJsonSchemaToTs = async (app) => {
  app.get(
    "/todos",
    {
      schema: getTodosRouteSchema,
    },
    async (_request, reply) => {
      const todos = await listTodosFromDatabase();

      return reply.code(200).send({ todos });
    },
  );

  app.post(
    "/todos",
    {
      schema: postTodosRouteSchema,
    },
    async (request, reply) => {
      const todo = await createTodoInDatabase({
        text: request.body.text.trim(),
      });

      return reply.code(201).send(todo);
    },
  );

  app.patch(
    "/todos/:id",
    {
      schema: patchTodosRouteSchema,
    },
    async (request, reply) => {
      const { id } = request.params;
      const { text, completed } = request.body;

      const todo = await updateTodoInDatabase({
        id,
        ...(text !== undefined && { text: text.trim() }),
        ...(completed !== undefined && { completed }),
      });

      if (!todo) {
        return reply.code(404).send({
          code: "NOT_FOUND",
          message: "Todo not found",
          requestId: reply.getHeader("x-request-id") as string,
        });
      }

      return reply.code(200).send(todo);
    },
  );
};

export default todosRoutes;
