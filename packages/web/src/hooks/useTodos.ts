import { useCallback, useEffect, useState } from "react";
import type { Todo } from "shared";
import type { ApiResponses } from "../contracts";
import { type TODO_BY_ID_API_PATH, TODOS_API_PATH } from "../contracts";
import { HttpError, httpClient } from "../utils";

type UseTodosResult = {
  todos: Todo[];
  loading: boolean;
  error: string | null;
  retry: () => void;
  createTodo: (text: string) => Promise<boolean>;
  updateTodoText: (id: string, text: string) => Promise<boolean>;
  toggleTodoCompletion: (id: string) => Promise<boolean>;
  deleteTodo: (id: string) => Promise<boolean>;
  pendingActions: Record<string, string>;
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
  const [pendingActions, setPendingActions] = useState<Record<string, string>>(
    {},
  );

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
  async function createTodo(text: string): Promise<boolean> {
    setError(null);

    try {
      const created = await httpClient.post<
        ApiResponses<typeof TODOS_API_PATH, "post">["201"]
      >(TODOS_API_PATH, { body: { text } });
      setTodos((prev) => [created, ...prev]);
      return true;
    } catch (err) {
      setError(extractErrorMessage(err, GENERIC_MUTATION_ERROR_MESSAGE));
      return false;
    }
  }

  /**
   * Patches a todo with optimistic update and rollback on failure.
   * Applies `optimisticFields` to state immediately, sends them to the API,
   * and reverts to the previous state if the request fails.
   */
  async function patchTodo({
    id,
    updateFn,
    pendingAction,
  }: {
    id: string;
    updateFn: (currentTodo: Todo) => Partial<Pick<Todo, "text" | "completed">>;
    pendingAction: string;
  }): Promise<boolean> {
    const currentTodo = todos.find((t) => t.id === id);
    if (!currentTodo) return false;

    const snapshot = { ...currentTodo };
    const fields = updateFn(currentTodo);

    setError(null);
    setTodos((prev) =>
      prev.map((t) => (t.id === id ? { ...t, ...fields } : t)),
    );
    setPendingActions((prev) => ({ ...prev, [id]: pendingAction }));

    function clearPending(): void {
      setPendingActions((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
    }

    function rollback(message = GENERIC_MUTATION_ERROR_MESSAGE): void {
      setTodos((prev) => prev.map((t) => (t.id === id ? snapshot : t)));
      setError(message);
    }

    try {
      const updated = await httpClient.patch<
        ApiResponses<typeof TODO_BY_ID_API_PATH, "patch">["200"]
      >(`/todos/${id}`, { body: fields });

      setTodos((prev) => prev.map((t) => (t.id === id ? updated : t)));
      clearPending();
      return true;
    } catch (err) {
      rollback(extractErrorMessage(err, GENERIC_MUTATION_ERROR_MESSAGE));
      clearPending();
      return false;
    }
  }

  /** Updates a todo's text via PATCH with optimistic update and rollback. */
  async function updateTodoText(id: string, text: string): Promise<boolean> {
    return patchTodo({ id, updateFn: () => ({ text }), pendingAction: "edit" });
  }

  /** Toggles a todo's completion via PATCH with optimistic update and rollback. */
  async function toggleTodoCompletion(id: string): Promise<boolean> {
    return patchTodo({
      id,
      updateFn: (currentTodo) => ({ completed: !currentTodo.completed }),
      pendingAction: "toggle",
    });
  }

  /** Deletes a todo via DELETE. Non-optimistic: removes from state only on success. */
  async function deleteTodo(id: string): Promise<boolean> {
    setError(null);
    setPendingActions((prev) => ({ ...prev, [id]: "delete" }));

    function clearPending(): void {
      setPendingActions((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
    }

    try {
      await httpClient.del(`/todos/${id}`);
      setTodos((prev) => prev.filter((t) => t.id !== id));
      clearPending();
      return true;
    } catch (err) {
      setError(extractErrorMessage(err, GENERIC_MUTATION_ERROR_MESSAGE));
      clearPending();
      return false;
    }
  }

  return {
    todos,
    loading,
    error,
    retry,
    createTodo,
    updateTodoText,
    toggleTodoCompletion,
    deleteTodo,
    pendingActions,
  };
}

export { useTodos };
