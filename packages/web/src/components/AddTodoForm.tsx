import { useEffect, useRef, useState } from "react";
import { validateTodoFields } from "../utils";
import styles from "./AddTodoForm.module.css";

type AddTodoFormProps = {
  onSubmit: (data: { title: string; text?: string }) => Promise<boolean>;
  titleInputRef?: React.RefObject<HTMLInputElement | null>;
};

/** Form for adding a new todo with title input and optional description textarea. */
function AddTodoForm({ onSubmit, titleInputRef }: AddTodoFormProps) {
  const [title, setTitle] = useState("");
  const [text, setText] = useState("");
  const [validationError, setValidationError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [shouldFocus, setShouldFocus] = useState(false);
  const internalRef = useRef<HTMLInputElement>(null);

  // Use external ref if provided, internal otherwise
  const inputRef = titleInputRef ?? internalRef;

  useEffect(() => {
    if (shouldFocus) {
      inputRef.current?.focus();
      setShouldFocus(false);
    }
  }, [shouldFocus, inputRef]);

  async function handleSubmit(
    e: React.FormEvent<HTMLFormElement>,
  ): Promise<void> {
    e.preventDefault();

    const trimmedTitle = title.trim();
    const trimmedText = text.trim();

    const error = validateTodoFields({
      title: trimmedTitle,
      text: trimmedText,
    });
    if (error) {
      setValidationError(error);
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

  function handleTextKeyDown(
    e: React.KeyboardEvent<HTMLTextAreaElement>,
  ): void {
    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
      e.preventDefault();
      e.currentTarget.form?.requestSubmit();
    }
  }

  const titleClassName = validationError
    ? `${styles.input} ${styles.invalid}`
    : styles.input;

  return (
    <form className={styles.form} onSubmit={handleSubmit}>
      <div className={styles.inputWrapper}>
        <input
          ref={inputRef}
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
          onKeyDown={handleTextKeyDown}
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
