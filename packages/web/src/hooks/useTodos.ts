import { useCallback, useEffect, useState } from "react";
import type { Todo } from "shared";
import type { ApiResponses } from "../contracts";
import { type TODO_BY_ID_API_PATH, TODOS_API_PATH } from "../contracts";

type UseTodosResult = {
  todos: Todo[];
  loading: boolean;
  error: string | null;
  retry: () => void;
  createTodo: (text: string) => Promise<boolean>;
  updateTodoText: (id: string, text: string) => Promise<boolean>;
  toggleTodoCompletion: (id: string) => Promise<boolean>;
  pendingActions: Record<string, string>;
};

const GENERIC_ERROR_MESSAGE =
  "Couldn't load todos. Check your connection and try again.";

const GENERIC_MUTATION_ERROR_MESSAGE =
  "Couldn't save changes. Please try again.";

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
      const response = await fetch(TODOS_API_PATH);

      if (!response.ok) {
        let message = GENERIC_ERROR_MESSAGE;
        try {
          const body = (await response.json()) as ApiResponses<
            typeof TODOS_API_PATH,
            "get"
          >["default"];
          if (body.message) {
            message = body.message;
          }
        } catch {
          // fall back to generic message
        }
        setError(message);
        setLoading(false);
        return;
      }

      const data = (await response.json()) as ApiResponses<
        typeof TODOS_API_PATH,
        "get"
      >["200"];
      setTodos(data.todos);
      setError(null);
    } catch {
      setError(GENERIC_ERROR_MESSAGE);
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
      const response = await fetch(TODOS_API_PATH, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });

      if (!response.ok) {
        let message = GENERIC_MUTATION_ERROR_MESSAGE;
        try {
          const body = (await response.json()) as ApiResponses<
            typeof TODOS_API_PATH,
            "post"
          >["default"];
          if (body.message) {
            message = body.message;
          }
        } catch {
          // fall back to generic message
        }
        setError(message);
        return false;
      }

      const created = (await response.json()) as ApiResponses<
        typeof TODOS_API_PATH,
        "post"
      >["201"];
      setTodos((prev) => [created, ...prev]);
      return true;
    } catch {
      setError(GENERIC_MUTATION_ERROR_MESSAGE);
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
      const response = await fetch(`/todos/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(fields),
      });

      if (!response.ok) {
        let message = GENERIC_MUTATION_ERROR_MESSAGE;
        try {
          const body = (await response.json()) as ApiResponses<
            typeof TODO_BY_ID_API_PATH,
            "patch"
          >["default"];
          if (body.message) {
            message = body.message;
          }
        } catch {
          // fall back to generic message
        }
        rollback(message);
        clearPending();
        return false;
      }

      const updated = (await response.json()) as ApiResponses<
        typeof TODO_BY_ID_API_PATH,
        "patch"
      >["200"];

      setTodos((prev) => prev.map((t) => (t.id === id ? updated : t)));
      clearPending();
      return true;
    } catch {
      rollback();
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

  return {
    todos,
    loading,
    error,
    retry,
    createTodo,
    updateTodoText,
    toggleTodoCompletion,
    pendingActions,
  };
}

export { useTodos };
