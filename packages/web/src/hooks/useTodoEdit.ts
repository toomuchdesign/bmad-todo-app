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

/** Manages edit state, validation, and change handlers for a single todo item. */
function useTodoEdit({
  todo,
  onUpdate,
  onDelete,
}: {
  todo: Todo;
  onUpdate: (id: string, fields: TodoUpdatableFields) => Promise<boolean>;
  onDelete: (id: string) => Promise<boolean>;
}) {
  const [todoEdit, setTodoEdit] = useState<TodoEditState>(IDLE_EDIT_STATE);
  const isSavingRef = useRef(false);
  const isCancelledRef = useRef(false);

  function startEdit(): void {
    if (todo.completed) return;
    isCancelledRef.current = false;
    setTodoEdit({
      isEditing: true,
      title: todo.title,
      text: todo.text,
      validationError: null,
    });
  }

  function cancelEdit(): void {
    isCancelledRef.current = true;
    setTodoEdit(IDLE_EDIT_STATE);
  }

  /** Returns true if the cancel flag was set (and resets it). */
  function consumeCancelFlag(): boolean {
    if (isCancelledRef.current) {
      isCancelledRef.current = false;
      return true;
    }
    return false;
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
    consumeCancelFlag,
    toggleCompleted,
    deleteTodo,
    // Change handlers
    handleTitleChange,
    handleTextChange,
  };
}

export type { TodoEditState };
export { useTodoEdit };
