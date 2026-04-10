import type { FastifyPluginAsyncJsonSchemaToTs } from "@fastify/type-provider-json-schema-to-ts";
import {
  createTodoInDatabase,
  deleteTodoInDatabase,
  getTodoFromDatabase,
  listTodosFromDatabase,
  updateTodoInDatabase,
} from "../../db/todos.js";
import { jwtAuthPlugin } from "../../plugins/jwt-auth.js";
import {
  deleteTodosRouteSchema,
  getTodosRouteSchema,
  patchTodosRouteSchema,
  postTodosRouteSchema,
} from "./schemas.js";

const todosRoutes: FastifyPluginAsyncJsonSchemaToTs = async (app) => {
  await jwtAuthPlugin(app, {});

  app.get(
    "/todos",
    {
      schema: getTodosRouteSchema,
    },
    async (request, reply) => {
      const todos = await listTodosFromDatabase({ userId: request.userId });

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
        text: text?.trim(),
        userId: request.userId,
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

      // No fields to update — return current state without writing to DB
      const hasUpdates =
        title !== undefined || text !== undefined || completed !== undefined;
      if (!hasUpdates) {
        const existing = await getTodoFromDatabase({
          id,
          userId: request.userId,
        });
        if (!existing) {
          return reply
            .code(404)
            .send({ code: "NOT_FOUND", message: "Todo not found" });
        }
        return reply.code(200).send(existing);
      }

      const todo = await updateTodoInDatabase({
        id,
        userId: request.userId,
        title: title?.trim(),
        text: text?.trim(),
        completed,
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

      const deleted = await deleteTodoInDatabase({
        id,
        userId: request.userId,
      });

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
