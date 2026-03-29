import type { Todo } from "@bmad-todo/shared";
import styles from "./TodoList.module.css";

type TodoListProps = {
  todos: Todo[];
  loading: boolean;
};

/** Renders loading, empty, or populated todo list states. */
function TodoList({ todos, loading }: TodoListProps) {
  if (loading) {
    return (
      <div className={styles.stateContainer} aria-busy="true">
        <p className={styles.stateText}>Loading…</p>
      </div>
    );
  }

  if (todos.length === 0) {
    return (
      <div className={styles.stateContainer}>
        <p className={styles.stateText}>No todos yet.</p>
        <p className={styles.stateHint}>Add your first one above.</p>
      </div>
    );
  }

  return (
    <ul className={styles.list}>
      {todos.map((todo) => (
        <li key={todo.id} className={styles.item}>
          <input
            type="checkbox"
            checked={todo.completed}
            disabled
            aria-label={`${todo.text} – ${todo.completed ? "completed" : "not completed"}`}
          />
          <span
            className={
              todo.completed
                ? `${styles.text} ${styles.completed}`
                : styles.text
            }
          >
            {todo.text}
          </span>
          <time className={styles.timestamp} dateTime={todo.createdAt}>
            {new Date(todo.createdAt).toLocaleDateString()}
          </time>
        </li>
      ))}
    </ul>
  );
}

export { TodoList };
