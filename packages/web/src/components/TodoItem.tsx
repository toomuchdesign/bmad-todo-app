import { useEffect, useRef, useState } from "react";
import type { Todo } from "shared";
import { MAX_TODO_TEXT_LENGTH } from "../contracts";
import type { TodoUpdatableFields } from "../hooks/useTodos";
import styles from "./TodoItem.module.css";

type TodoItemProps = {
  todo: Todo;
  onUpdate: (id: string, fields: TodoUpdatableFields) => Promise<boolean>;
  onDelete: (id: string) => Promise<boolean>;
};

/** Renders a single todo item with inline edit support. */
function TodoItem({ todo, onUpdate, onDelete }: TodoItemProps) {
  const [editing, setEditing] = useState(false);
  const [editText, setEditText] = useState("");
  const [validationError, setValidationError] = useState<string | null>(null);
  const [shouldFocus, setShouldFocus] = useState(false);
  const savingRef = useRef(false);
  const cancelledRef = useRef(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (shouldFocus && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
      setShouldFocus(false);
    }
  }, [shouldFocus]);

  function enterEditMode(): void {
    if (todo.completed) return;
    cancelledRef.current = false;
    setEditing(true);
    setEditText(todo.text);
    setValidationError(null);
    setShouldFocus(true);
  }

  function cancelEdit(): void {
    cancelledRef.current = true;
    setEditing(false);
    setEditText(todo.text);
    setValidationError(null);
  }

  async function saveEdit(): Promise<void> {
    if (savingRef.current) return;

    const trimmed = editText.trim();

    if (trimmed.length === 0) {
      setValidationError("Todo text must not be empty.");
      return;
    }

    if (trimmed.length > MAX_TODO_TEXT_LENGTH) {
      setValidationError(
        `Todo text must be between 1 and ${MAX_TODO_TEXT_LENGTH} characters.`,
      );
      return;
    }

    if (trimmed === todo.text) {
      setEditing(false);
      return;
    }

    savingRef.current = true;
    try {
      const success = await onUpdate(todo.id, { text: trimmed });

      if (success) {
        setEditing(false);
        setValidationError(null);
      }
    } finally {
      savingRef.current = false;
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>): void {
    if (e.key === "Enter") {
      saveEdit();
    } else if (e.key === "Escape") {
      cancelEdit();
    }
  }

  function handleBlur(): void {
    if (cancelledRef.current) {
      cancelledRef.current = false;
      return;
    }
    saveEdit();
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>): void {
    setEditText(e.target.value);
    if (validationError) {
      setValidationError(null);
    }
  }

  const textClassName = todo.completed
    ? `${styles.text} ${styles.completed}`
    : styles.text;

  const editInputClassName = validationError
    ? `${styles.editInput} ${styles.invalid}`
    : styles.editInput;

  return (
    <li className={styles.item}>
      <input
        type="checkbox"
        className={styles.checkbox}
        checked={todo.completed}
        onChange={() => onUpdate(todo.id, { completed: !todo.completed })}
        aria-label={`${todo.text} – ${todo.completed ? "completed" : "not completed"}`}
      />
      {editing ? (
        <div className={styles.editWrapper}>
          <input
            ref={inputRef}
            type="text"
            className={editInputClassName}
            value={editText}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            onBlur={handleBlur}
            aria-label="Edit todo text"
            aria-invalid={!!validationError}
          />
          {validationError && (
            <p className={styles.validationError} aria-live="polite">
              {validationError}
            </p>
          )}
        </div>
      ) : todo.completed ? (
        <span className={textClassName}>{todo.text}</span>
      ) : (
        <button
          type="button"
          className={`${styles.textButton} ${textClassName}`}
          onClick={enterEditMode}
        >
          {todo.text}
        </button>
      )}
      <time className={styles.timestamp} dateTime={todo.createdAt}>
        {new Date(todo.createdAt).toLocaleDateString()}
      </time>
      <button
        type="button"
        className={styles.deleteButton}
        onClick={() => onDelete(todo.id)}
        aria-label={`Delete ${todo.text}`}
      >
        Delete
      </button>
    </li>
  );
}

export { TodoItem };
