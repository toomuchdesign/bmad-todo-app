import { randomUUID } from "node:crypto";
import type { User } from "shared";
import { getDb } from "./client.js";
import { users } from "./schema.js";

type UserRow = typeof users.$inferSelect;

function toIsoDateTimeString(value: Date): string {
  return value.toISOString();
}

function mapUserRowToApiUser(row: UserRow): User {
  return {
    id: row.id,
    name: row.name,
    createdAt: toIsoDateTimeString(row.createdAt),
    updatedAt: toIsoDateTimeString(row.updatedAt),
  };
}

/**
 * Creates a new user row and maps it to the API contract shape.
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
      createdAt: now,
      updatedAt: now,
    })
    .returning();

  if (!row) {
    throw new Error("User insert did not return a row");
  }

  return mapUserRowToApiUser(row);
}
