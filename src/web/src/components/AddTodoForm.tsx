import { useEffect, useRef, useState } from "react";
import { MAX_TODO_TEXT_LENGTH } from "../contracts";
import styles from "./AddTodoForm.module.css";

type AddTodoFormProps = {
  onSubmit: (text: string) => Promise<boolean>;
};

/** Form for adding a new todo with inline client-side validation. */
function AddTodoForm({ onSubmit }: AddTodoFormProps) {
  const [text, setText] = useState("");
  const [validationError, setValidationError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [shouldFocus, setShouldFocus] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (shouldFocus) {
      inputRef.current?.focus();
      setShouldFocus(false);
    }
  }, [shouldFocus]);

  async function handleSubmit(
    e: React.FormEvent<HTMLFormElement>,
  ): Promise<void> {
    e.preventDefault();

    const trimmed = text.trim();

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

    setSubmitting(true);
    try {
      const success = await onSubmit(trimmed);

      if (success) {
        setText("");
        setShouldFocus(true);
      }
    } finally {
      setSubmitting(false);
    }
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>): void {
    setText(e.target.value);
    if (validationError) {
      setValidationError(null);
    }
  }

  const inputClassName = validationError
    ? `${styles.input} ${styles.invalid}`
    : styles.input;

  return (
    <form className={styles.form} onSubmit={handleSubmit}>
      <div className={styles.inputWrapper}>
        <input
          ref={inputRef}
          type="text"
          className={inputClassName}
          value={text}
          onChange={handleChange}
          placeholder="What needs to be done?"
          aria-label="New todo text"
          aria-describedby={validationError ? "add-todo-error" : undefined}
          disabled={submitting}
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
