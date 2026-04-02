import type { FastifyError, FastifyPluginAsync } from "fastify";
import type { ApiErrorResponse } from "shared";

const errorHandlerPlugin: FastifyPluginAsync = async (app) => {
  app.setErrorHandler((error: FastifyError, request, reply) => {
    /**
     * Handle Fastify's route input schema validation errors
     */
    if (error.validation) {
      const response: ApiErrorResponse = {
        code: "VALIDATION_ERROR",
        message: error.message,
      };

      return reply.code(400).send(response);
    }

    request.log.error(error);

    const response: ApiErrorResponse = {
      code: "INTERNAL_ERROR",
      message: "Internal server error",
    };

    return reply.code(500).send(response);
  });
};

export default errorHandlerPlugin;
