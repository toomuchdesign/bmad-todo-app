import type { FastifyPluginAsyncJsonSchemaToTs } from "@fastify/type-provider-json-schema-to-ts";
import { getTodosRouteSchema } from "./schemas.js";

const todosRoutes: FastifyPluginAsyncJsonSchemaToTs = async (app) => {
  app.get(
    "/todos",
    {
      schema: getTodosRouteSchema,
    },
    async (_request, reply) => {
      const response = {
        code: "NOT_IMPLEMENTED",
        message: "Not implemented",
      };

      return reply.code(501).send(response);
    },
  );
};

export default todosRoutes;
