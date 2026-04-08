import { randomUUID } from "node:crypto";
import { and, desc, eq, isNull } from "drizzle-orm";
import type { Todo } from "shared";
import { getDb } from "./client.js";
import { todos } from "./schema.js";

type TodoRow = typeof todos.$inferSelect;

function toIsoDateTimeString(value: Date): Todo["createdAt"] {
  return value.toISOString();
}

function mapTodoRowToApiTodo(row: TodoRow): Todo {
  return {
    id: row.id,
    title: row.title,
    text: row.text ?? "",
    completed: row.completed,
    userId: row.userId,
    createdAt: toIsoDateTimeString(row.createdAt),
    updatedAt: toIsoDateTimeString(row.updatedAt),
    ...(row.deletedAt && {
      deletedAt: toIsoDateTimeString(row.deletedAt),
    }),
  };
}

export async function listTodosFromDatabase({
  userId,
}: {
  userId: string;
}): Promise<Todo[]> {
  const db = getDb();

  const rows = await db
    .select()
    .from(todos)
    .where(and(eq(todos.userId, userId), isNull(todos.deletedAt)))
    .orderBy(desc(todos.createdAt));

  return rows.map(mapTodoRowToApiTodo);
}

/**
 * Creates a new todo row and maps it to the API contract shape.
 */
export async function createTodoInDatabase({
  title,
  text,
  userId,
}: {
  title: string;
  text?: string | undefined;
  userId: string;
}): Promise<Todo> {
  const db = getDb();
  const now = new Date();

  const [row] = await db
    .insert(todos)
    .values({
      id: randomUUID(),
      title,
      text,
      completed: false,
      userId,
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
  userId,
  title,
  text,
  completed,
}: {
  id: string;
  userId: string;
  title?: string | undefined;
  text?: string | undefined;
  completed?: boolean | undefined;
}): Promise<Todo | null> {
  const db = getDb();
  const [row] = await db
    .update(todos)
    .set({
      updatedAt: new Date(),
      title,
      text,
      completed,
    })
    .where(
      and(eq(todos.id, id), eq(todos.userId, userId), isNull(todos.deletedAt)),
    )
    .returning();

  return row ? mapTodoRowToApiTodo(row) : null;
}

/**
 * Soft-deletes a non-deleted todo by setting deletedAt. Returns true if a row was updated.
 */
export async function deleteTodoInDatabase({
  id,
  userId,
}: {
  id: string;
  userId: string;
}): Promise<boolean> {
  const db = getDb();
  const now = new Date();

  const result = await db
    .update(todos)
    .set({ deletedAt: now, updatedAt: now })
    .where(
      and(eq(todos.id, id), eq(todos.userId, userId), isNull(todos.deletedAt)),
    )
    .returning();

  return result.length > 0;
}
