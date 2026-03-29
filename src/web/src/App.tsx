import styles from "./App.module.css";
import { GlobalErrorBanner } from "./components/GlobalErrorBanner";
import { TodoList } from "./components/TodoList";
import { useTodos } from "./hooks/useTodos";

function App() {
  const { todos, loading, error, retry } = useTodos();

  return (
    <div className={styles.app}>
      <h1 className={styles.title}>Todos</h1>
      {error && <GlobalErrorBanner message={error} onRetry={retry} />}
      <TodoList todos={todos} loading={loading} />
    </div>
  );
}

export default App;
