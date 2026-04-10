import type { FromSchema } from "json-schema-to-ts";

/**
 * Canonical User JSON schema used as the single source of truth
 * for both API validation and TypeScript type inference.
 */
export const userSchema = {
  type: "object",
  required: ["id", "name", "email", "createdAt", "updatedAt"],
  properties: {
    id: { type: "string", format: "uuid" },
    name: { type: "string" },
    email: { type: "string", format: "email" },
    createdAt: { type: "string", format: "date-time" },
    updatedAt: { type: "string", format: "date-time" },
  },
} as const;

/** TypeScript type inferred from `userSchema`. */
export type User = FromSchema<typeof userSchema>;
