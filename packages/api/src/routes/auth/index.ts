import type { FastifyPluginAsyncJsonSchemaToTs } from "@fastify/type-provider-json-schema-to-ts";
import * as argon2 from "argon2";
import {
  createAuthUser,
  getUserByEmail,
  mapUserRowToApiUser,
} from "../../db/users.js";
import {
  postLoginRouteSchema,
  postLogoutRouteSchema,
  postRegisterRouteSchema,
} from "./schemas.js";

const JWT_EXPIRY = "7d";

/**
 * Auth routes — register, login, logout.
 * These routes are NOT wrapped by jwtAuthPlugin so unauthenticated users can access them.
 */
const authRoutes: FastifyPluginAsyncJsonSchemaToTs = async (app) => {
  app.post(
    "/auth/register",
    { schema: postRegisterRouteSchema },
    async (request, reply) => {
      const { email, password, name } = request.body;

      // Check if email is already registered
      const existing = await getUserByEmail({ email });
      if (existing) {
        return reply.code(409).send({
          code: "CONFLICT",
          message: "Email is already registered",
        });
      }

      const passwordHash = await argon2.hash(password);
      const user = await createAuthUser({
        email,
        passwordHash,
        name: name.trim(),
      });

      const token = app.jwt.sign(
        { userId: user.id },
        { expiresIn: JWT_EXPIRY },
      );

      return reply.code(201).send({ user, token });
    },
  );

  app.post(
    "/auth/login",
    { schema: postLoginRouteSchema },
    async (request, reply) => {
      const { email, password } = request.body;

      const userRow = await getUserByEmail({ email });
      if (!userRow) {
        return reply.code(401).send({
          code: "UNAUTHORIZED",
          message: "Invalid email or password",
        });
      }

      const passwordValid = await argon2.verify(userRow.passwordHash, password);
      if (!passwordValid) {
        return reply.code(401).send({
          code: "UNAUTHORIZED",
          message: "Invalid email or password",
        });
      }

      const token = app.jwt.sign(
        { userId: userRow.id },
        { expiresIn: JWT_EXPIRY },
      );

      const user = mapUserRowToApiUser(userRow);

      return reply.code(200).send({ user, token });
    },
  );

  app.post(
    "/auth/logout",
    { schema: postLogoutRouteSchema },
    async (_request, reply) => {
      // Token-based auth: logout is a client-side concern (discard the token).
      return reply.code(204).send(null);
    },
  );
};

export { authRoutes };
