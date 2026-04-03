import { useEffect, useRef, useState } from "react";
import { MAX_TODO_TEXT_LENGTH, MAX_TODO_TITLE_LENGTH } from "../contracts";
import styles from "./AddTodoForm.module.css";

type AddTodoFormProps = {
  onSubmit: (data: { title: string; text?: string }) => Promise<boolean>;
};

/** Form for adding a new todo with title input and optional description textarea. */
function AddTodoForm({ onSubmit }: AddTodoFormProps) {
  const [title, setTitle] = useState("");
  const [text, setText] = useState("");
  const [validationError, setValidationError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [shouldFocus, setShouldFocus] = useState(false);
  const titleInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (shouldFocus) {
      titleInputRef.current?.focus();
      setShouldFocus(false);
    }
  }, [shouldFocus]);

  async function handleSubmit(
    e: React.FormEvent<HTMLFormElement>,
  ): Promise<void> {
    e.preventDefault();

    const trimmedTitle = title.trim();
    const trimmedText = text.trim();

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

    setSubmitting(true);
    try {
      const success = await onSubmit({
        title: trimmedTitle,
        ...(trimmedText && { text: trimmedText }),
      });

      if (success) {
        setTitle("");
        setText("");
        setShouldFocus(true);
      }
    } finally {
      setSubmitting(false);
    }
  }

  function handleTitleChange(e: React.ChangeEvent<HTMLInputElement>): void {
    setTitle(e.target.value);
    if (validationError) {
      setValidationError(null);
    }
  }

  function handleTextChange(e: React.ChangeEvent<HTMLTextAreaElement>): void {
    setText(e.target.value);
    if (validationError) {
      setValidationError(null);
    }
  }

  const titleClassName = validationError
    ? `${styles.input} ${styles.invalid}`
    : styles.input;

  return (
    <form className={styles.form} onSubmit={handleSubmit}>
      <div className={styles.inputWrapper}>
        <input
          ref={titleInputRef}
          type="text"
          className={titleClassName}
          value={title}
          onChange={handleTitleChange}
          placeholder="What needs to be done?"
          aria-label="New todo title"
          aria-describedby={validationError ? "add-todo-error" : undefined}
          disabled={submitting}
        />
        <textarea
          className={styles.textarea}
          value={text}
          onChange={handleTextChange}
          placeholder="Add details... (optional)"
          aria-label="New todo description"
          disabled={submitting}
          rows={2}
        />
        {validationError && (
          <p
            id="add-todo-error"
            className={styles.validationError}
            aria-live="polite"
          >
            {validationError}
          </p>
        )}
      </div>
      <button
        type="submit"
        className={styles.submitButton}
        disabled={submitting}
      >
        Add
      </button>
    </form>
  );
}

export { AddTodoForm };
