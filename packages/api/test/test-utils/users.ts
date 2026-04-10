import { randomUUID } from "node:crypto";
import { eq, like } from "drizzle-orm";
import { users } from "../../src/db/schema.js";
import { getTestDb } from "./db.js";

type UserSelect = typeof users.$inferSelect;

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

/**
 * Returns a single user row by ID, or undefined if not found.
 */
export async function findUserById({
  id,
}: {
  id: string;
}): Promise<UserSelect | undefined> {
  const db = getTestDb();
  const result = await db.select().from(users).where(eq(users.id, id));
  return result[0];
}

/**
 * Deletes all users whose email ends with the given suffix.
 * Callers must delete associated todos first to satisfy the FK constraint.
 */
export async function deleteUsersByEmailSuffix({
  suffix,
}: {
  suffix: string;
}): Promise<void> {
  const db = getTestDb();
  await db.delete(users).where(like(users.email, `%${suffix}`));
}

function toDate(value: Date | string): Date {
  return typeof value === "string" ? new Date(value) : value;
}

/**
 * Inserts a user row directly via Drizzle for integration test setup.
 * Type-safe: compile error if a column is added/removed/renamed.
 */
export async function seedUser(user: SeedUserInput): Promise<void> {
  const db = getTestDb();
  await db.insert(users).values({
    ...user,
    createdAt: toDate(user.createdAt),
    updatedAt: toDate(user.updatedAt),
  });
}
