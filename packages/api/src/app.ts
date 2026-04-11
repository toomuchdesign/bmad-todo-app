import cors from "@fastify/cors";
import fastifyJwt from "@fastify/jwt";
import swagger from "@fastify/swagger";
import swaggerUi from "@fastify/swagger-ui";
import type { JsonSchemaToTsProvider } from "@fastify/type-provider-json-schema-to-ts";
import Fastify, {
  type FastifyInstance,
  type FastifyServerOptions,
} from "fastify";
import { getConfig } from "./config.js";
import { closeDb } from "./db/client.js";
import { errorHandlerPlugin } from "./plugins/error-handler.js";
import { requestIdPlugin } from "./plugins/request-id.js";
import { authRoutes } from "./routes/auth/index.js";
import { todosRoutes } from "./routes/todos/index.js";

export async function buildApp(
  options: FastifyServerOptions = {},
): Promise<FastifyInstance> {
  const app = Fastify({
    logger: true,
    ...options,
  }).withTypeProvider<JsonSchemaToTsProvider>();

  const config = getConfig();

  await app.register(cors, { origin: config.WEB_ORIGIN });

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

  await app.register(fastifyJwt, {
    secret: config.JWT_SECRET,
  });

  app.get("/healthcheck", async () => ({ status: "ok" }));

  app.register(authRoutes);
  app.register(todosRoutes);

  app.addHook("onClose", async () => {
    await closeDb();
  });

  await app.ready();

  return app;
}
