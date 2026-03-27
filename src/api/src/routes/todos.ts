import type { FastifyPluginAsync } from "fastify";

const todosRoutes: FastifyPluginAsync = async (app) => {
  app.get(
    "/todos",
    {
      schema: {
        tags: ["todos"],
        summary: "List todos",
        response: {
          501: {
            type: "object",
            required: ["error"],
            properties: {
              error: { type: "string" },
            },
          },
        },
      },
    },
    async (_request, reply) => {
      return reply.code(501).send({ error: "Not implemented" });
    },
  );
};

export default todosRoutes;
