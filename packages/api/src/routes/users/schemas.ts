import { MAX_USER_NAME_LENGTH, userSchema } from "shared";

import type { InferRouteResponses } from "../shared/schemas.js";
import {
  errorResponseSchema,
  requestHeadersSchema,
  responseHeadersSchema,
} from "../shared/schemas.js";

export const postUsersRouteSchema = {
  tags: ["users"],
  summary: "Create user",
  headers: requestHeadersSchema,
  body: {
    type: "object",
    required: ["name"],
    additionalProperties: false,
    properties: {
      name: {
        type: "string",
        minLength: 1,
        maxLength: MAX_USER_NAME_LENGTH,
        pattern: ".*\\S.*",
      },
    },
  },
  response: {
    201: {
      headers: responseHeadersSchema,
      ...userSchema,
    },
    400: errorResponseSchema,
    default: errorResponseSchema,
  },
} as const;

export type PostUsersRouteResponses = InferRouteResponses<
  typeof postUsersRouteSchema.response
>;
