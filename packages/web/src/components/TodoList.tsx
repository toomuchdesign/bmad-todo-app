import type { Todo } from "shared";
import { TodoItem } from "./TodoItem";
import styles from "./TodoList.module.css";

type TodoListProps = {
  todos: Todo[];
  loading: boolean;
  onUpdateText: (id: string, text: string) => Promise<boolean>;
  onToggleCompletion: (id: string) => Promise<boolean>;
  onDelete: (id: string) => Promise<boolean>;
  pendingActions: Record<string, string>;
};

/** Renders loading, empty, or populated todo list states. */
function TodoList({
  todos,
  loading,
  onUpdateText,
  onToggleCompletion,
  onDelete,
  pendingActions,
}: TodoListProps) {
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
          onUpdateText={onUpdateText}
          onToggleCompletion={onToggleCompletion}
          onDelete={onDelete}
          pendingAction={pendingActions[todo.id] ?? null}
        />
      ))}
    </ul>
  );
}

export { TodoList };
