import type { FastifyPluginAsyncJsonSchemaToTs } from "@fastify/type-provider-json-schema-to-ts";
import { createUserInDatabase } from "../../db/users.js";
import { postUsersRouteSchema } from "./schemas.js";

const usersRoutes: FastifyPluginAsyncJsonSchemaToTs = async (app) => {
  app.post(
    "/users",
    {
      schema: postUsersRouteSchema,
    },
    async (request, reply) => {
      const { name } = request.body;

      const user = await createUserInDatabase({ name: name.trim() });

      return reply.code(201).send(user);
    },
  );
};

export { usersRoutes };
