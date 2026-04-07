import { useCallback, useRef, useState } from "react";

import styles from "./App.module.css";
import { AddTodoForm } from "./components/AddTodoForm";
import { GlobalErrorBanner } from "./components/GlobalErrorBanner";
import { TodoList } from "./components/TodoList";
import { useTodos } from "./hooks/useTodos";

function App() {
  const { todos, loading, error, retry, createTodo, updateTodo, deleteTodo } =
    useTodos();

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
      <h1 className={styles.title}>Todos</h1>
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

export { App };
