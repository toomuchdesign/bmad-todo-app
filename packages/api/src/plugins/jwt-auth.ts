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
 * Fastify plugin that authenticates requests via JWT Bearer token.
 * Falls back to x-user-id header for dual-mode transition (removed in Story 6.3).
 */
export const jwtAuthPlugin: FastifyPluginAsync = async (app) => {
  app.decorateRequest("userId", "");

  app.addHook("onRequest", async (request, reply) => {
    // 1. Try Authorization: Bearer <token>
    const authHeader = request.headers.authorization;
    if (authHeader?.startsWith("Bearer ")) {
      const token = authHeader.slice(7); // "Bearer ".length
      try {
        const decoded = app.jwt.verify<{ userId: string }>(token);
        request.userId = decoded.userId;
        return;
      } catch {
        // Invalid/expired token — fall through to x-user-id fallback
      }
    }

    // 2. Dual-mode fallback: x-user-id header (removed in Story 6.3)
    const headerValue = request.headers["x-user-id"];
    if (typeof headerValue === "string" && headerValue.trim().length > 0) {
      const db = getDb();
      const [user] = await db
        .select({ id: users.id })
        .from(users)
        .where(eq(users.id, headerValue))
        .limit(1);

      if (user) {
        request.userId = user.id;
        return;
      }
    }

    // 3. Neither mechanism succeeded
    return reply.code(401).send({
      code: "UNAUTHORIZED",
      message: "Authentication required",
    });
  });
};
