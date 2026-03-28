import { desc, isNull } from "drizzle-orm";
import type { Todo } from "../definitions/todo.js";
import { getDb } from "./client.js";
import { todos } from "./schema.js";

function toIsoDateTimeString(value: Date): Todo["createdAt"] {
  return value.toISOString() as Todo["createdAt"];
}

export async function listTodosFromDatabase(): Promise<Todo[]> {
  const db = getDb();

  const rows = await db
    .select()
    .from(todos)
    .where(isNull(todos.deletedAt))
    .orderBy(desc(todos.createdAt));

  return rows.map((row) => ({
    id: row.id,
    text: row.text,
    completed: row.completed,
    createdAt: toIsoDateTimeString(row.createdAt),
    updatedAt: toIsoDateTimeString(row.updatedAt),
    deletedAt: row.deletedAt ? toIsoDateTimeString(row.deletedAt) : null,
  }));
}
