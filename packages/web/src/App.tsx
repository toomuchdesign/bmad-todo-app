import { useCallback, useRef, useState } from "react";

import styles from "./App.module.css";
import { AddTodoForm } from "./components/AddTodoForm";
import { AppHeader } from "./components/AppHeader";
import { GlobalErrorBanner } from "./components/GlobalErrorBanner";
import { LoginForm } from "./components/LoginForm";
import { RegisterForm } from "./components/RegisterForm";
import { TodoList } from "./components/TodoList";
import { useAuth } from "./hooks/useAuth";
import { useTodos } from "./hooks/useTodos";

function TodoApp({
  token,
  onUnauthorized,
}: {
  token: string;
  onUnauthorized: () => void;
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
    <>
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
    </>
  );
}

function App() {
  const { token, login, register, logout } = useAuth();
  const [authView, setAuthView] = useState<"login" | "register">("login");

  return (
    <main className={styles.app}>
      <AppHeader
        authView={token ? "app" : authView}
        onNavigate={setAuthView}
        onLogout={() => {
          logout();
          setAuthView("login");
        }}
      />
      {token ? (
        <TodoApp
          token={token}
          onUnauthorized={() => {
            logout();
            setAuthView("login");
          }}
        />
      ) : authView === "login" ? (
        <LoginForm
          onLogin={login}
          onNavigateRegister={() => setAuthView("register")}
        />
      ) : (
        <RegisterForm
          onRegister={register}
          onNavigateLogin={() => setAuthView("login")}
        />
      )}
    </main>
  );
}

export { App };
