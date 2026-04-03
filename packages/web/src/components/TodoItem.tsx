import { useEffect, useRef, useState } from "react";
import type { Todo } from "shared";
import { MAX_TODO_TEXT_LENGTH, MAX_TODO_TITLE_LENGTH } from "../contracts";
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
  const [editTitle, setEditTitle] = useState("");
  const [editText, setEditText] = useState("");
  const [validationError, setValidationError] = useState<string | null>(null);
  const [shouldFocus, setShouldFocus] = useState(false);
  const savingRef = useRef(false);
  const cancelledRef = useRef(false);
  const itemRef = useRef<HTMLLIElement>(null);
  const titleInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (shouldFocus && titleInputRef.current) {
      titleInputRef.current.focus();
      titleInputRef.current.select();
      setShouldFocus(false);
    }
  }, [shouldFocus]);

  function enterEditMode(): void {
    if (todo.completed) return;
    cancelledRef.current = false;
    setEditing(true);
    setEditTitle(todo.title);
    setEditText(todo.text);
    setValidationError(null);
    setShouldFocus(true);
  }

  function cancelEdit(): void {
    cancelledRef.current = true;
    setEditing(false);
    setEditTitle(todo.title);
    setEditText(todo.text);
    setValidationError(null);
  }

  async function saveEdit(): Promise<void> {
    if (savingRef.current) return;

    const trimmedTitle = editTitle.trim();
    const trimmedText = editText.trim();

    if (trimmedTitle.length === 0) {
      setValidationError("Title must not be empty.");
      return;
    }

    if (trimmedTitle.length > MAX_TODO_TITLE_LENGTH) {
      setValidationError(
        `Title must be between 1 and ${MAX_TODO_TITLE_LENGTH} characters.`,
      );
      return;
    }

    if (trimmedText.length > MAX_TODO_TEXT_LENGTH) {
      setValidationError(
        `Description must be ${MAX_TODO_TEXT_LENGTH} characters or fewer.`,
      );
      return;
    }

    if (trimmedTitle === todo.title && trimmedText === todo.text) {
      setEditing(false);
      return;
    }

    savingRef.current = true;
    try {
      const fields: TodoUpdatableFields = {};
      if (trimmedTitle !== todo.title) {
        fields.title = trimmedTitle;
      }
      if (trimmedText !== todo.text) {
        fields.text = trimmedText;
      }

      const success = await onUpdate(todo.id, fields);

      if (success) {
        setEditing(false);
        setValidationError(null);
      }
    } finally {
      savingRef.current = false;
    }
  }

  function handleTitleKeyDown(e: React.KeyboardEvent<HTMLInputElement>): void {
    if (e.key === "Enter") {
      e.preventDefault();
      textareaRef.current?.focus();
    } else if (e.key === "Escape") {
      cancelEdit();
    }
  }

  function handleTextareaKeyDown(
    e: React.KeyboardEvent<HTMLTextAreaElement>,
  ): void {
    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      saveEdit();
    } else if (e.key === "Escape") {
      cancelEdit();
    }
  }

  function handleBlur(e: React.FocusEvent<HTMLElement>): void {
    if (cancelledRef.current) {
      cancelledRef.current = false;
      return;
    }
    // Only save if focus leaves the entire item
    const target = e.relatedTarget;
    if (target && itemRef.current?.contains(target as Node)) {
      return;
    }
    saveEdit();
  }

  function handleTitleChange(e: React.ChangeEvent<HTMLInputElement>): void {
    setEditTitle(e.target.value);
    if (validationError) {
      setValidationError(null);
    }
  }

  function handleTextChange(e: React.ChangeEvent<HTMLTextAreaElement>): void {
    setEditText(e.target.value);
    if (validationError) {
      setValidationError(null);
    }
  }

  const titleClassName = todo.completed
    ? `${styles.text} ${styles.completed}`
    : styles.text;

  const editTitleClassName = validationError
    ? `${styles.editInput} ${styles.invalid}`
    : styles.editInput;

  return (
    <li ref={itemRef} className={styles.item}>
      <input
        type="checkbox"
        className={styles.checkbox}
        checked={todo.completed}
        onChange={() => onUpdate(todo.id, { completed: !todo.completed })}
        aria-label={`${todo.title} – ${todo.completed ? "completed" : "not completed"}`}
      />
      {editing ? (
        <>
          <div className={styles.editWrapper}>
            <input
              ref={titleInputRef}
              type="text"
              className={editTitleClassName}
              value={editTitle}
              onChange={handleTitleChange}
              onKeyDown={handleTitleKeyDown}
              onBlur={handleBlur}
              aria-label="Edit todo title"
              aria-invalid={!!validationError}
            />
          </div>
          <div className={styles.editDescriptionRow}>
            <textarea
              ref={textareaRef}
              className={styles.editTextarea}
              value={editText}
              onChange={handleTextChange}
              onKeyDown={handleTextareaKeyDown}
              onBlur={handleBlur}
              aria-label="Edit todo description"
              placeholder="Add details... (optional)"
              rows={2}
            />
            {validationError && (
              <p className={styles.validationError} aria-live="polite">
                {validationError}
              </p>
            )}
          </div>
        </>
      ) : (
        <>
          {todo.completed ? (
            <span className={titleClassName}>{todo.title}</span>
          ) : (
            <button
              type="button"
              className={`${styles.textButton} ${titleClassName}`}
              onClick={enterEditMode}
            >
              {todo.title}
            </button>
          )}
          {todo.text && <span className={styles.description}>{todo.text}</span>}
        </>
      )}
      <div className={styles.actions}>
        <time className={styles.timestamp} dateTime={todo.createdAt}>
          {new Date(todo.createdAt).toLocaleDateString()}
        </time>
        <button
          type="button"
          className={styles.deleteButton}
          onClick={() => onDelete(todo.id)}
          aria-label={`Delete ${todo.title}`}
        >
          Delete
        </button>
      </div>
    </li>
  );
}

export { TodoItem };
