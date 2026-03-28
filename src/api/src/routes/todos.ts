import type { FastifyPluginAsyncJsonSchemaToTs } from "@fastify/type-provider-json-schema-to-ts";
import { createTodoInDatabase, listTodosFromDatabase } from "../db/todos.js";
import { getTodosRouteSchema, postTodosRouteSchema } from "./schemas.js";

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
};

export default todosRoutes;
