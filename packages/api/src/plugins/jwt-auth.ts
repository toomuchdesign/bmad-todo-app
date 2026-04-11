import type { FastifyPluginAsync } from "fastify";

declare module "fastify" {
  interface FastifyRequest {
    userId: string;
  }
}

/**
 * Fastify plugin that authenticates requests via JWT Bearer token.
 * Rejects with 401 if no valid Authorization header is present.
 */
export const jwtAuthPlugin: FastifyPluginAsync = async (app) => {
  app.decorateRequest("userId", "");

  app.addHook("onRequest", async (request, reply) => {
    const authHeader = request.headers.authorization;
    if (authHeader?.startsWith("Bearer ")) {
      const token = authHeader.slice(7); // "Bearer ".length
      try {
        const decoded = app.jwt.verify(token);
        const userId =
          typeof decoded === "object" && "userId" in decoded && decoded.userId;

        if (typeof userId !== "string" || !userId) {
          throw new Error("invalid token payload");
        }

        request.userId = userId;
        return;
      } catch {
        // Invalid/expired/malformed token — reject below
      }
    }

    return reply.code(401).send({
      code: "UNAUTHORIZED",
      message: "Authentication required",
    });
  });
};
