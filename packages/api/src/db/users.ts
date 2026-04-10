import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import type { User } from "shared";
import { getDb } from "./client.js";
import { users } from "./schema.js";

type UserRow = typeof users.$inferSelect;

function toIsoDateTimeString(value: Date): string {
  return value.toISOString();
}

/**
 * Maps a DB user row to the public API shape, stripping passwordHash.
 */
export function mapUserRowToApiUser(row: UserRow): User {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    createdAt: toIsoDateTimeString(row.createdAt),
    updatedAt: toIsoDateTimeString(row.updatedAt),
  };
}

/**
 * Looks up a user by email. Returns the full DB row (including passwordHash)
 * for credential verification, or undefined if not found.
 */
export async function getUserByEmail({
  email,
}: {
  email: string;
}): Promise<UserRow | undefined> {
  const db = getDb();

  const [row] = await db
    .select()
    .from(users)
    .where(eq(users.email, email.toLowerCase()))
    .limit(1);

  return row;
}

/**
 * Creates a user with real auth credentials (email + argon2 hash).
 * Used by the POST /auth/register route.
 */
export async function createAuthUser({
  email,
  passwordHash,
  name,
}: {
  email: string;
  passwordHash: string;
  name: string;
}): Promise<User> {
  const db = getDb();
  const now = new Date();

  const [row] = await db
    .insert(users)
    .values({
      id: randomUUID(),
      name,
      email: email.toLowerCase(),
      passwordHash,
      createdAt: now,
      updatedAt: now,
    })
    .returning();

  if (!row) {
    throw new Error("User insert did not return a row");
  }

  return mapUserRowToApiUser(row);
}

/**
 * Creates a user with a placeholder email and no real password.
 * Legacy path used by POST /users and test utilities — will be removed
 * once all user creation goes through auth registration (Story 6.3).
 */
export async function createUserInDatabase({
  name,
}: {
  name: string;
}): Promise<User> {
  const db = getDb();
  const now = new Date();

  const [row] = await db
    .insert(users)
    .values({
      id: randomUUID(),
      name,
      email: `${randomUUID()}@placeholder.local`,
      passwordHash: "no-auth",
      createdAt: now,
      updatedAt: now,
    })
    .returning();

  if (!row) {
    throw new Error("User insert did not return a row");
  }

  return mapUserRowToApiUser(row);
}
