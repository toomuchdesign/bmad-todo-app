import { MAX_TODO_TEXT_LENGTH, MAX_TODO_TITLE_LENGTH } from "../contracts";

/** Validates trimmed todo title and text, returning an error message or undefined if valid. */
function validateTodoFields({
  title,
  text,
}: {
  title: string;
  text: string;
}): string | undefined {
  if (title.length === 0) {
    return "Title must not be empty.";
  }

  if (title.length > MAX_TODO_TITLE_LENGTH) {
    return `Title must be between 1 and ${MAX_TODO_TITLE_LENGTH} characters.`;
  }

  if (text.length > MAX_TODO_TEXT_LENGTH) {
    return `Description must be ${MAX_TODO_TEXT_LENGTH} characters or fewer.`;
  }

  return undefined;
}

export { validateTodoFields };
