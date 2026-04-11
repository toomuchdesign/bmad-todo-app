import { like } from "drizzle-orm";
import { users } from "../../src/db/schema.js";
import { getTestDb } from "./db.js";

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
