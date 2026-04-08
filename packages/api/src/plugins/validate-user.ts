import { eq } from "drizzle-orm";
import type { FastifyPluginAsync } from "fastify";
import { getDb } from "../db/client.js";
import { users } from "../db/schema.js";

declare module "fastify" {
  interface FastifyRequest {
    userId: string;
  }
}

/**
 * Fastify plugin that validates the x-user-id header on every request
 * in the encapsulated scope. Rejects with 401 if missing or invalid.
 */
const validateUserPlugin: FastifyPluginAsync = async (app) => {
  app.decorateRequest("userId", "");

  app.addHook("preHandler", async (request, reply) => {
    const headerValue = request.headers["x-user-id"];

    if (typeof headerValue !== "string" || headerValue.trim().length === 0) {
      return reply.code(401).send({
        code: "UNAUTHORIZED",
        message: "Valid x-user-id header is required",
      });
    }

    const db = getDb();
    const [user] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.id, headerValue))
      .limit(1);

    if (!user) {
      return reply.code(401).send({
        code: "UNAUTHORIZED",
        message: "Valid x-user-id header is required",
      });
    }

    request.userId = user.id;
  });
};

export { validateUserPlugin };
