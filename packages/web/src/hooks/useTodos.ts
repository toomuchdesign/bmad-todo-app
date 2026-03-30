import { useCallback, useEffect, useState } from "react";
import type { Todo } from "shared";
import type { ApiResponses } from "../contracts";
import { TODOS_API_PATH } from "../contracts";

type UseTodosResult = {
  todos: Todo[];
  loading: boolean;
  error: string | null;
  retry: () => void;
  createTodo: (text: string) => Promise<boolean>;
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

  const fetchTodos = useCallback(async () => {
    setLoading(true);
    setError(null);

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
      setLoading(false);
    } catch {
      setError(GENERIC_ERROR_MESSAGE);
      setLoading(false);
    }
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

  return { todos, loading, error, retry, createTodo };
}

export { useTodos };
