import { screen, within } from "@testing-library/react";

// -- Todo app elements --

/** Title input inside AddTodoForm — where users type a new todo's title. */
const NEW_TODO_TITLE = { role: "textbox" as const, name: "New todo title" };

function getNewTodoTitleInput() {
  return screen.getByRole(NEW_TODO_TITLE.role, { name: NEW_TODO_TITLE.name });
}

function queryNewTodoTitleInput() {
  return screen.queryByRole(NEW_TODO_TITLE.role, { name: NEW_TODO_TITLE.name });
}

/** Submit button in AddTodoForm — creates a new todo from the current input. */
function getAddTodoButton() {
  return screen.getByRole("button", { name: "Add" });
}

// -- Auth header elements --

/** Log out button in AppHeader — visible only when authenticated. */
function getLogoutButton() {
  return screen.getByRole("button", { name: "Log out" });
}

/** Navigation bar in AppHeader — contains Log in / Register buttons when unauthenticated. */
function getAuthNav() {
  return screen.getByRole("navigation");
}

/** A named button inside AppHeader's nav bar — only "Log in" or "Register" exist. */
function getAuthNavButton({ name }: { name: "Log in" | "Register" }) {
  return within(getAuthNav()).getByRole("button", { name });
}

// -- Auth form elements --

/** The login form — identified by its aria-label, used to scope submit-button queries. */
function getLoginForm() {
  return screen.getByRole("form", { name: "Log in" });
}

/** Submit button inside the login form — distinct from the header nav "Log in" button. */
function getLoginSubmitButton() {
  return within(getLoginForm()).getByRole("button", { name: "Log in" });
}

/** Email field — present on both login and register forms. */
const EMAIL_FIELD = "Email";

function getEmailInput() {
  return screen.getByLabelText(EMAIL_FIELD);
}

/** Password field — present on both login and register forms. */
const PASSWORD_FIELD = "Password";

function getPasswordInput() {
  return screen.getByLabelText(PASSWORD_FIELD);
}

function queryPasswordInput() {
  return screen.queryByLabelText(PASSWORD_FIELD);
}

/** Name field — present only on the register form. */
const NAME_FIELD = "Name";

function getNameInput() {
  return screen.getByLabelText(NAME_FIELD);
}

function queryNameInput() {
  return screen.queryByLabelText(NAME_FIELD);
}

export {
  getAddTodoButton,
  getAuthNav,
  getAuthNavButton,
  getEmailInput,
  getLoginForm,
  getLoginSubmitButton,
  getLogoutButton,
  getNameInput,
  getNewTodoTitleInput,
  getPasswordInput,
  queryNameInput,
  queryNewTodoTitleInput,
  queryPasswordInput,
};
