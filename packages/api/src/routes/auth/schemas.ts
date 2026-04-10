import { MAX_USER_NAME_LENGTH, userSchema } from "shared";

import type { InferRouteResponses } from "../shared/schemas.js";
import {
  errorResponseSchema,
  responseHeadersSchema,
} from "../shared/schemas.js";

/** Response shape for register/login: { user, token }. */
const authSuccessResponseSchema = {
  type: "object",
  required: ["user", "token"],
  properties: {
    user: userSchema,
    token: { type: "string" },
  },
} as const;

export const postRegisterRouteSchema = {
  tags: ["auth"],
  summary: "Register a new user",
  body: {
    type: "object",
    required: ["email", "password", "name"],
    additionalProperties: false,
    properties: {
      email: { type: "string", format: "email" },
      password: { type: "string", minLength: 8, maxLength: 128 },
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
      ...authSuccessResponseSchema,
    },
    400: errorResponseSchema,
    409: errorResponseSchema,
    default: errorResponseSchema,
  },
} as const;

export type PostRegisterRouteResponses = InferRouteResponses<
  typeof postRegisterRouteSchema.response
>;

export const postLoginRouteSchema = {
  tags: ["auth"],
  summary: "Log in with email and password",
  body: {
    type: "object",
    required: ["email", "password"],
    additionalProperties: false,
    properties: {
      email: { type: "string", format: "email" },
      password: { type: "string", minLength: 1 },
    },
  },
  response: {
    200: {
      headers: responseHeadersSchema,
      ...authSuccessResponseSchema,
    },
    400: errorResponseSchema,
    401: errorResponseSchema,
    default: errorResponseSchema,
  },
} as const;

export type PostLoginRouteResponses = InferRouteResponses<
  typeof postLoginRouteSchema.response
>;

export const postLogoutRouteSchema = {
  tags: ["auth"],
  summary: "Log out (client discards token)",
  response: {
    204: {
      type: "null",
      description: "No content",
    },
    default: errorResponseSchema,
  },
} as const;

export type PostLogoutRouteResponses = InferRouteResponses<
  typeof postLogoutRouteSchema.response
>;
