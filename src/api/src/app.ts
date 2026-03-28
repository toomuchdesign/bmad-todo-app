import swagger from "@fastify/swagger";
import type { JsonSchemaToTsProvider } from "@fastify/type-provider-json-schema-to-ts";
import Fastify, {
  type FastifyInstance,
  type FastifyServerOptions,
} from "fastify";
import todosRoutes from "./routes/todos.js";

export function buildApp(options: FastifyServerOptions = {}): FastifyInstance {
  const app = Fastify({
    logger: true,
    ...options,
  }).withTypeProvider<JsonSchemaToTsProvider>();

  app.register(swagger, {
    openapi: {
      info: {
        title: "bmad-todo API",
        version: "0.0.0",
      },
    },
  });

  app.get(
    "/openapi.json",
    {
      schema: {
        hide: true,
      },
    },
    async (_request, reply) => {
      return reply.send(app.swagger());
    },
  );

  app.register(todosRoutes);
  return app;
}

export default buildApp;
