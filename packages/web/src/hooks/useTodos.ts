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

  /** Updates a todo's text via PATCH. Returns true on success, false on failure. */
  async function updateTodoText(id: string, text: string): Promise<boolean> {
    setError(null);
    setPendingActions((prev) => ({ ...prev, [id]: "edit" }));

    function clearPending(): void {
      setPendingActions((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
    }

    try {
      const response = await fetch(`/todos/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
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
        setError(message);
        clearPending();
        return false;
      }

      const updated = (await response.json()) as ApiResponses<
        typeof TODO_BY_ID_API_PATH,
        "patch"
      >["200"];

      setTodos((prev) => prev.map((todo) => (todo.id === id ? updated : todo)));
      clearPending();
      return true;
    } catch {
      setError(GENERIC_MUTATION_ERROR_MESSAGE);
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
    pendingActions,
  };
}

export { useTodos };
