import { randomUUID } from "node:crypto";
import { users } from "../../src/db/schema.js";
import { getTestDb } from "./db.js";

type UserInsert = typeof users.$inferInsert;

/** Seed input mirrors the Drizzle insert shape but accepts ISO strings for dates. */
export type SeedUserInput = Omit<UserInsert, "createdAt" | "updatedAt"> & {
  createdAt: Date | string;
  updatedAt: Date | string;
};

/**
 * Builds a SeedUserInput with sensible defaults, overridable per-field.
 */
export function makeSeedUser(
  overrides?: Partial<SeedUserInput>,
): SeedUserInput {
  return {
    id: randomUUID(),
    name: "seed user",
    email: `${randomUUID()}@test.local`,
    passwordHash: "test-hash-not-for-verification",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

function toDate(value: Date | string): Date {
  return typeof value === "string" ? new Date(value) : value;
}

/**
 * Inserts a user row directly via Drizzle for integration test setup.
 * Type-safe: compile error if a column is added/removed/renamed.
 */
export async function seedUser(input: SeedUserInput): Promise<void> {
  const db = getTestDb();
  await db.insert(users).values({
    ...input,
    createdAt: toDate(input.createdAt),
    updatedAt: toDate(input.updatedAt),
  });
}
