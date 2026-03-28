import swagger from "@fastify/swagger";
import swaggerUi from "@fastify/swagger-ui";
import type { JsonSchemaToTsProvider } from "@fastify/type-provider-json-schema-to-ts";
import Fastify, {
  type FastifyInstance,
  type FastifyServerOptions,
} from "fastify";
import { closeDb } from "./db/client.js";
import errorHandlerPlugin from "./plugins/error-handler.js";
import requestIdPlugin from "./plugins/request-id.js";
import todosRoutes from "./routes/todos.js";

export async function buildApp(
  options: FastifyServerOptions = {},
): Promise<FastifyInstance> {
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

  app.register(swaggerUi, {
    routePrefix: "/documentation",
  });

  await requestIdPlugin(app, {});
  await errorHandlerPlugin(app, {});

  app.register(todosRoutes);

  app.addHook("onClose", async () => {
    await closeDb();
  });

  await app.ready();

  return app;
}

export default buildApp;
