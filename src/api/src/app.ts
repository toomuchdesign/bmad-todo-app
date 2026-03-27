import Fastify, {
  type FastifyInstance,
  type FastifyServerOptions,
} from "fastify";
import todosRoutes from "./routes/todos";

export function buildApp(options: FastifyServerOptions = {}): FastifyInstance {
  const app = Fastify({
    logger: true,
    ...options,
  });

  app.register(todosRoutes);
  return app;
}

export default buildApp;
