import { useEffect, useRef, useState } from "react";

import { validateTodoFields } from "../../utils";
import { Button } from "../atoms";
import styles from "./AddTodoCard.module.css";

type AddTodoCardProps = {
  onSubmit: (data: { title: string; text?: string }) => Promise<boolean>;
  titleInputRef?: React.RefObject<HTMLInputElement | null>;
  /**
   * When true (default), the card renders collapsed (title only) and expands
   * on title focus. When false, the card is always fully expanded.
   */
  expandOnFocus?: boolean;
};

/**
 * Card for adding a new todo. In `expandOnFocus` mode (default) shows only
 * the title input until it receives focus, then reveals the description
 * textarea and footer actions. Collapses on blur if the title is empty.
 */
function AddTodoCard({
  onSubmit,
  titleInputRef,
  expandOnFocus = true,
}: AddTodoCardProps) {
  const [title, setTitle] = useState("");
  const [text, setText] = useState("");
  const [validationError, setValidationError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [shouldFocus, setShouldFocus] = useState(false);
  // When `expandOnFocus` is false the card is always expanded.
  const [isExpanded, setIsExpanded] = useState(!expandOnFocus);
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
    event: React.FormEvent<HTMLFormElement>,
  ): Promise<void> {
    event.preventDefault();

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
        if (expandOnFocus) {
          setIsExpanded(false);
        }
      }
    } finally {
      setSubmitting(false);
    }
  }

  function handleTitleChange(event: React.ChangeEvent<HTMLInputElement>): void {
    setTitle(event.target.value);
    if (validationError) {
      setValidationError(null);
    }
  }

  function handleTextChange(
    event: React.ChangeEvent<HTMLTextAreaElement>,
  ): void {
    setText(event.target.value);
    if (validationError) {
      setValidationError(null);
    }
  }

  function handleTextKeyDown(
    event: React.KeyboardEvent<HTMLTextAreaElement>,
  ): void {
    if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
      event.preventDefault();
      event.currentTarget.form?.requestSubmit();
    }
  }

  function handleTitleFocus(): void {
    if (expandOnFocus) {
      setIsExpanded(true);
    }
  }

  function handleCardBlur(event: React.FocusEvent<HTMLDivElement>): void {
    if (!expandOnFocus) return;
    // Only collapse if focus leaves the entire card
    if (
      event.relatedTarget &&
      event.currentTarget.contains(event.relatedTarget as Node)
    ) {
      return;
    }
    if (!title.trim()) {
      setIsExpanded(false);
      setValidationError(null);
    }
  }

  function handleCancel(): void {
    setTitle("");
    setText("");
    setValidationError(null);
    if (expandOnFocus) {
      setIsExpanded(false);
    }
  }

  const cardClassName = isExpanded
    ? `${styles.card} ${styles.expanded}`
    : styles.card;

  const titleClassName = validationError
    ? `${styles.titleInput} ${styles.invalid}`
    : styles.titleInput;

  return (
    // biome-ignore lint/a11y/noStaticElementInteractions: card-level blur tracks focus-within on the wrapper so the card collapses when focus leaves any inner control
    <div className={cardClassName} onBlur={handleCardBlur}>
      <form onSubmit={handleSubmit}>
        <div className={styles.cardBody}>
          <input
            ref={inputRef}
            type="text"
            className={titleClassName}
            value={title}
            onChange={handleTitleChange}
            onFocus={handleTitleFocus}
            placeholder="What needs to be done?"
            aria-label="New todo title"
            aria-describedby={validationError ? "add-todo-error" : undefined}
            disabled={submitting}
          />
          {isExpanded && (
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
          )}
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
        {isExpanded && (
          <div className={styles.cardFooter}>
            <Button variant="ghost" onClick={handleCancel}>
              Cancel
            </Button>
            <Button
              variant="primary"
              type="submit"
              loading={submitting}
              loadingText={"Adding\u2026"}
            >
              Add
            </Button>
          </div>
        )}
      </form>
    </div>
  );
}

export { AddTodoCard };
