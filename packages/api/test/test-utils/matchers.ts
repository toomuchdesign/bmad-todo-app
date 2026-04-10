import { expect } from "vitest";

/** Matches a UUID v4 string (e.g. `550e8400-e29b-41d4-a716-446655440000`). */
export const ANY_UUID = expect.stringMatching(
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
);

/** Matches an ISO 8601 date-time string (e.g. `2026-01-01T00:00:00.000Z`). */
export const ANY_ISO_DATETIME = expect.stringMatching(
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z$/,
);

/** Matches any string containing an `@` (loose email check for assertions). */
export const ANY_EMAIL = expect.stringMatching(/.+@.+/);
