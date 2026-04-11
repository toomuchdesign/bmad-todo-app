import { useCallback, useRef, useState } from "react";

import styles from "./App.module.css";
import { AddTodoForm } from "./components/AddTodoForm";
import { GlobalErrorBanner } from "./components/GlobalErrorBanner";
import { TodoList } from "./components/TodoList";
import { useAuth } from "./hooks/useAuth";
import { useTodos } from "./hooks/useTodos";

function AuthGate({
  onRegister,
}: {
  onRegister: (data: {
    email: string;
    password: string;
    name: string;
  }) => Promise<void>;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleCreateUser(): Promise<void> {
    setLoading(true);
    setError(null);
    try {
      await onRegister({
        email: `user-${crypto.randomUUID()}@local.dev`,
        password: crypto.randomUUID(),
        name: `User ${crypto.randomUUID().slice(0, 8)}`,
      });
    } catch {
      setError("Couldn't create user. Please try again.");
      setLoading(false);
    }
  }

  return (
    <main className={styles.app}>
      <h1 className={styles.title}>Todos</h1>
      {error && <p role="alert">{error}</p>}
      <button type="button" onClick={handleCreateUser} disabled={loading}>
        {loading ? "Creating\u2026" : "Create user & start"}
      </button>
    </main>
  );
}

function TodoApp({
  token,
  onUnauthorized,
  onLogout,
}: {
  token: string;
  onUnauthorized: () => void;
  onLogout: () => void;
}) {
  const { todos, loading, error, retry, createTodo, updateTodo, deleteTodo } =
    useTodos({ token, onUnauthorized });

  const addTitleInputRef = useRef<HTMLInputElement>(null);
  const [focusTodoId, setFocusTodoId] = useState<string | undefined>();

  const handleDelete = useCallback(
    async (id: string): Promise<boolean> => {
      const index = todos.findIndex((t) => t.id === id);
      const nextTodo = todos[index + 1] ?? todos[index - 1];
      const success = await deleteTodo(id);
      if (success) {
        if (nextTodo) {
          setFocusTodoId(nextTodo.id);
        } else {
          addTitleInputRef.current?.focus();
        }
      }
      return success;
    },
    [todos, deleteTodo],
  );

  return (
    <main className={styles.app}>
      <div className={styles.header}>
        <h1 className={styles.title}>Todos</h1>
        <button type="button" onClick={onLogout}>
          Log out
        </button>
      </div>
      {error && (
        <GlobalErrorBanner message={error} onRetry={retry} loading={loading} />
      )}
      <AddTodoForm onSubmit={createTodo} titleInputRef={addTitleInputRef} />
      <TodoList
        todos={todos}
        loading={loading}
        onUpdate={updateTodo}
        onDelete={handleDelete}
        focusTodoId={focusTodoId}
      />
    </main>
  );
}

function App() {
  const { token, register, logout } = useAuth();

  if (!token) {
    return <AuthGate onRegister={register} />;
  }

  return <TodoApp token={token} onUnauthorized={logout} onLogout={logout} />;
}

export { App };
