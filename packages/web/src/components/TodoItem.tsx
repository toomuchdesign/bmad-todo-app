import { useEffect, useRef, useState } from "react";
import type { Todo } from "shared";
import type { TodoUpdatableFields } from "../hooks/useTodos";
import { validateTodoFields } from "../utils";
import styles from "./TodoItem.module.css";

type TodoItemProps = {
  todo: Todo;
  onUpdate: (id: string, fields: TodoUpdatableFields) => Promise<boolean>;
  onDelete: (id: string) => Promise<boolean>;
  focusCheckbox?: boolean;
};

type TodoEditState = {
  isEditing: boolean;
  title: string;
  text: string;
  validationError: string | null;
};

const IDLE_EDIT_STATE: TodoEditState = {
  isEditing: false,
  title: "",
  text: "",
  validationError: null,
};

/** Renders a single todo item with inline edit support. */
function TodoItem({ todo, onUpdate, onDelete, focusCheckbox }: TodoItemProps) {
  const [todoEdit, setTodoEdit] = useState<TodoEditState>(IDLE_EDIT_STATE);
  const isSavingRef = useRef(false);
  const isCancelledEditRef = useRef(false);
  const itemRef = useRef<HTMLLIElement>(null);
  const titleInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const checkboxRef = useRef<HTMLInputElement>(null);
  const textButtonRef = useRef<HTMLButtonElement>(null);
  const wasEditingRef = useRef(false);

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

  function enterEditMode(): void {
    if (todo.completed) return;
    isCancelledEditRef.current = false;
    setTodoEdit({
      isEditing: true,
      title: todo.title,
      text: todo.text,
      validationError: null,
    });
  }

  function cancelEdit(): void {
    isCancelledEditRef.current = true;
    setTodoEdit(IDLE_EDIT_STATE);
  }

  async function saveEdit(): Promise<void> {
    if (isSavingRef.current || !todoEdit.isEditing) return;

    const trimmedTitle = todoEdit.title.trim();
    const trimmedText = todoEdit.text.trim();

    const validationError = validateTodoFields({
      title: trimmedTitle,
      text: trimmedText,
    });
    if (validationError) {
      setTodoEdit((prev) => ({ ...prev, validationError }));
      return;
    }

    if (trimmedTitle === todo.title && trimmedText === todo.text) {
      setTodoEdit(IDLE_EDIT_STATE);
      return;
    }

    isSavingRef.current = true;
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
        setTodoEdit(IDLE_EDIT_STATE);
      }
    } finally {
      isSavingRef.current = false;
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
    if (isCancelledEditRef.current) {
      isCancelledEditRef.current = false;
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
    setTodoEdit((prev) => ({
      ...prev,
      title: e.target.value,
      validationError: null,
    }));
  }

  function handleTextChange(e: React.ChangeEvent<HTMLTextAreaElement>): void {
    setTodoEdit((prev) => ({
      ...prev,
      text: e.target.value,
      validationError: null,
    }));
  }

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
        onChange={() => onUpdate(todo.id, { completed: !todo.completed })}
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
