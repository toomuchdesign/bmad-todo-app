import { useRef, useState } from "react";
import type { Todo } from "shared";
import type { TodoUpdatableFields } from "../contracts";
import { validateTodoFields } from "../utils";

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

/** Manages edit state, validation, and event handlers for a single todo item. */
function useTodoEdit({
  todo,
  onUpdate,
  onDelete,
  itemRef,
  textareaRef,
}: {
  todo: Todo;
  onUpdate: (id: string, fields: TodoUpdatableFields) => Promise<boolean>;
  onDelete: (id: string) => Promise<boolean>;
  itemRef: React.RefObject<HTMLLIElement | null>;
  textareaRef: React.RefObject<HTMLTextAreaElement | null>;
}) {
  const [todoEdit, setTodoEdit] = useState<TodoEditState>(IDLE_EDIT_STATE);
  const isSavingRef = useRef(false);
  const isCancelledEditRef = useRef(false);

  function startEdit(): void {
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

  function toggleCompleted(): void {
    onUpdate(todo.id, { completed: !todo.completed });
  }

  function deleteTodo(): void {
    onDelete(todo.id);
  }

  return {
    // State
    todoEdit,
    // Actions
    startEdit,
    saveEdit,
    cancelEdit,
    toggleCompleted,
    deleteTodo,
    // Event handlers (saveEdit is triggered by handleTextareaKeyDown and handleBlur)
    handleTitleKeyDown,
    handleTextareaKeyDown,
    handleBlur,
    handleTitleChange,
    handleTextChange,
  };
}

export type { TodoEditState };
export { useTodoEdit };
