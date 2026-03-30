import { randomUUID } from "node:crypto";
import type { FastifyPluginAsync } from "fastify";

declare module "fastify" {
  interface FastifyRequest {
    requestId: string;
  }
}

const requestIdPlugin: FastifyPluginAsync = async (app) => {
  app.decorateRequest("requestId", "");

  app.addHook("onRequest", async (request, reply) => {
    const inboundRequestId = request.headers["x-request-id"];

    const requestId =
      typeof inboundRequestId === "string" && inboundRequestId.length > 0
        ? inboundRequestId
        : randomUUID();

    request.requestId = requestId;
    reply.header("x-request-id", requestId);
  });
};

export default requestIdPlugin;
