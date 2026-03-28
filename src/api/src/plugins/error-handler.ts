import type { ApiErrorResponse } from "@bmad-todo/shared";
import type { FastifyPluginAsync } from "fastify";

const errorHandlerPlugin: FastifyPluginAsync = async (app) => {
  app.setErrorHandler((error, request, reply) => {
    request.log.error(error);

    const response: ApiErrorResponse = {
      code: "INTERNAL_ERROR",
      message: "Internal server error",
      requestId: request.requestId,
    };

    return reply.code(500).send(response);
  });
};

export default errorHandlerPlugin;
