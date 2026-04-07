import type { FastifyPluginAsyncJsonSchemaToTs } from "@fastify/type-provider-json-schema-to-ts";
import {
  createTodoInDatabase,
  deleteTodoInDatabase,
  listTodosFromDatabase,
  updateTodoInDatabase,
} from "../db/todos.js";
import {
  deleteTodosRouteSchema,
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
      const { title, text } = request.body;

      const todo = await createTodoInDatabase({
        title: title.trim(),
        ...(text !== undefined && { text: text.trim() }),
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
      const { title, text, completed } = request.body;

      const todo = await updateTodoInDatabase({
        id,
        ...(title !== undefined && { title: title.trim() }),
        ...(text !== undefined && { text: text.trim() }),
        ...(completed !== undefined && { completed }),
      });

      if (!todo) {
        return reply.code(404).send({
          code: "NOT_FOUND",
          message: "Todo not found",
        });
      }

      return reply.code(200).send(todo);
    },
  );

  app.delete(
    "/todos/:id",
    {
      schema: deleteTodosRouteSchema,
    },
    async (request, reply) => {
      const { id } = request.params;

      const deleted = await deleteTodoInDatabase({ id });

      if (!deleted) {
        return reply.code(404).send({
          code: "NOT_FOUND",
          message: "Todo not found",
        });
      }

      return reply.code(204).send(null);
    },
  );
};

export { todosRoutes };
