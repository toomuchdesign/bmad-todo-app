import type { FromSchema } from "json-schema-to-ts";

/**
 * Canonical API error response JSON schema used as the single source of truth
 * for both API validation and TypeScript type inference.
 */
export const apiErrorResponseSchema = {
  type: "object",
  required: ["code", "message"],
  properties: {
    code: { type: "string" },
    message: { type: "string" },
  },
} as const;

/** TypeScript type inferred from `apiErrorResponseSchema`. */
export type ApiErrorResponse = FromSchema<typeof apiErrorResponseSchema>;
