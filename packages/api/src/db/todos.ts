import { randomUUID } from "node:crypto";
import { and, desc, eq, isNull } from "drizzle-orm";
import type { Todo } from "shared";
import { getDb } from "./client.js";
import { todos } from "./schema.js";

type TodoRow = typeof todos.$inferSelect;

function toIsoDateTimeString(value: Date): Todo["createdAt"] {
  return value.toISOString() as Todo["createdAt"];
}

function mapTodoRowToApiTodo(row: TodoRow): Todo {
  return {
    id: row.id,
    title: row.title,
    text: row.text ?? "",
    completed: row.completed,
    createdAt: toIsoDateTimeString(row.createdAt),
    updatedAt: toIsoDateTimeString(row.updatedAt),
    ...(row.deletedAt && {
      deletedAt: toIsoDateTimeString(row.deletedAt),
    }),
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
  title,
  text,
}: {
  title: string;
  text?: string;
}): Promise<Todo> {
  const db = getDb();
  const now = new Date();

  const [row] = await db
    .insert(todos)
    .values({
      id: randomUUID(),
      title,
      text: text || null,
      completed: false,
      createdAt: now,
      updatedAt: now,
    })
    .returning();

  if (!row) {
    throw new Error("Todo insert did not return a row");
  }

  return mapTodoRowToApiTodo(row);
}

/**
 * Updates an existing non-deleted todo and returns the mapped result, or null if not found.
 */
export async function updateTodoInDatabase({
  id,
  title,
  text,
  completed,
}: {
  id: string;
  title?: string;
  text?: string;
  completed?: boolean;
}): Promise<Todo | null> {
  const db = getDb();

  const setClause: Partial<TodoRow> = {
    updatedAt: new Date(),
  };

  if (title !== undefined) {
    setClause.title = title;
  }
  if (text !== undefined) {
    setClause.text = text || null;
  }
  if (completed !== undefined) {
    setClause.completed = completed;
  }

  const [row] = await db
    .update(todos)
    .set(setClause)
    .where(and(eq(todos.id, id), isNull(todos.deletedAt)))
    .returning();

  return row ? mapTodoRowToApiTodo(row) : null;
}

/**
 * Soft-deletes a non-deleted todo by setting deletedAt. Returns true if a row was updated.
 */
export async function deleteTodoInDatabase({
  id,
}: {
  id: string;
}): Promise<boolean> {
  const db = getDb();
  const now = new Date();

  const result = await db
    .update(todos)
    .set({ deletedAt: now, updatedAt: now })
    .where(and(eq(todos.id, id), isNull(todos.deletedAt)))
    .returning();

  return result.length > 0;
}
