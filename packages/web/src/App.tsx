import styles from "./App.module.css";
import { AddTodoForm } from "./components/AddTodoForm";
import { GlobalErrorBanner } from "./components/GlobalErrorBanner";
import { TodoList } from "./components/TodoList";
import { useTodos } from "./hooks/useTodos";

function App() {
  const { todos, loading, error, retry, createTodo, updateTodo, deleteTodo } =
    useTodos();

  return (
    <div className={styles.app}>
      <h1 className={styles.title}>Todos</h1>
      {error && (
        <GlobalErrorBanner message={error} onRetry={retry} loading={loading} />
      )}
      <AddTodoForm onSubmit={createTodo} />
      <TodoList
        todos={todos}
        loading={loading}
        onUpdate={updateTodo}
        onDelete={deleteTodo}
      />
    </div>
  );
}

export default App;
