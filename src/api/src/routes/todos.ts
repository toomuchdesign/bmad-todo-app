import type { FastifyPluginAsync } from "fastify";
import { listTodosFromDatabase } from "../db/todos.js";
import { getTodosRouteSchema } from "./schemas.js";

const todosRoutes: FastifyPluginAsync = async (app) => {
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
};

export default todosRoutes;
