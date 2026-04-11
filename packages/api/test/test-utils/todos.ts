import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { todos } from "../../src/db/schema.js";
import { getTestDb } from "./db.js";

type TodoSelect = typeof todos.$inferSelect;

type TodoInsert = typeof todos.$inferInsert;

/** Seed input mirrors the Drizzle insert shape but accepts ISO strings for dates. */
export type SeedTodoInput = Omit<
  TodoInsert,
  "createdAt" | "updatedAt" | "deletedAt"
> & {
  createdAt: Date | string;
  updatedAt: Date | string;
  deletedAt?: Date | string | null;
};

/**
 * Builds a SeedTodoInput with sensible defaults, overridable per-field.
 * Requires userId explicitly — no default user fallback.
 */
export function makeSeedTodo(
  overrides: Partial<Omit<SeedTodoInput, "userId">> & { userId: string },
): SeedTodoInput {
  return {
    id: randomUUID(),
    title: "seed todo",
    text: "",
    completed: false,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

/**
 * Returns a single todo row by ID, or undefined if not found.
 */
export async function findTodoById({
  id,
}: {
  id: string;
}): Promise<TodoSelect | undefined> {
  const db = getTestDb();
  const result = await db.select().from(todos).where(eq(todos.id, id));
  return result[0];
}

function toDate(value: Date | string): Date {
  return typeof value === "string" ? new Date(value) : value;
}

/**
 * Inserts a todo row directly via Drizzle for integration test setup.
 * Type-safe: compile error if a column is added/removed/renamed.
 */
export async function seedTodo(todo: SeedTodoInput): Promise<void> {
  const db = getTestDb();
  await db.insert(todos).values({
    ...todo,
    createdAt: toDate(todo.createdAt),
    updatedAt: toDate(todo.updatedAt),
    deletedAt: todo.deletedAt ? toDate(todo.deletedAt) : null,
  });
}
