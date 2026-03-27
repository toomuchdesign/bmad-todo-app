import type { FastifyPluginAsync } from "fastify";

const todosRoutes: FastifyPluginAsync = async (app) => {
  app.get("/todos", async (_request, reply) => {
    return reply.code(501).send({ error: "Not implemented" });
  });
};

export default todosRoutes;
