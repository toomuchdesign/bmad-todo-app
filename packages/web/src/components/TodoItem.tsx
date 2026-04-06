import { useEffect, useRef } from "react";
import type { Todo } from "shared";
import { useTodoEdit } from "../hooks/useTodoEdit";
import type { TodoUpdatableFields } from "../hooks/useTodos";
import styles from "./TodoItem.module.css";

type TodoItemProps = {
  todo: Todo;
  onUpdate: (id: string, fields: TodoUpdatableFields) => Promise<boolean>;
  onDelete: (id: string) => Promise<boolean>;
  focusCheckbox?: boolean;
};

/** Renders a single todo item with inline edit support. */
function TodoItem({ todo, onUpdate, onDelete, focusCheckbox }: TodoItemProps) {
  const itemRef = useRef<HTMLLIElement>(null);
  const titleInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const checkboxRef = useRef<HTMLInputElement>(null);
  const textButtonRef = useRef<HTMLButtonElement>(null);
  const wasEditingRef = useRef(false);

  const {
    todoEdit,
    startEdit,
    toggleCompleted,
    deleteTodo,
    handleTitleKeyDown,
    handleTextareaKeyDown,
    handleBlur,
    handleTitleChange,
    handleTextChange,
  } = useTodoEdit({ todo, onUpdate, onDelete, itemRef, textareaRef });

  // Manage focus when entering/exiting edit mode
  useEffect(() => {
    const wasEditing = wasEditingRef.current;
    wasEditingRef.current = todoEdit.isEditing;

    if (todoEdit.isEditing && !wasEditing) {
      titleInputRef.current?.focus();
      titleInputRef.current?.select();
    } else if (!todoEdit.isEditing && wasEditing) {
      // Return focus to title button, or checkbox if completed (completed todos render a span, not a button)
      if (textButtonRef.current) {
        textButtonRef.current.focus();
      } else {
        checkboxRef.current?.focus();
      }
    }
  }, [todoEdit.isEditing]);

  // Focus checkbox when signalled by parent (e.g. after sibling delete)
  useEffect(() => {
    if (focusCheckbox) {
      checkboxRef.current?.focus();
    }
  }, [focusCheckbox]);

  const titleClassName = todo.completed
    ? `${styles.text} ${styles.completed}`
    : styles.text;

  const editTitleClassName = todoEdit.validationError
    ? `${styles.editInput} ${styles.invalid}`
    : styles.editInput;

  return (
    <li ref={itemRef} className={styles.item}>
      <input
        ref={checkboxRef}
        type="checkbox"
        className={styles.checkbox}
        checked={todo.completed}
        onChange={toggleCompleted}
        aria-label={`${todo.title} – ${todo.completed ? "completed" : "not completed"}`}
      />
      {todoEdit.isEditing ? (
        <>
          <div className={styles.editWrapper}>
            <input
              ref={titleInputRef}
              type="text"
              className={editTitleClassName}
              value={todoEdit.title}
              onChange={handleTitleChange}
              onKeyDown={handleTitleKeyDown}
              onBlur={handleBlur}
              aria-label="Edit todo title"
              aria-invalid={!!todoEdit.validationError}
            />
          </div>
          <div className={styles.editDescriptionRow}>
            <textarea
              ref={textareaRef}
              className={styles.editTextarea}
              value={todoEdit.text}
              onChange={handleTextChange}
              onKeyDown={handleTextareaKeyDown}
              onBlur={handleBlur}
              aria-label="Edit todo description"
              placeholder="Add details... (optional)"
              rows={2}
            />
            {todoEdit.validationError && (
              <p className={styles.validationError} aria-live="polite">
                {todoEdit.validationError}
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
              ref={textButtonRef}
              type="button"
              className={`${styles.textButton} ${titleClassName}`}
              onClick={startEdit}
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
          onClick={deleteTodo}
          aria-label={`Delete ${todo.title}`}
        >
          Delete
        </button>
      </div>
    </li>
  );
}

export { TodoItem };
