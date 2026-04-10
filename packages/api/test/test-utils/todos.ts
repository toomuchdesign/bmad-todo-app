import { randomUUID } from "node:crypto";
import { DEFAULT_USER_ID } from "shared";
import { todos } from "../../src/db/schema.js";
import { getTestDb, runQuery } from "./db.js";

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
 */
export function makeSeedTodo(
  overrides?: Partial<SeedTodoInput>,
): SeedTodoInput {
  return {
    id: randomUUID(),
    title: "seed todo",
    text: "",
    completed: false,
    userId: DEFAULT_USER_ID,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

/**
 * Drops the todos table to simulate unexpected DB failures.
 */
export async function dropTodosTable(): Promise<void> {
  await runQuery("DROP TABLE IF EXISTS todos;");
}

function toDate(value: Date | string): Date {
  return typeof value === "string" ? new Date(value) : value;
}

/**
 * Inserts a todo row directly via Drizzle for integration test setup.
 * Type-safe: compile error if a column is added/removed/renamed.
 */
export async function seedTodo(input: SeedTodoInput): Promise<void> {
  const db = getTestDb();
  await db.insert(todos).values({
    ...input,
    createdAt: toDate(input.createdAt),
    updatedAt: toDate(input.updatedAt),
    deletedAt: input.deletedAt ? toDate(input.deletedAt) : null,
  });
}
