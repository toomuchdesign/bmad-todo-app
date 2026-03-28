import type { FromSchema } from "json-schema-to-ts";

/**
 * Canonical Todo JSON schema used as the API building-block definition.
 */
export const todoSchema = {
  type: "object",
  required: ["id", "text", "completed", "createdAt", "updatedAt"],
  properties: {
    id: { type: "string" },
    text: { type: "string" },
    completed: { type: "boolean" },
    createdAt: { type: "string", format: "date-time" },
    updatedAt: { type: "string", format: "date-time" },
    deletedAt: {
      anyOf: [{ type: "string", format: "date-time" }, { type: "null" }],
    },
  },
} as const;

/**
 * TypeScript type inferred from `todoSchema`.
 */
export type Todo = FromSchema<typeof todoSchema>;
