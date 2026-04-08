import { randomUUID } from "node:crypto";
import type { User } from "shared";
import { runQuery } from "./db.js";

export type SeedUserInput = User;

/**
 * Builds a SeedUserInput with sensible defaults, overridable per-field.
 */
export function makeSeedUser(
  overrides?: Partial<SeedUserInput>,
): SeedUserInput {
  return {
    id: randomUUID(),
    name: "seed user",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

/**
 * Inserts a user row directly in Postgres for integration test setup.
 */
export async function seedUser(input: SeedUserInput): Promise<void> {
  await runQuery(
    `INSERT INTO users (id, name, created_at, updated_at)
     VALUES ($1::uuid, $2::text, $3::timestamptz, $4::timestamptz);`,
    [input.id, input.name, input.createdAt, input.updatedAt],
  );
}
