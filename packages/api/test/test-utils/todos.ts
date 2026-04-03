import { randomUUID } from "node:crypto";
import type { Todo } from "shared";
import { runQuery } from "./db.js";

export type SeedTodoInput = Omit<Todo, "deletedAt"> & {
  deletedAt: Exclude<Todo["deletedAt"], undefined>;
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
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    deletedAt: null,
    ...overrides,
  };
}

/**
 * Drops the todos table to simulate unexpected DB failures.
 */
export async function dropTodosTable(): Promise<void> {
  await runQuery("DROP TABLE IF EXISTS todos;");
}

/**
 * Inserts a todo row directly in Postgres for integration test setup.
 */
export async function seedTodo(input: SeedTodoInput): Promise<void> {
  await runQuery(
    `INSERT INTO todos (id, title, text, completed, created_at, updated_at, deleted_at)
     VALUES ($1::uuid, $2::text, $3::text, $4::boolean, $5::timestamptz, $6::timestamptz, $7::timestamptz);`,
    [
      input.id,
      input.title,
      input.text || null,
      input.completed,
      input.createdAt,
      input.updatedAt,
      input.deletedAt,
    ],
  );
}
