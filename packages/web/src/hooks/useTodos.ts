import { useCallback, useEffect, useState } from "react";
import type { Todo } from "shared";

import type { ApiResponses, TodoUpdatableFields } from "../contracts";
import { type TODO_BY_ID_API_PATH, TODOS_API_PATH } from "../contracts";
import { HttpError, httpClient } from "../utils";
import { useOptimisticUpdate } from "./useOptimisticUpdate";

type UseTodosResult = {
  todos: Todo[];
  loading: boolean;
  error: string | null;
  retry: () => void;
  createTodo: (data: { title: string; text?: string }) => Promise<boolean>;
  updateTodo: (id: string, fields: TodoUpdatableFields) => Promise<boolean>;
  deleteTodo: (id: string) => Promise<boolean>;
};

const GENERIC_ERROR_MESSAGE =
  "Couldn't load todos. Check your connection and try again.";

const GENERIC_MUTATION_ERROR_MESSAGE =
  "Couldn't save changes. Please try again.";

/** Extracts a user-facing message from an error, falling back to a default. */
function extractErrorMessage(err: unknown, fallback: string): string {
  if (err instanceof HttpError && err.message) {
    return err.message;
  }
  return fallback;
}

/** Fetches todos on mount and exposes CRUD with optimistic updates. */
function useTodos({ userId }: { userId: string }): UseTodosResult {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { mutate } = useOptimisticUpdate<Todo, TodoUpdatableFields>({
    getEntity: (id) => todos.find((t) => t.id === id),
    applyUpdate: (id, fields) => {
      setTodos((prev) =>
        prev.map((t) => (t.id === id ? { ...t, ...fields } : t)),
      );
    },
    mutationFn: (id, fields, signal) =>
      httpClient.patch<
        ApiResponses<typeof TODO_BY_ID_API_PATH, "patch">["200"]
      >(`/todos/${id}`, {
        body: fields,
        headers: { "x-user-id": userId },
        signal,
      }),
  });

  const fetchTodos = useCallback(async () => {
    setLoading(true);

    try {
      const data = await httpClient.get<
        ApiResponses<typeof TODOS_API_PATH, "get">["200"]
      >(TODOS_API_PATH, { headers: { "x-user-id": userId } });
      setTodos(data.todos);
      setError(null);
    } catch (err) {
      setTodos([]);
      setError(extractErrorMessage(err, GENERIC_ERROR_MESSAGE));
    }

    setLoading(false);
  }, [userId]);

  useEffect(() => {
    fetchTodos();
  }, [fetchTodos]);

  function retry(): void {
    fetchTodos();
  }

  /** Creates a new todo via POST. Returns true on success, false on failure. */
  async function createTodo({
    title,
    text,
  }: {
    title: string;
    text?: string;
  }): Promise<boolean> {
    setError(null);

    try {
      const created = await httpClient.post<
        ApiResponses<typeof TODOS_API_PATH, "post">["201"]
      >(TODOS_API_PATH, {
        body: { title, ...(text && { text }) },
        headers: { "x-user-id": userId },
      });
      setTodos((prev) => [created, ...prev]);
      return true;
    } catch (err) {
      setError(extractErrorMessage(err, GENERIC_MUTATION_ERROR_MESSAGE));
      return false;
    }
  }

  /** Updates a todo with optimistic update, abort-resend, and rollback. */
  async function updateTodo(
    id: string,
    fields: TodoUpdatableFields,
  ): Promise<boolean> {
    setError(null);

    try {
      const { success } = await mutate(id, fields);
      return success;
    } catch (err) {
      setError(extractErrorMessage(err, GENERIC_MUTATION_ERROR_MESSAGE));
      return false;
    }
  }

  /** Deletes a todo via DELETE. Non-optimistic: removes from state only on success. */
  async function deleteTodo(id: string): Promise<boolean> {
    setError(null);

    try {
      await httpClient.del(`/todos/${id}`, {
        headers: { "x-user-id": userId },
      });
      setTodos((prev) => prev.filter((t) => t.id !== id));
      return true;
    } catch (err) {
      setError(extractErrorMessage(err, GENERIC_MUTATION_ERROR_MESSAGE));
      return false;
    }
  }

  return {
    todos,
    loading,
    error,
    retry,
    createTodo,
    updateTodo,
    deleteTodo,
  };
}

export { useTodos };
