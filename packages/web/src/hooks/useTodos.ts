import { useCallback, useEffect, useRef, useState } from "react";
import type { Todo } from "shared";
import type { ApiResponses, TodoUpdatableFields } from "../contracts";
import { type TODO_BY_ID_API_PATH, TODOS_API_PATH } from "../contracts";
import { HttpError, httpClient } from "../utils";

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

/** Fetches todos on mount and exposes loading/error state with retry. */
function useTodos(): UseTodosResult {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Accumulated dirty fields per todo ID, not yet confirmed by the server
  const pendingFields = useRef<Map<string, TodoUpdatableFields>>(new Map());
  // Last server-confirmed state per todo ID, used for rollback on failure
  const snapshots = useRef<Map<string, Todo>>(new Map());
  // In-flight mutation controller per todo ID, aborted when a newer mutation supersedes
  const mutationControllers = useRef<Map<string, AbortController>>(new Map());

  /** Aborts existing controller for `id`, creates and stores a new one. */
  function abortAndReplace(id: string): AbortController {
    const existing = mutationControllers.current.get(id);
    if (existing) existing.abort();
    const controller = new AbortController();
    mutationControllers.current.set(id, controller);
    return controller;
  }

  /** Removes the controller entry for `id` only if it still owns the slot (avoids deleting a superseding controller). */
  function clearController(id: string, controller: AbortController): void {
    if (mutationControllers.current.get(id) === controller) {
      mutationControllers.current.delete(id);
    }
  }

  const fetchTodos = useCallback(async () => {
    setLoading(true);

    try {
      const data =
        await httpClient.get<ApiResponses<typeof TODOS_API_PATH, "get">["200"]>(
          TODOS_API_PATH,
        );
      setTodos(data.todos);
      setError(null);
    } catch (err) {
      setError(extractErrorMessage(err, GENERIC_ERROR_MESSAGE));
    }

    setLoading(false);
  }, []);

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
      >(TODOS_API_PATH, { body: { title, ...(text && { text }) } });
      setTodos((prev) => [created, ...prev]);
      return true;
    } catch (err) {
      setError(extractErrorMessage(err, GENERIC_MUTATION_ERROR_MESSAGE));
      return false;
    }
  }

  /** Updates a todo with optimistic update, abort-resend with merged fields, and rollback on failure. */
  async function updateTodo(
    id: string,
    fields: TodoUpdatableFields,
  ): Promise<boolean> {
    setError(null);

    // Take snapshot before first optimistic update in a sequence
    setTodos((prev) => {
      const currentTodo = prev.find((t) => t.id === id);
      if (currentTodo && !snapshots.current.has(id)) {
        snapshots.current.set(id, { ...currentTodo });
      }
      return prev;
    });

    // Merge new fields into accumulated pending fields
    const newPendingFields = { ...pendingFields.current.get(id), ...fields };
    pendingFields.current.set(id, newPendingFields);

    // Optimistic update
    setTodos((prev) =>
      prev.map((t) => (t.id === id ? { ...t, ...newPendingFields } : t)),
    );

    // Abort previous in-flight request for same id, create new controller
    const controller = abortAndReplace(id);

    function rollback(message: string): void {
      const snap = snapshots.current.get(id);
      if (snap) {
        setTodos((prev) => prev.map((t) => (t.id === id ? snap : t)));
      }
      pendingFields.current.delete(id);
      snapshots.current.delete(id);
      setError(message);
    }

    try {
      const updated = await httpClient.patch<
        ApiResponses<typeof TODO_BY_ID_API_PATH, "patch">["200"]
      >(`/todos/${id}`, { body: newPendingFields, signal: controller.signal });

      setTodos((prev) => prev.map((t) => (t.id === id ? updated : t)));
      pendingFields.current.delete(id);
      snapshots.current.delete(id);
      clearController(id, controller);
      return true;
    } catch (err) {
      if (controller.signal.aborted) {
        // Superseding request owns state — exit silently
        return false;
      }
      rollback(extractErrorMessage(err, GENERIC_MUTATION_ERROR_MESSAGE));
      clearController(id, controller);
      return false;
    }
  }

  /** Deletes a todo via DELETE. Non-optimistic: removes from state only on success. */
  async function deleteTodo(id: string): Promise<boolean> {
    setError(null);

    try {
      await httpClient.del(`/todos/${id}`);
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
