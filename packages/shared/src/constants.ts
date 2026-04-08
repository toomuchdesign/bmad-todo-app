export const MAX_TODO_TITLE_LENGTH = 100;
export const MAX_TODO_TEXT_LENGTH = 500;

/**
 * Hard-coded user ID used as the implicit owner of all todos.
 * Seeded into the users table on every DB reset.
 * Needed because the API requires x-user-id on every /todos request
 * but there is no authentication yet — the web client sends this value
 * as a stand-in until real login is implemented.
 */
export const DEFAULT_USER_ID = "00000000-0000-4000-8000-000000000001";
export const MAX_USER_NAME_LENGTH = 100;
