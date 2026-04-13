import { useEffect, useRef } from "react";
import type { Todo } from "shared";
import type { TodoUpdatableFields } from "../contracts";
import { useTodoEdit } from "../hooks/useTodoEdit";
import { formatShortDate } from "../utils";
import { Checkbox } from "./atoms";
import styles from "./TodoItem.module.css";

/**
 * Auto-grow the description textarea so it expands with its content and
 * never shows an internal scrollbar. Resetting to "auto" first lets the
 * height shrink back down when characters are deleted.
 */
function autoResizeTextarea(textarea: HTMLTextAreaElement): void {
  textarea.style.height = "auto";
  textarea.style.height = `${textarea.scrollHeight}px`;
}

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
    saveEdit,
    cancelEdit,
    consumeCancelFlag,
    toggleCompleted,
    deleteTodo,
    handleTitleChange,
    handleTextChange,
  } = useTodoEdit({ todo, onUpdate, onDelete });

  // Manage focus when entering/exiting edit mode
  useEffect(() => {
    const wasEditing = wasEditingRef.current;
    wasEditingRef.current = todoEdit.isEditing;

    if (todoEdit.isEditing && !wasEditing) {
      // Focus the input matching the trigger that entered edit mode
      if (todoEdit.focusTarget === "text") {
        textareaRef.current?.focus();
      } else {
        titleInputRef.current?.focus();
        titleInputRef.current?.select();
      }
    } else if (!todoEdit.isEditing && wasEditing) {
      // Return focus to title button, or checkbox if completed (completed todos render a span, not a button)
      if (textButtonRef.current) {
        textButtonRef.current.focus();
      } else {
        checkboxRef.current?.focus();
      }
    }
  }, [todoEdit.isEditing, todoEdit.focusTarget]);

  // Focus checkbox when signalled by parent (e.g. after sibling delete)
  useEffect(() => {
    if (focusCheckbox) {
      checkboxRef.current?.focus();
    }
  }, [focusCheckbox]);

  // Sync the textarea height when edit mode opens (initial content may span
  // multiple lines). Subsequent keystrokes are handled by the onChange wrapper.
  useEffect(() => {
    if (todoEdit.isEditing && textareaRef.current) {
      autoResizeTextarea(textareaRef.current);
    }
  }, [todoEdit.isEditing]);

  function handleTextareaChange(
    event: React.ChangeEvent<HTMLTextAreaElement>,
  ): void {
    handleTextChange(event);
    autoResizeTextarea(event.currentTarget);
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
    if (consumeCancelFlag()) return;
    // Only save if focus leaves the entire item
    const target = e.relatedTarget;
    if (target && itemRef.current?.contains(target as Node)) {
      return;
    }
    saveEdit();
  }

  const titleClassName = todo.completed
    ? `${styles.text} ${styles.completed}`
    : styles.text;

  const itemClassName = todo.completed
    ? `${styles.item} ${styles.itemCompleted}`
    : styles.item;

  const editTitleClassName = todoEdit.validationError
    ? `${styles.editInput} ${styles.invalid}`
    : styles.editInput;

  return (
    <li ref={itemRef} className={itemClassName}>
      <Checkbox
        ref={checkboxRef}
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
              onChange={handleTextareaChange}
              onKeyDown={handleTextareaKeyDown}
              onBlur={handleBlur}
              aria-label="Edit todo description"
              placeholder="Add details... (optional)"
              rows={1}
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
              onClick={() => startEdit({ focusTarget: "title" })}
            >
              {todo.title}
            </button>
          )}
          {todo.text &&
            (todo.completed ? (
              <span className={styles.description}>{todo.text}</span>
            ) : (
              <button
                type="button"
                className={`${styles.descriptionButton} ${styles.description}`}
                onClick={() => startEdit({ focusTarget: "text" })}
              >
                {todo.text}
              </button>
            ))}
        </>
      )}
      <div className={styles.meta}>
        <time className={styles.date} dateTime={todo.createdAt}>
          {formatShortDate(todo.createdAt)}
        </time>
        <button
          type="button"
          className={styles.deleteButton}
          onClick={deleteTodo}
          aria-label={`Delete ${todo.title}`}
          title="Delete"
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 16 16"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M2 4h12M6 4V2.5a.5.5 0 0 1 .5-.5h3a.5.5 0 0 1 .5.5V4M3 4l.7 10h8.6L13 4M6.5 7v5M9.5 7v5" />
          </svg>
        </button>
      </div>
    </li>
  );
}

export { TodoItem };
