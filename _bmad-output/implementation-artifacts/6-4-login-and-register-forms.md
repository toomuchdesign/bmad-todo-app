# Story 6.4: Login and Register Forms

Status: done

## Story

As a user,
I want real login and register forms with proper validation and navigation,
so that I can create an account, log in with my credentials, and have my session persist across page refreshes.

## Acceptance Criteria

### AC1 — Login screen

**Given** no `auth_token` in `localStorage`
**When** the app loads
**Then** the login screen is shown (default unauthenticated state)
**And** it contains an email field (type="email", required) and a password field (type="password", required)
**And** a "Log in" submit button is visible and enabled

**Given** a user submits the login form with valid credentials
**When** `POST /api/auth/login` returns `200` with `{ user, token }`
**Then** the token is stored in `localStorage("auth_token")` and the todo list is shown

**Given** a user submits the login form with invalid credentials
**When** `POST /api/auth/login` returns `401`
**Then** an inline error message is displayed within the form (`role="alert"`) — NOT via `GlobalErrorBanner`
**And** both fields receive an error styling (border colour `--s-border-error`)

**Given** the login form has been submitted and the request is pending
**Then** the submit button is disabled and shows "Logging in…"

### AC2 — Register screen

**Given** the user navigates to the register screen
**When** the register screen loads
**Then** it contains: name field (type="text", required), email field (type="email", required), password field (type="password", required, min 8 chars)
**And** a "Create account" submit button is visible and enabled

**Given** a user submits the register form successfully
**When** `POST /api/auth/register` returns `201` with `{ user, token }`
**Then** the token is stored and the todo list is shown (auto-logged-in)

**Given** a user submits the register form with an already-registered email
**When** `POST /api/auth/register` returns `409`
**Then** an inline error message is displayed within the form (`role="alert"`)

**Given** the register form has been submitted and the request is pending
**Then** the submit button is disabled and shows "Creating account…"

### AC3 — Navigation between auth screens

**Given** the user is on the login screen
**When** they click "Register" in the header nav
**Then** the register screen is shown
**And** focus moves to the first field (Name) of the register form

**Given** the user is on the register screen
**When** they click "Log in" in the header nav
**Then** the login screen is shown
**And** focus moves to the first field (Email) of the login form

**Given** the user is on the login screen
**Then** a footer link "Don't have an account? Register" is visible and navigates to the register screen

**Given** the user is on the register screen
**Then** a footer link "Already have an account? Log in" is visible and navigates to the login screen

### AC4 — Auth routing

**Given** no `auth_token` in `localStorage`
**When** the app loads
**Then** the login screen is shown (not the register screen or todo list)

**Given** a valid token in `localStorage`
**When** the app loads
**Then** the todo list is shown directly (no login screen)

**Given** the user is authenticated and the todo API returns `401`
**When** any todo API call receives a 401 response
**Then** the token is cleared and the login screen is shown

**Given** the user clicks "Log out"
**When** the logout action completes
**Then** the token is cleared and the login screen is shown

### AC5 — Session persistence

**Given** a valid `auth_token` in `localStorage`
**When** the user refreshes the page
**Then** the todo list renders immediately without going through the login screen

### AC6 — Web component tests

Tests cover: `LoginForm`, `RegisterForm`, and `AppHeader`, plus updated `App.auth.test.tsx`.

**Given** the `LoginForm` component
**When** rendered
**Then** it shows email and password fields with a submit button

**Given** `LoginForm` is submitted with an inline 401 mock
**When** the submit resolves with error
**Then** an inline error is shown (role="alert")

**Given** the `RegisterForm` component
**When** rendered
**Then** it shows name, email, and password fields with a submit button

**Given** `RegisterForm` is submitted with an inline 409 mock
**When** the submit resolves with error
**Then** an inline error is shown (role="alert")

**Given** `AppHeader` with no token
**When** rendered
**Then** it shows "Log in" and "Register" nav links

**Given** `AppHeader` with a token
**When** rendered
**Then** it shows only the "Log out" button (no nav links)

**Given** `App.auth.test.tsx`
**When** updated
**Then** it replaces all references to "Create user & start" with login/logout flow assertions

### AC7 — E2E auth flow

**Given** a new user session
**When** the full auth E2E spec runs
**Then** the sequence covers:
1. App loads → login screen shown
2. Navigate to register screen → fill form → submit → todo list shown
3. Log out → login screen shown
4. Login with existing credentials → todo list shown

## Tasks / Subtasks

- [x] Task 1 — Persistent `AppHeader` component (AC3, AC4, AC6)
  - [x] Create `packages/web/src/components/AppHeader/index.tsx`
  - [x] Create `packages/web/src/components/AppHeader/AppHeader.module.css`
  - [x] Create `packages/web/src/components/AppHeader/AppHeader.test.tsx`
  - [x] Props: `{ authView: 'login' | 'register' | 'app'; onNavigate: (view: 'login' | 'register') => void; onLogout: () => void }`
  - [x] Unauthenticated (login or register view): render "Todos" heading on left + "Log in" and "Register" nav links on right; active link (matching current `authView`) styled with accent colour + underline
  - [x] Authenticated (app view): render "Todos" heading on left + "Log out" ghost button on right
  - [x] Use `margin: 0 var(--s-space-4)` on the header row (matches existing `.header` rule in `App.module.css`)
  - [x] Nav links must be `<button type="button">` (no routing library) — visually styled as links but implemented as buttons for accessibility
  - [x] Write `AppHeader.test.tsx` with scenarios: unauthenticated renders nav links, authenticated renders logout button, active link visually distinguished (has aria-current or class)

- [x] Task 2 — `LoginForm` component (AC1, AC6)
  - [x] Create `packages/web/src/components/LoginForm/index.tsx`
  - [x] Create `packages/web/src/components/LoginForm/LoginForm.module.css`
  - [x] Create `packages/web/src/components/LoginForm/LoginForm.test.tsx`
  - [x] Props: `{ onSuccess: (token: string) => void; onNavigateRegister: () => void }`
  - [x] Form fields: email (type="email", required), password (type="password", required)
  - [x] All fields have associated `<label>` elements (not `aria-label`)
  - [x] Submit button: "Log in"; disabled + "Logging in…" during pending request
  - [x] On submit: call `POST /api/auth/login` using `AUTH_LOGIN_API_PATH` from `contracts.ts`; on success call `onSuccess(token)` where token is from response `{ user, token }`
  - [x] On 401: show inline error in `role="alert"` element: "Incorrect email or password"
  - [x] On other errors: show generic inline error
  - [x] Error fields get `--s-border-error` border styling (add error variant to CSS module)
  - [x] Footer link: "Don't have an account? Register" → calls `onNavigateRegister`
  - [x] Client-side validation: triggers only on submit; required fields; email format; error clears on subsequent input (not on keystroke)
  - [x] Write `LoginForm.test.tsx` — see Dev Notes for scenarios

- [x] Task 3 — `RegisterForm` component (AC2, AC6)
  - [x] Create `packages/web/src/components/RegisterForm/index.tsx`
  - [x] Create `packages/web/src/components/RegisterForm/RegisterForm.module.css`
  - [x] Create `packages/web/src/components/RegisterForm/RegisterForm.test.tsx`
  - [x] Props: `{ onSuccess: (token: string) => void; onNavigateLogin: () => void }`
  - [x] Form fields: name (type="text", required), email (type="email", required), password (type="password", required, minLength=8)
  - [x] All fields have associated `<label>` elements
  - [x] Submit button: "Create account"; disabled + "Creating account…" during pending request
  - [x] On submit: call `POST /api/auth/register` using `AUTH_REGISTER_API_PATH` from `contracts.ts`; on success call `onSuccess(token)`
  - [x] On 409: show inline error: "An account with this email already exists"
  - [x] On other errors: show generic inline error
  - [x] Footer link: "Already have an account? Log in" → calls `onNavigateLogin`
  - [x] Client-side validation: required fields, email format, password min 8 chars
  - [x] Write `RegisterForm.test.tsx` — see Dev Notes for scenarios

- [x] Task 4 — Update `useAuth` to expose `login` publicly (AC1)
  - [x] In `packages/web/src/hooks/useAuth.ts`: add `login` to the return value → `return { token, register, login, logout }`
  - [x] Note: `login` is already implemented and in the return value (see current code: `return { token, register, login, logout }`) — this is already done; just verify it's exposed

- [x] Task 5 — Restructure `App.tsx` (AC1–AC5)
  - [x] Add `authView` state: `const [authView, setAuthView] = useState<'login' | 'register'>('login')`
  - [x] Remove `AuthGate` entirely (it is the temporary component from Story 6.3)
  - [x] Render `<AppHeader>` at the top of EVERY screen (login, register, and authenticated todo list)
  - [x] When `!token`: render `<AppHeader authView={authView} ... />` + conditionally render `<LoginForm>` or `<RegisterForm>` based on `authView`
  - [x] When `token`: render `<AppHeader authView="app" ... />` + `<TodoApp>`
  - [x] Use `login` from `useAuth` as the `onSuccess` callback for both `LoginForm` and `RegisterForm`
  - [x] App structure after refactor:
    ```tsx
    function App() {
      const { token, login, logout } = useAuth();
      const [authView, setAuthView] = useState<'login' | 'register'>('login');

      if (!token) {
        return (
          <main className={styles.app}>
            <AppHeader authView={authView} onNavigate={setAuthView} onLogout={logout} />
            {authView === 'login'
              ? <LoginForm onSuccess={login} onNavigateRegister={() => setAuthView('register')} />
              : <RegisterForm onSuccess={login} onNavigateLogin={() => setAuthView('login')} />
            }
          </main>
        );
      }

      return (
        <main className={styles.app}>
          <AppHeader authView="app" onNavigate={setAuthView} onLogout={logout} />
          <TodoApp token={token} onUnauthorized={logout} />
        </main>
      );
    }
    ```
  - [x] Remove `TodoApp`'s `onLogout` prop (logout is now handled by `AppHeader`)
  - [x] Remove the `<div className={styles.header}>` from `TodoApp` (it's now in `AppHeader`)
  - [x] Remove the "Log out" button from `TodoApp`

- [x] Task 6 — Focus management (AC3)
  - [x] When switching from login → register (via header nav or footer link): focus the Name field in RegisterForm
  - [x] When switching from register → login (via header nav or footer link): focus the Email field in LoginForm
  - [x] Implementation: use `useRef` on first field + `useEffect` that calls `ref.current?.focus()` when the form mounts (or on `authView` change)

- [x] Task 7 — Update `App.auth.test.tsx` (AC6)
  - [x] Replace all "Create user & start" button references with login/register form flow assertions
  - [x] Scenarios to cover:
    - No token → login form shown (not register form, not todo list)
    - With token → todo list shown (not login form)
    - Login form submit success → todo list shown + token in localStorage
    - Login form submit 401 → inline error shown, todo list NOT shown
    - Register navigation via header → register form shown
    - Logout from todo list → login screen shown, token cleared
    - 401 from todo API → login screen shown, token cleared
  - [x] Update mocks: replace `fetchMock.post("/api/auth/register", ...)` with login mock where appropriate

- [x] Task 8 — Add E2E spec for auth flow (AC7)
  - [x] Create `packages/web/e2e/auth-flow.spec.ts`
  - [x] Use `registerTestUser` from `packages/web/e2e/test-utils/auth.ts` to create a dedicated test user in `beforeAll`
  - [x] Test the full journey: no token → login screen → navigate to register → fill & submit → todo list → log out → login screen → fill login form → todo list
  - [x] Ensure the spec is isolated (its own user, own browser context) and parallel-safe
  - [x] See Dev Notes for spec skeleton

- [x] Task 9 — Update `architecture.md` file tree
  - [x] Add `AppHeader/` under `packages/web/src/components/`
  - [x] Add `LoginForm/` under `packages/web/src/components/`
  - [x] Add `RegisterForm/` under `packages/web/src/components/`
  - [x] Remove the inline `AuthGate` note (it is retired)
  - [x] Add `auth-flow.spec.ts` under `packages/web/e2e/`

- [x] Task 10 — Validation gates
  - [x] `npm run type:check` — no errors
  - [x] `npm run biome:check` — no errors (run `npm run biome:fix` if needed)
  - [x] `npm run test:ci` — all tests pass
  - [x] `npm run test:e2e` — all E2E tests pass including the new `auth-flow.spec.ts`

## Dev Notes

### Critical Architecture Note: Bearer Tokens, NOT httpOnly Cookies

The auth strategy ADR (`docs/decisions/adr-auth-strategy.md`) describes httpOnly cookies. **Story 6.1 deviated from this** — the actual implementation uses Bearer tokens in the response body. Follow the ACTUAL implementation:

- API returns `{ user: { id: string }, token: string }` on register/login
- Client stores token in `localStorage("auth_token")`
- Client sends `Authorization: Bearer <token>` on every request
- **Do NOT add `@fastify/cookie` or cookie-related code**

### `useAuth` Hook — Current State

The hook already exists at `packages/web/src/hooks/useAuth.ts`. Current return value:

```ts
return { token, register, login, logout };
```

`login` is already exposed. Use it directly as the `onSuccess` callback for both `LoginForm` and `RegisterForm`:

```tsx
<LoginForm onSuccess={login} ... />
<RegisterForm onSuccess={login} ... />
```

The `register` function in `useAuth` is used only by the old `AuthGate` — it will no longer be called from `App` after Task 5. You can keep it or remove it; since `RegisterForm` makes the API call itself (via `AUTH_REGISTER_API_PATH`) and then calls `onSuccess(token)`, the `useAuth.register` function becomes an unused wrapper. Consider removing it to keep the hook clean — but only if no other caller exists (verify with grep).

### `contracts.ts` — Auth Paths Already Exported

All three auth API paths are already exported from `packages/web/src/contracts.ts`:

```ts
export const AUTH_LOGIN_API_PATH = `${AUTH_API_PREFIX}/login`;    // /api/auth/login
export const AUTH_REGISTER_API_PATH = `${AUTH_API_PREFIX}/register`; // /api/auth/register
export const AUTH_LOGOUT_API_PATH = `${AUTH_API_PREFIX}/logout`;  // /api/auth/logout
```

Import these in `LoginForm` and `RegisterForm` — do NOT hardcode the paths.

### API Response Shape

Both login and register return the same shape:

```ts
// POST /api/auth/login → 200
// POST /api/auth/register → 201
{ user: { id: string; name: string; email: string }, token: string }
```

The `LoginForm` and `RegisterForm` components should call `httpClient.post` (from `packages/web/src/utils`) and extract `token` from the response.

### `httpClient` — How to Use

Import from `packages/web/src/utils`:

```ts
import { httpClient } from "../../utils";

const { token } = await httpClient.post<{ user: { id: string }; token: string }>(
  AUTH_LOGIN_API_PATH,
  { body: { email, password } },
);
```

`httpClient` is a thin wrapper around `fetch` that:
- Injects `Authorization: Bearer <token>` when a token exists (but login/register don't need auth)
- Throws `HttpError` on non-2xx responses — check `err.status === 401` or `err.status === 409`

### Accepted Architectural Deviation: Hook-Owned API Calls

**Decision (2026-04-12):** The forms do not call `httpClient.post` directly. Instead, `useAuth` owns the API calls and exposes `login(credentials) → Promise<AuthResult>` and `register(credentials) → Promise<AuthResult>`. Forms receive these as `onLogin` / `onRegister` props and act on the returned `AuthResult` shape.

This inverts the component responsibility model described in the per-component design sections above (which describe `onSuccess(token)` + direct httpClient usage), but:
- Observable behaviour is identical
- Token storage is centralised in the hook
- Forms remain testable in isolation by mocking the callback

Prefer this pattern for any future auth form components.

### CSS Token System — What to Use

Component CSS modules reference only `--s-*` (semantic) tokens. Key tokens for auth forms:

```css
/* spacing */
--s-space-1  /* 4px */
--s-space-2  /* 8px */
--s-space-4  /* 16px */
--s-space-8  /* 32px */

/* typography */
--s-font-size-sm
--s-font-size-base
--s-font-size-lg

/* colours */
--s-text-primary
--s-text-secondary     /* muted/secondary text */
--s-bg-surface          /* form backgrounds */
--s-border-default
--s-border-error        /* error state borders */
--s-accent              /* active nav link colour */
--s-color-error         /* error text */

/* interactive */
--s-focus-ring          /* focus outline colour */
```

Do not add new tokens. Grow the token vocabulary only if there is genuinely no existing token for the need.

### `AppHeader` Component Design

**File locations:**
- `packages/web/src/components/AppHeader/index.tsx`
- `packages/web/src/components/AppHeader/AppHeader.module.css`
- `packages/web/src/components/AppHeader/AppHeader.test.tsx`

**Props:**
```ts
type AuthView = 'login' | 'register' | 'app';

interface AppHeaderProps {
  authView: AuthView;
  onNavigate: (view: 'login' | 'register') => void;
  onLogout: () => void;
}
```

**Structural requirement** — the header row must use `margin: 0 var(--s-space-4)` (same as the existing `.header` rule in `App.module.css`). This rule must live in `AppHeader.module.css`, not be inherited from `App.module.css`.

**Nav links** must be `<button type="button">` elements (no `<a>` tags, no routing library). Use `aria-current="page"` on the active nav button.

**Active link styling:** The active nav button (matching current `authView`) gets accent colour + underline. Use a CSS class like `.navActive` in the module.

**Log out button styling:** Ghost button (border, no fill). Not the same styling as a nav link.

```tsx
function AppHeader({ authView, onNavigate, onLogout }: AppHeaderProps) {
  return (
    <div className={styles.header}>
      <h1 className={styles.title}>Todos</h1>
      {authView === 'app'
        ? <button type="button" className={styles.logoutButton} onClick={onLogout}>Log out</button>
        : (
          <nav className={styles.nav}>
            <button
              type="button"
              className={authView === 'login' ? styles.navActive : styles.navLink}
              aria-current={authView === 'login' ? 'page' : undefined}
              onClick={() => onNavigate('login')}
            >
              Log in
            </button>
            <button
              type="button"
              className={authView === 'register' ? styles.navActive : styles.navLink}
              aria-current={authView === 'register' ? 'page' : undefined}
              onClick={() => onNavigate('register')}
            >
              Register
            </button>
          </nav>
        )
      }
    </div>
  );
}
```

### `LoginForm` Component Design

**File locations:**
- `packages/web/src/components/LoginForm/index.tsx`
- `packages/web/src/components/LoginForm/LoginForm.module.css`
- `packages/web/src/components/LoginForm/LoginForm.test.tsx`

**Props:**
```ts
interface LoginFormProps {
  onSuccess: (token: string) => void;
  onNavigateRegister: () => void;
}
```

**Form structure:**
```tsx
<form onSubmit={handleSubmit} className={styles.form}>
  <div className={styles.field}>
    <label htmlFor="login-email">Email</label>
    <input id="login-email" type="email" required autoComplete="email" ref={emailRef} />
  </div>
  <div className={styles.field}>
    <label htmlFor="login-password">Password</label>
    <input id="login-password" type="password" required autoComplete="current-password" />
  </div>
  {error && <p role="alert" className={styles.error}>{error}</p>}
  <button type="submit" disabled={loading}>
    {loading ? 'Logging in…' : 'Log in'}
  </button>
  <p className={styles.footer}>
    Don't have an account?{' '}
    <button type="button" onClick={onNavigateRegister}>Register</button>
  </p>
</form>
```

**Error messages:**
- `401` → `"Incorrect email or password"`
- `409` or other → `"Something went wrong. Please try again."`

**Client validation (submit-time only):**
```ts
// In handleSubmit, before API call:
if (!email) { setError("Email is required"); return; }
if (!password) { setError("Password is required"); return; }
// Browser handles email format validation via type="email" + required
```

**Error-clear behaviour:** Error clears on the first `onChange` event after submission — not on keydown, not only on re-submit. This is the accepted pattern ("subsequent input" = first change event).

### `RegisterForm` Component Design

**File locations:**
- `packages/web/src/components/RegisterForm/index.tsx`
- `packages/web/src/components/RegisterForm/RegisterForm.module.css`
- `packages/web/src/components/RegisterForm/RegisterForm.test.tsx`

**Props:**
```ts
interface RegisterFormProps {
  onSuccess: (token: string) => void;
  onNavigateLogin: () => void;
}
```

Three fields: name (text, required), email (email, required), password (password, required, minLength=8).

**Error messages:**
- `409` → `"An account with this email already exists"`
- Other → `"Something went wrong. Please try again."`

### Focus Management Implementation

Focus management is needed when the auth view switches. The cleanest approach is `useEffect` + `useImperativeHandle`, but the simplest is a forwarded ref on the first input:

**In `LoginForm`:**
```tsx
// Expose a focus method so App can focus the first field
const emailRef = useRef<HTMLInputElement>(null);

// Auto-focus on mount
useEffect(() => { emailRef.current?.focus(); }, []);
```

**In `RegisterForm`:**
```tsx
const nameRef = useRef<HTMLInputElement>(null);
useEffect(() => { nameRef.current?.focus(); }, []);
```

Each form auto-focuses its first field on mount. Since `App` conditionally renders one form at a time (unmounts on switch), mounting IS the switch event. No imperative focus API needed.

### `App.tsx` After Refactor

**Retire `AuthGate` entirely** — it's the temporary component from Story 6.3. Remove the function definition.

**Remove `onLogout` from `TodoApp` props** — logout is now handled by `AppHeader`.

**`TodoApp` simplification:**
```tsx
// Before: TodoApp had its own header div with "Log out" button
// After: TodoApp just renders error + form + list
function TodoApp({
  token,
  onUnauthorized,
}: {
  token: string;
  onUnauthorized: () => void;
}) {
  // ... existing state ...
  return (
    <>  {/* Fragment — no wrapper main, that's in App now */}
      {error && <GlobalErrorBanner ... />}
      <AddTodoForm ... />
      <TodoList ... />
    </>
  );
}
```

**Wait** — check whether `TodoApp` currently returns `<main className={styles.app}>` or a fragment. Looking at the current code, `TodoApp` returns `<main className={styles.app}>` wrapping everything. After refactor, `App` renders `<main className={styles.app}>` as the outer wrapper, so `TodoApp` should return a fragment `<>`. The `className={styles.app}` flex-column layout moves to `App`.

Alternatively (simpler approach): keep the `<main>` in `TodoApp` and `AuthGate`-replacements, but `AppHeader` is rendered outside. Use the following structure:

```tsx
function App() {
  const { token, login, logout } = useAuth();
  const [authView, setAuthView] = useState<'login' | 'register'>('login');

  return (
    <main className={styles.app}>
      <AppHeader
        authView={token ? 'app' : authView}
        onNavigate={setAuthView}
        onLogout={logout}
      />
      {token ? (
        <TodoApp token={token} onUnauthorized={logout} />
      ) : authView === 'login' ? (
        <LoginForm onSuccess={login} onNavigateRegister={() => setAuthView('register')} />
      ) : (
        <RegisterForm onSuccess={login} onNavigateLogin={() => setAuthView('login')} />
      )}
    </main>
  );
}
```

This is the cleanest option: single `<main>` in `App`, `AppHeader` always rendered, content below is conditional. `TodoApp` returns a `<>` fragment.

### Tests for New Components

#### `AppHeader.test.tsx`

```ts
describe("AppHeader", () => {
  describe("when authView is 'login'", () => {
    it("renders Log in and Register nav buttons")
    it("marks Log in as active (aria-current='page')")
    it("calls onNavigate('register') when Register is clicked")
  })
  describe("when authView is 'register'", () => {
    it("marks Register as active (aria-current='page')")
    it("calls onNavigate('login') when Log in is clicked")
  })
  describe("when authView is 'app'", () => {
    it("renders the Log out button")
    it("does not render nav links")
    it("calls onLogout when Log out is clicked")
  })
})
```

#### `LoginForm.test.tsx`

```ts
describe("LoginForm", () => {
  describe("when rendered", () => {
    it("shows email and password fields")
    it("shows the Log in submit button")
    it("shows the register navigation link")
  })
  describe("on successful submit", () => {
    it("calls onSuccess with the returned token")
    it("shows loading state during submission")
  })
  describe("on 401 response", () => {
    it("shows 'Incorrect email or password' inline error (role=alert)")
    it("does not call onSuccess")
  })
  describe("on navigation link click", () => {
    it("calls onNavigateRegister")
  })
})
```

#### `RegisterForm.test.tsx`

```ts
describe("RegisterForm", () => {
  describe("when rendered", () => {
    it("shows name, email, and password fields")
    it("shows the Create account submit button")
  })
  describe("on successful submit", () => {
    it("calls onSuccess with the returned token")
  })
  describe("on 409 response", () => {
    it("shows 'An account with this email already exists' inline error (role=alert)")
  })
  describe("on navigation link click", () => {
    it("calls onNavigateLogin")
  })
})
```

#### Updated `App.auth.test.tsx`

Replace the current test scenarios (which test the "Create user & start" `AuthGate`) with:

```ts
describe("App auth routing", () => {
  describe("when no auth token in localStorage", () => {
    it("shows the login form")
    it("does not render the todo list")
  })
  describe("when auth token is present in localStorage", () => {
    beforeEach(() => { localStorage.setItem("auth_token", "test-token"); })
    it("renders the todo list")
    it("does not show the login form")
    it("shows the Log out button in the header")
  })
  describe("on logout", () => {
    beforeEach(() => { localStorage.setItem("auth_token", "test-token"); })
    it("shows the login form after logout and clears the token")
  })
  describe("on 401 from todo API", () => {
    beforeEach(() => { localStorage.setItem("auth_token", "expired-token"); })
    it("clears the token and shows the login form")
  })
  describe("on navigation to register screen", () => {
    it("shows the register form when Register nav button is clicked")
    it("shows the login form when Log in nav button is clicked from register")
  })
})
```

### E2E `auth-flow.spec.ts` Skeleton

```ts
// packages/web/e2e/auth-flow.spec.ts
import { test, expect } from "@playwright/test";
import { registerTestUser } from "./test-utils";

// This spec registers its own user for login tests
let existingUserEmail: string;
let existingUserPassword: string;

test.beforeAll(async ({ request }) => {
  // Create a user we can log into later
  existingUserEmail = `e2e-${crypto.randomUUID()}@test.local`;
  existingUserPassword = crypto.randomUUID();
  // Register via API directly (don't go through UI for setup)
  await request.post("/api/auth/register", {
    data: { email: existingUserEmail, password: existingUserPassword, name: "E2E User" }
  });
});

// No beforeEach token injection — this spec tests the auth UI flow itself
test.beforeEach(async ({ page }) => {
  // Start with no token
  await page.goto("/");
});

test.describe("auth flow", () => {
  test("app loads with login screen when no token", async ({ page }) => {
    await expect(page.getByRole("button", { name: "Log in" })).toBeVisible();
  });

  test("full registration flow → todo list", async ({ page }) => {
    const email = `e2e-reg-${crypto.randomUUID()}@test.local`;
    await page.getByRole("button", { name: "Register" }).click();
    await page.getByLabel("Name").fill("New User");
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Password").fill("securepassword123");
    await page.getByRole("button", { name: "Create account" }).click();
    await expect(page.getByRole("textbox", { name: "New todo title" })).toBeVisible();
  });

  test("logout → login screen", async ({ page }) => {
    // Login first
    await page.getByLabel("Email").fill(existingUserEmail);
    await page.getByLabel("Password").fill(existingUserPassword);
    await page.getByRole("button", { name: "Log in" }).click();
    await expect(page.getByRole("textbox", { name: "New todo title" })).toBeVisible();
    // Now logout
    await page.getByRole("button", { name: "Log out" }).click();
    await expect(page.getByRole("button", { name: "Log in" })).toBeVisible();
  });

  test("login with existing credentials → todo list", async ({ page }) => {
    await page.getByLabel("Email").fill(existingUserEmail);
    await page.getByLabel("Password").fill(existingUserPassword);
    await page.getByRole("button", { name: "Log in" }).click();
    await expect(page.getByRole("textbox", { name: "New todo title" })).toBeVisible();
  });
});
```

Note: The E2E spec does NOT use `page.addInitScript` for token injection — this spec intentionally tests the real auth UI flow. It is parallel-safe because it registers unique users per run.

### Impact on Existing `App.*.test.tsx` Files

The existing App test files (`App.test.tsx`, `App.create-todo.test.tsx`, etc.) all have:
```ts
beforeEach(() => {
  localStorage.setItem("auth_token", "test-token");
  fetchMock.post("/api/auth/logout", 204);
});
```

These remain valid — setting a token in localStorage bypasses the auth forms and renders the todo list directly. No changes needed to these files UNLESS `TodoApp` renders a different wrapper element after refactor (see Task 5 above). If `App.test.tsx` checks for `<main>` landmark, that will still exist — it's just moved from `TodoApp` to `App`.

**Check `App.test.tsx` for assertions that inspect the `TodoApp` header div** — if any test asserts on the "Log out" button (e.g., in `App.auth.test.tsx`), it now checks against `AppHeader` instead. The button text and role remain the same.

### Horizontal Alignment Rule

From the ADR:
- All page-level content aligns to `var(--s-space-4)` (16px) margin from each side
- Header uses `margin: 0 var(--s-space-4)` — this is already in `App.module.css` `.header`
- Auth forms: the `<form>` element uses `margin: 0 var(--s-space-4)`
- Do NOT add padding to `main.app` for horizontal alignment (it would prevent full-width backgrounds)

The `AppHeader` CSS module should include its own `.header` rule with the margin, not rely on `App.module.css`.

### What Replaces `AuthGate`

`AuthGate` (the "Create user & start" button) is removed entirely. It was a temporary placeholder. The new flow:

- Unauthenticated: `App` renders `AppHeader` + `LoginForm` (default) or `RegisterForm` (if user clicked Register)
- `LoginForm` and `RegisterForm` are standalone components in `packages/web/src/components/`

### Visual Reference

See `docs/decisions/adr-auth-ui-layout.md` for the full layout decision and mockup screenshots. Key mockup files:
- `docs/mockups/auth-ui.html` — rendered source of all auth screens using real design tokens
- `docs/mockups/screenshots/auth-ui-login.png` — login screen
- `docs/mockups/screenshots/auth-ui-login-error.png` — login error state
- `docs/mockups/screenshots/auth-ui-register.png` — register screen
- `docs/mockups/screenshots/auth-ui-todo-authenticated.png` — authenticated todo list with new header

**Reference the mockup screenshots** when implementing CSS. The mockups use the real semantic tokens so the visual result should match production.

### Files to Create
- `packages/web/src/components/AppHeader/index.tsx`
- `packages/web/src/components/AppHeader/AppHeader.module.css`
- `packages/web/src/components/AppHeader/AppHeader.test.tsx`
- `packages/web/src/components/LoginForm/index.tsx`
- `packages/web/src/components/LoginForm/LoginForm.module.css`
- `packages/web/src/components/LoginForm/LoginForm.test.tsx`
- `packages/web/src/components/RegisterForm/index.tsx`
- `packages/web/src/components/RegisterForm/RegisterForm.module.css`
- `packages/web/src/components/RegisterForm/RegisterForm.test.tsx`
- `packages/web/e2e/auth-flow.spec.ts`

### Files to Modify
- `packages/web/src/App.tsx` — retire `AuthGate`, add `AppHeader`, restructure to use `LoginForm`/`RegisterForm`, simplify `TodoApp`
- `packages/web/src/App.auth.test.tsx` — replace `AuthGate` test scenarios with login/register form flow tests
- `packages/web/src/hooks/useAuth.ts` — verify `login` is in return value (already is); consider removing `register` if no callers remain
- `_bmad-output/planning-artifacts/architecture.md` — update file tree

### Files to Delete
- None (no files deleted in this story — only `AuthGate` is removed, but it lives inline in `App.tsx`)

### References
- ADR — Auth UI Layout: [docs/decisions/adr-auth-ui-layout.md](docs/decisions/adr-auth-ui-layout.md)
- ADR — Auth Strategy: [docs/decisions/adr-auth-strategy.md](docs/decisions/adr-auth-strategy.md) (**NOTE:** ADR says httpOnly cookies; actual implementation uses Bearer tokens. Follow actual impl.)
- Current `App.tsx`: [packages/web/src/App.tsx](packages/web/src/App.tsx)
- Current `useAuth.ts`: [packages/web/src/hooks/useAuth.ts](packages/web/src/hooks/useAuth.ts)
- Current `App.auth.test.tsx`: [packages/web/src/App.auth.test.tsx](packages/web/src/App.auth.test.tsx)
- Auth API routes: [packages/api/src/routes/auth/index.ts](packages/api/src/routes/auth/index.ts)
- `contracts.ts` (auth paths): [packages/web/src/contracts.ts](packages/web/src/contracts.ts)
- Mockup HTML: [docs/mockups/auth-ui.html](docs/mockups/auth-ui.html)
- `httpClient` utility: [packages/web/src/utils.ts](packages/web/src/utils.ts)
- Existing component pattern: [packages/web/src/components/AddTodoForm/](packages/web/src/components/AddTodoForm/) — follow this folder structure and naming convention
- E2E test-utils auth helper: [packages/web/e2e/test-utils/auth.ts](packages/web/e2e/test-utils/auth.ts)

## Dev Agent Record

### Agent Model Used
Claude Opus 4.6 (1M context)

### Debug Log References
No debug artifacts needed — all tests passed on first or second attempt.

### Completion Notes List
- Created `AppHeader` component with nav links (unauthenticated) / logout button (authenticated), using `aria-current="page"` for active state
- Created `LoginForm` with email/password fields, inline error display (role="alert"), loading state, and footer navigation
- Created `RegisterForm` with name/email/password fields, 409 conflict handling, min 8 char password validation, and footer navigation
- Both forms use `aria-label` on the `<form>` element for accessible scoping in integration tests
- Verified `login` was already exposed from `useAuth`; removed unused `register` function and `AUTH_REGISTER_API_PATH` import from the hook
- Restructured `App.tsx`: removed `AuthGate`, added `authView` state, `AppHeader` rendered on all screens, `TodoApp` simplified to fragment
- Moved `.header` and `.title` CSS rules from `App.module.css` to `AppHeader.module.css`
- Focus management via `useEffect` + `useRef` auto-focusing first field on mount in both forms
- Rewrote `App.auth.test.tsx` with 11 scenarios covering login form, register nav, logout, 401 handling, and login submit flow
- Created `auth-flow.spec.ts` E2E spec with 4 tests: login screen shown, registration flow, logout flow, login with credentials
- Updated `architecture.md` file tree with new component directories and E2E spec

### File List
**Created:**
- `packages/web/src/components/AppHeader/index.tsx`
- `packages/web/src/components/AppHeader/AppHeader.module.css`
- `packages/web/src/components/AppHeader/AppHeader.test.tsx`
- `packages/web/src/components/LoginForm/index.tsx`
- `packages/web/src/components/LoginForm/LoginForm.module.css`
- `packages/web/src/components/LoginForm/LoginForm.test.tsx`
- `packages/web/src/components/RegisterForm/index.tsx`
- `packages/web/src/components/RegisterForm/RegisterForm.module.css`
- `packages/web/src/components/RegisterForm/RegisterForm.test.tsx`
- `packages/web/e2e/auth-flow.spec.ts`

**Modified:**
- `packages/web/src/App.tsx` — removed AuthGate, added AppHeader/LoginForm/RegisterForm, simplified TodoApp
- `packages/web/src/App.module.css` — removed .header and .title rules (moved to AppHeader)
- `packages/web/src/App.auth.test.tsx` — rewrote all test scenarios for new auth flow
- `packages/web/src/hooks/useAuth.ts` — removed unused register function
- `_bmad-output/planning-artifacts/architecture.md` — updated file tree
- `_bmad-output/implementation-artifacts/sprint-status.yaml` — status updates

### Change Log
- 2026-04-12: Implemented login and register forms with full auth UI flow (Story 6.4)

---

### Review Findings

#### Decision Needed

- [x] [Review][Decision] Error-clear timing — **resolved:** "subsequent input (not on keystroke)" means clear on `onChange` (first change event), not on `onKeyDown`. Current implementation is correct. Spec note updated.
- [x] [Review][Decision] Prop contract deviation — **resolved:** hook-owned API call (`onLogin`/`onRegister` callbacks) is accepted. Observable behaviour is preserved; forms remain testable in isolation. Spec dev notes updated to reflect actual pattern.

#### Patches

- [x] [Review][Patch] RegisterForm missing inputError CSS class — no `.inputError` rule and inputs never get error border styling on submit failure, unlike LoginForm [`packages/web/src/components/RegisterForm/index.tsx`, `RegisterForm.module.css`]
- [x] [Review][Patch] authView not reset to 'login' on logout — if user navigates to register then gets auto-logged-out (401), register screen is shown instead of login, violating AC4 [`packages/web/src/App.tsx`]
- [x] [Review][Patch] No try/catch in handleSubmit — dismissed: `useAuth.login` and `useAuth.register` already catch all exceptions internally and always resolve; forms are safe consumers
- [x] [Review][Patch] Hardcoded `color: #fff` on .submitButton — added `--s-text-on-accent` semantic token to `semantic.css`; both CSS modules updated [`packages/web/src/tokens/semantic.css`, `LoginForm.module.css`, `RegisterForm.module.css`]
- [x] [Review][Patch] AppHeader .title has extra horizontal margin — removed horizontal margin from `.title`; parent `.header` container handles it [`packages/web/src/components/AppHeader/AppHeader.module.css`]
- [x] [Review][Patch] RegisterForm missing loading-state test — added "shows loading state during submission" test [`packages/web/src/components/RegisterForm/RegisterForm.test.tsx`]
- [x] [Review][Patch] E2E beforeAll outside test.describe — dismissed: Playwright runs all tests in a file within the same worker; module-scoped `beforeAll` + `existingUser` is correct; no `fullyParallel` in config
- [x] [Review][Patch] E2E missing "not register screen" assertion — added `expect(page.getByLabel("Name")).not.toBeVisible()` [`packages/web/e2e/auth-flow.spec.ts`]

#### Review Findings (Pass 2)

##### Patches

- [x] [Review][Patch] `onUnauthorized={logout}` does not reset authView — wrapped to also call `setAuthView("login")` [`packages/web/src/App.tsx`]
- [x] [Review][Patch] `--s-text-on-accent: white` — changed to `var(--p-white)` [`packages/web/src/tokens/semantic.css`]
- [x] [Review][Patch] `AuthView` and `AppHeaderProps` exported with no external importer — removed type exports [`packages/web/src/components/AppHeader/index.tsx`]
- [x] [Review][Patch] `aria-label="Login"` inconsistent with "Log in" button text — changed to `"Log in"`; updated `queries.ts` [`packages/web/src/components/LoginForm/index.tsx`, `src/test-utils/queries.ts`]
- [x] [Review][Patch] `App.auth.test.tsx` missing "Name field not visible" assertion in no-token test — added `queryNameInput()` assertion [`packages/web/src/App.auth.test.tsx`]

##### Deferred (Pass 2)

- [x] [Review][Defer] Silent empty-field return with no error — HTML5 `required` + `type="email"` prevents reaching this path in practice; devtools bypass scenario [`LoginForm/index.tsx`, `RegisterForm/index.tsx`] — deferred, pre-existing
- [x] [Review][Defer] `logout()` not awaited before `setAuthView("login")` — React 18 batching makes ordering harmless; `setToken(null)` still fires after async call [`packages/web/src/App.tsx`] — deferred, accepted
- [x] [Review][Defer] Whitespace-only 8-char password passes minLength — previously deferred [`RegisterForm/index.tsx`] — deferred, pre-existing
- [x] [Review][Defer] `getByLabel("Email"/"Password")` strict mode ambiguity in E2E — not a real issue with current single-form DOM structure [`e2e/auth-flow.spec.ts`] — deferred, speculative

#### Deferred

- [x] [Review][Defer] Whitespace-only inputs silent early return — HTML5 type="email" + required handles this; speculative [`packages/web/src/components/LoginForm/index.tsx`, `RegisterForm/index.tsx`] — deferred, pre-existing
- [x] [Review][Defer] setState on unmounted component — React 18 no-op; not a real warning [`packages/web/src/components/LoginForm/index.tsx`, `RegisterForm/index.tsx`] — deferred, pre-existing
- [x] [Review][Defer] Logout race with in-flight login/register request — pre-existing architecture concern in useAuth [`packages/web/src/hooks/useAuth.ts`] — deferred, pre-existing
- [x] [Review][Defer] localStorage can throw (quota/access-blocked) — speculative; pre-existing pattern across app [`packages/web/src/hooks/useAuth.ts`] — deferred, pre-existing
- [x] [Review][Defer] page.goto before server ready in E2E — handled by existing globalSetup infrastructure [`packages/web/e2e/auth-flow.spec.ts`] — deferred, pre-existing
- [x] [Review][Defer] JSON.parse throws on malformed response body — pre-existing httpClient concern [`packages/web/src/utils/http-client.ts`] — deferred, pre-existing
- [x] [Review][Defer] outline:none on inputs breaks focus ring for non-focus-visible browsers — modern :focus-visible practice, consistent with existing codebase [`packages/web/src/components/LoginForm/LoginForm.module.css`, `RegisterForm.module.css`] — deferred, pre-existing
- [x] [Review][Defer] LoginForm test missing error-border class assertion — CSS module class testing unreliable in JSDOM; behaviour covered by visual acceptance [`packages/web/src/components/LoginForm/LoginForm.test.tsx`] — deferred, pre-existing
