import type { Todo } from "shared";
import type { TodoUpdatableFields } from "../hooks/useTodos";
import { TodoItem } from "./TodoItem";
import styles from "./TodoList.module.css";

type TodoListProps = {
  todos: Todo[];
  loading: boolean;
  onUpdate: (id: string, fields: TodoUpdatableFields) => Promise<boolean>;
  onDelete: (id: string) => Promise<boolean>;
};

/** Renders loading, empty, or populated todo list states. */
function TodoList({ todos, loading, onUpdate, onDelete }: TodoListProps) {
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
        <TodoItem
          key={todo.id}
          todo={todo}
          onUpdate={onUpdate}
          onDelete={onDelete}
        />
      ))}
    </ul>
  );
}

export { TodoList };
