import { randomUUID } from "node:crypto";
import { desc, isNull } from "drizzle-orm";
import type { Todo } from "../definitions/todo.js";
import { getDb } from "./client.js";
import { todos } from "./schema.js";

type TodoRow = typeof todos.$inferSelect;

function toIsoDateTimeString(value: Date): Todo["createdAt"] {
  return value.toISOString() as Todo["createdAt"];
}

function mapTodoRowToApiTodo(row: TodoRow): Todo {
  return {
    id: row.id,
    text: row.text,
    completed: row.completed,
    createdAt: toIsoDateTimeString(row.createdAt),
    updatedAt: toIsoDateTimeString(row.updatedAt),
    deletedAt: row.deletedAt ? toIsoDateTimeString(row.deletedAt) : null,
  };
}

export async function listTodosFromDatabase(): Promise<Todo[]> {
  const db = getDb();

  const rows = await db
    .select()
    .from(todos)
    .where(isNull(todos.deletedAt))
    .orderBy(desc(todos.createdAt));

  return rows.map(mapTodoRowToApiTodo);
}

/**
 * Creates a new todo row and maps it to the API contract shape.
 */
export async function createTodoInDatabase({
  text,
}: {
  text: string;
}): Promise<Todo> {
  const db = getDb();
  const now = new Date();

  const [row] = await db
    .insert(todos)
    .values({
      id: randomUUID(),
      text,
      completed: false,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
    })
    .returning();

  if (!row) {
    throw new Error("Todo insert did not return a row");
  }

  return mapTodoRowToApiTodo(row);
}
