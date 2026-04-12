# Story 6.3: Web auth — Bearer token adoption, legacy auth removal, and temporary auth UI

Status: done

## Story

As a maintainer,
I want the web app to authenticate via JWT Bearer tokens and all legacy auth scaffolding removed,
so that the codebase has no placeholder auth, the default user is gone, and the app is ready for a proper login/register UI in the next story.

## Acceptance Criteria

### AC1 — Temporary auth UI

**Given** no `auth_token` in `localStorage`
**When** the app loads
**Then** a "Create user & start" button is shown (no todo list, no login form)
**And** clicking it calls `POST /api/auth/register` with auto-generated credentials, stores the returned `token` in `localStorage("auth_token")`, and renders the todo list

**Given** a valid `auth_token` in `localStorage`
**When** the app loads
**Then** the todo list renders immediately (no auth screen)
**And** a "Log out" button is visible
**And** clicking it removes the token from `localStorage` and shows the "Create user & start" button again

**Given** a 401 response from any todo API call
**When** the error is received
**Then** the token is cleared from `localStorage` and the "Create user & start" button is shown

### AC2 — Bearer token auth in `useTodos`

**Given** a stored `auth_token` in `localStorage`
**When** any todo API call is made
**Then** the request carries `Authorization: Bearer <token>` (no `x-user-id` header)

**Given** a 401 response from any todo mutation or fetch
**When** the error is received by `useTodos`
**Then** `onUnauthorized()` is called, which clears the token and shows the auth screen

### AC3 — Dual-mode removed from `jwtAuthPlugin`

**Given** a request to any todo route
**When** it carries no `Authorization` header or an invalid/expired Bearer token
**Then** the API returns `401` immediately — no `x-user-id` fallback lookup

**Given** a request to any todo route with a valid `Authorization: Bearer <token>`
**When** the JWT auth plugin processes it
**Then** `request.userId` is set from the token payload and the request proceeds

### AC4 — Legacy API surface removed

**Given** the auth cutover is complete
**When** this story is merged
**Then** `POST /users` route is deleted (entire `routes/users/` module)
**And** `x-user-id` header property is removed from `todoRequestHeadersSchema`

### AC5 — Default user removed everywhere

**Given** `DEFAULT_USER_ID` no longer exists in `packages/shared`
**When** any code runs
**Then** `DEFAULT_USER_ID` is not imported or referenced anywhere
**And** `cleanupTestDatabase()` no longer re-seeds the default user after truncation — it only truncates `todos` then `users`
**And** `makeSeedTodo()` requires `userId` explicitly (no default) — all existing callers already provide it
**And** `users.post.test.ts` is deleted (tests `POST /users` and the default user seed, both being removed)

### AC6 — E2E tests use localStorage token injection

**Given** the updated E2E setup
**When** a spec file's tests run
**Then** `registerTestUser` returns `{ userId: string; token: string }` (previously only `userId`)
**And** each spec file's `beforeEach` uses `page.addInitScript` to set `localStorage.setItem("auth_token", token)` before navigation
**And** the old `page.route("**/api/**", ...)` header injection is removed from all spec files
**And** all 26 existing E2E tests pass without changes to their test scenarios

### AC7 — Web unit tests updated

**Given** the updated web unit tests
**When** the test suite runs
**Then** `vitest.setup.ts` clears `localStorage` in `afterEach` so tests start clean
**And** each existing `App.*.test.tsx` file sets `localStorage.setItem("auth_token", "test-token")` in `beforeEach` to render the todo list directly
**And** `fetch-mocks.ts` no longer imports `DEFAULT_USER_ID` from shared (uses a local constant instead)
**And** all existing web unit tests pass

## Tasks / Subtasks

- [x] Task 1 — Remove `DEFAULT_USER_ID` from shared and fix downstream references (AC5)
  - [x] In `packages/shared/src/constants.ts`: delete the `DEFAULT_USER_ID` export and its JSDoc comment
  - [x] In `packages/api/test/test-utils/db.ts`: remove `import { DEFAULT_USER_ID } from "shared"`; update `cleanupTestDatabase()` to only do `await db.delete(schema.todos); await db.delete(schema.users);` (no re-seed)
  - [x] In `packages/api/test/test-utils/todos.ts`: remove `import { DEFAULT_USER_ID } from "shared"`; change `makeSeedTodo` to require `userId` explicitly — remove it from the defaults object and update the parameter type to `Partial<Omit<SeedTodoInput, "userId">> & { userId: string }` (see Dev Notes)
  - [x] In `packages/web/src/test-utils/fetch-mocks.ts`: remove `DEFAULT_USER_ID` import from shared; add `const TEST_USER_ID = "00000000-0000-4000-8000-000000000001"` locally; update `TODO_FIXTURES` to use `TEST_USER_ID`

- [x] Task 2 — Delete `POST /users` route and its test (AC4, AC5)
  - [x] Delete `packages/api/src/routes/users/index.ts`
  - [x] Delete `packages/api/src/routes/users/schemas.ts`
  - [x] Delete `packages/api/test/users.post.test.ts` (tests only the deleted route and the default user seed)
  - [x] In `packages/api/src/app.ts`: remove `import { usersRoutes }` and `app.register(usersRoutes)`

- [x] Task 3 — Remove dual-mode fallback from `jwtAuthPlugin` (AC3)
  - [x] In `packages/api/src/plugins/jwt-auth.ts`: delete the entire "// 2. Dual-mode fallback" block (the `headerValue` variable, DB lookup, and `if (user)` branch — roughly lines 46–59)
  - [x] Update the plugin's JSDoc comment: remove mention of dual-mode/`x-user-id`
  - [x] After the Bearer try/catch block, the next statement is the 401 reply directly

- [x] Task 4 — Remove `x-user-id` from todo schemas (AC4)
  - [x] In `packages/api/src/routes/todos/schemas.ts`: remove the `"x-user-id"` property from `todoRequestHeadersSchema`; make `authorization` required

- [x] Task 5 — Create `useAuth` hook (AC1, AC2)
  - [x] Create `packages/web/src/hooks/useAuth.ts` with `function useAuth()` (see Dev Notes for full implementation)
  - [x] Exposes: `token: string | null`, `login(token: string): void`, `logout(): Promise<void>`
  - [x] `login`: `localStorage.setItem("auth_token", token)` + `setToken(token)`
  - [x] `logout`: calls `POST /api/auth/logout` (best-effort, swallow errors), then `localStorage.removeItem("auth_token")` + `setToken(null)`

- [x] Task 6 — Update `useTodos` to use Bearer token (AC2)
  - [x] Change signature from `{ userId: string }` to `{ token: string; onUnauthorized: () => void }`
  - [x] Replace every `{ "x-user-id": userId }` with `{ authorization: \`Bearer ${token}\` }` — applies to `fetchTodos`, `createTodo`, `deleteTodo`, and the `useOptimisticUpdate` `mutationFn` in `updateTodo`
  - [x] In `fetchTodos` catch block: add `if (err instanceof HttpError && err.status === 401) { onUnauthorized(); return; }` before the generic error handler
  - [x] In `createTodo`, `updateTodo`, `deleteTodo` catch blocks: add the same 401 check (in `updateTodo` add it before the existing 404 check)

- [x] Task 7 — Update `App.tsx` with temporary auth UI (AC1)
  - [x] Add `useAuth` hook call at top of `App`
  - [x] Extract current todo list body into an inner `TodoApp` function within the same file (see Dev Notes)
  - [x] If `!token`: render `<AuthGate onLogin={handleLogin} />` — a minimal component (can be inline in `App.tsx`) with the "Create user & start" button
  - [x] `handleLogin(token)`: calls `login(token)` from `useAuth`
  - [x] `handleLogout()`: calls `logout()` from `useAuth`; add a "Log out" button to the todo list header area
  - [x] Pass `token` and `onUnauthorized={handleLogout}` to `useTodos`
  - [x] Add `contracts.ts` constants for auth API paths: `AUTH_LOGIN_API_PATH`, `AUTH_REGISTER_API_PATH`, `AUTH_LOGOUT_API_PATH` (used by `useAuth` and `AuthGate`)

- [x] Task 8 — Update `vitest.setup.ts` and existing App tests (AC7)
  - [x] In `packages/web/vitest.setup.ts`: merge `cleanup()` into the existing `afterEach` and add `localStorage.clear()` so the hook becomes: `afterEach(() => { cleanup(); localStorage.clear(); })`
  - [x] In each existing `App.*.test.tsx` file (`App.test.tsx`, `App.create-todo.test.tsx`, `App.delete-todo.test.tsx`, `App.edit-todo.test.tsx`, `App.mutation-concurrency.test.tsx`, `App.toggle-todo.test.tsx`): add `beforeEach(() => { localStorage.setItem("auth_token", "test-token"); })` inside the root `describe` block
  - [x] Also add `fetchMock.post("/api/auth/logout", 204)` in each App test's `beforeEach` — prevents unmatched fetch errors if logout is triggered by a 401 mock
  - [x] Write `packages/web/src/App.auth.test.tsx` — see Dev Notes for scenarios

- [x] Task 9 — Update E2E test utilities and all spec files (AC6)
  - [x] In `packages/web/e2e/test-utils/auth.ts`: change return type to `Promise<{ userId: string; token: string }>`; extract `token` from response body `{ user: { id: string }, token: string }` and return it alongside `userId`
  - [x] Update all 6 spec files (`initial-load.spec.ts`, `create-todo.spec.ts`, `inline-edit.spec.ts`, `toggle-completion.spec.ts`, `delete-todo.spec.ts`, `persistence.spec.ts`) — replaced `page.route` header injection with `page.addInitScript` localStorage injection
  - [x] E2E barrel re-export type change is transparent (no update needed)

- [x] Task 10 — Update `architecture.md` file tree (AC5, AC7)
  - [x] Add `hooks/useAuth.ts` under `packages/web/src/hooks/`
  - [x] Remove `routes/users/` from API tree
  - [x] Add `App.auth.test.tsx` under `packages/web/src/`

- [x] Task 11 — Validation gates
  - [x] `npm run type:check` — no errors
  - [x] `npm run biome:check` — no errors
  - [x] `npm run test:ci` — 151 tests pass (17 files)
  - [x] `npm run test:e2e` — 26 E2E tests pass

### Review Findings

- [x] [Review][Decision] `useAuth`/`AuthGate` API boundary deviates from spec — **Resolved 2026-04-11: deviation accepted.** `register()` stays in `useAuth`; `AuthGate` receives `onRegister`. Dev Notes updated to match actual implementation. `login` removed from public return value (no external caller).

- [x] [Review][Patch] ~~`login` exposed in `useAuth` return value but has no external caller~~ — dismissed; kept for Story 6.4 login form. [`packages/web/src/hooks/useAuth.ts`]

- [x] [Review][Patch] Empty-string `userId` bypasses auth guard — fixed: `|| !userId` added to guard. [`packages/api/src/plugins/jwt-auth.ts`]

- [x] [Review][Patch] Missing test for AC1 register happy path — fixed: test added (152 tests pass). [`packages/web/src/App.auth.test.tsx`]

- [x] [Review][Patch] Stale generated artifacts still advertise `x-user-id` — fixed: regenerated via `build:openapi` + `build:api-types`. [`packages/api/openapi.json`, `packages/web/src/api/generated/index.ts`]

- [x] [Review][Patch] ~~`AUTH_LOGIN_API_PATH` exported but has no importer~~ — dismissed; kept for Story 6.4 login form. [`packages/web/src/contracts.ts:18`]

- [x] [Review][Patch] Stale comment references removed `x-user-id` — fixed. [`packages/api/test/test-utils/user-scoping-tests.ts`]

- [x] [Review][Patch] `logout`/`login`/`register` in `useAuth` not wrapped in `useCallback` — fixed: all three wrapped in `useCallback`. [`packages/web/src/hooks/useAuth.ts`]

- [x] [Review][Patch] `fetchTodos` skips `setLoading(false)` on 401 early-return — fixed: `setLoading(false)` called before `onUnauthorized()`. [`packages/web/src/hooks/useTodos.ts`]

- [x] [Review][Patch] `createTestUser` uses hardcoded weak password — fixed: `password: randomUUID()` in both API and E2E test utilities. [`packages/api/test/test-utils/auth.ts`, `packages/web/e2e/test-utils/auth.ts`]

- [x] [Review][Defer] JWT stored in `localStorage` is XSS-vulnerable [`packages/web/src/hooks/useAuth.ts`] — deferred, architectural decision documented in ADR; Bearer token over httpOnly cookies was a deliberate Story 6.1 deviation.

- [x] [Review][Defer] No credential recovery path after logout [`packages/web/src/App.tsx`] — deferred, acknowledged scope limitation of temporary UI; Story 6.4 replaces this with real login/register forms.

- [x] [Review][Defer] `AUTH_TOKEN_KEY` is a hardcoded literal in test `localStorage.setItem` calls rather than imported from `useAuth.ts` [various test files] — deferred, minor DX concern; importing would couple tests to implementation internals.

## Dev Notes

### Architecture Note: Bearer Tokens, NOT httpOnly Cookies

The ADR describes httpOnly cookies. Story 6.1 implemented Bearer tokens in the response body instead (`{ user, token }` — no `@fastify/cookie`). **Follow the actual implementation.** Web client stores the token in `localStorage` and sends `Authorization: Bearer <token>` on every request.

### `useAuth` Hook

```ts
// packages/web/src/hooks/useAuth.ts
const AUTH_TOKEN_KEY = "auth_token";

/**
 * Manages JWT auth state backed by localStorage.
 * Token is read on mount; login/logout update both localStorage and React state.
 */
function useAuth() {
  const [token, setToken] = useState<string | null>(
    () => localStorage.getItem(AUTH_TOKEN_KEY),
  );

  function login(newToken: string): void {
    localStorage.setItem(AUTH_TOKEN_KEY, newToken);
    setToken(newToken);
  }

  async function logout(): Promise<void> {
    // Best-effort — clear client state regardless of server outcome
    try {
      await httpClient.post(AUTH_LOGOUT_API_PATH);
    } catch {
      // ignore
    }
    localStorage.removeItem(AUTH_TOKEN_KEY);
    setToken(null);
  }

  return { token, register, logout };
  // Note: login() stays as an internal helper called by register().
  // It is not exposed — no external caller exists in this story.
}

export { useAuth };
```

> **Implementation note (review decision 2026-04-11):** The original spec had `AuthGate` call the register API directly and receive `onLogin: (token: string) => void`. The actual implementation moves the API call into `useAuth.register()` and passes it as `onRegister` to `AuthGate`. This is an accepted deviation — the component boundary is cleaner with API concerns in the hook. `login` is an internal helper only; it is not part of the public return value.

Import `httpClient` from `../utils`, `AUTH_REGISTER_API_PATH` and `AUTH_LOGOUT_API_PATH` from `../contracts`.

### Auth API Path Constants in `contracts.ts`

Add alongside the existing `TODOS_API_PATH`:

```ts
const AUTH_API_PREFIX = `${API_PREFIX}/auth`;
// AUTH_LOGIN_API_PATH intentionally omitted — no login form in this story (Story 6.4)
export const AUTH_REGISTER_API_PATH = `${AUTH_API_PREFIX}/register`;
export const AUTH_LOGOUT_API_PATH = `${AUTH_API_PREFIX}/logout`;
```

### `App.tsx` Structure After This Story

Keep everything in `App.tsx` — no new files for the temporary UI. The current `App` body becomes `TodoApp`; a simple inline `AuthGate` handles the unauthenticated state:

```tsx
// Inline within App.tsx — not exported, not a separate file
// AuthGate delegates registration to useAuth.register() via onRegister prop
function AuthGate({ onRegister }: {
  onRegister: (data: { email: string; password: string; name: string }) => Promise<void>;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleCreateUser(): Promise<void> {
    setLoading(true);
    setError(null);
    try {
      await onRegister({
        email: `user-${crypto.randomUUID()}@local.dev`,
        password: crypto.randomUUID(),
        name: `User ${crypto.randomUUID().slice(0, 8)}`,
      });
      // Component unmounts on success (token is set) — no setLoading(false) needed
    } catch {
      setError("Couldn't create user. Please try again.");
      setLoading(false);
    }
  }

  return (
    <main className={styles.app}>
      <h1 className={styles.title}>Todos</h1>
      {error && <p role="alert">{error}</p>}
      <button type="button" onClick={handleCreateUser} disabled={loading}>
        {loading ? "Creating…" : "Create user & start"}
      </button>
    </main>
  );
}

function TodoApp({ token, onUnauthorized, onLogout }: {
  token: string;
  onUnauthorized: () => void;
  onLogout: () => void;
}) {
  const { todos, loading, error, retry, createTodo, updateTodo, deleteTodo } =
    useTodos({ token, onUnauthorized });
  // ...existing state and handlers...
  return (
    <main className={styles.app}>
      <div className={styles.header}>
        <h1 className={styles.title}>Todos</h1>
        <button type="button" onClick={onLogout}>Log out</button>
      </div>
      {/* rest of current App JSX */}
    </main>
  );
}

function App() {
  const { token, register, logout } = useAuth();

  if (!token) {
    return <AuthGate onRegister={register} />;
  }

  return <TodoApp token={token} onUnauthorized={logout} onLogout={logout} />;
}
```

`App.module.css` — add a `header` flex row rule if needed. Keep styling minimal.

### `makeSeedTodo` After `DEFAULT_USER_ID` Removal

Remove `userId` from the defaults, require it from callers:

```ts
// Before
export function makeSeedTodo(overrides?: Partial<SeedTodoInput>): SeedTodoInput {
  return { ..., userId: DEFAULT_USER_ID, ...overrides };
}

// After
export function makeSeedTodo(
  overrides: Partial<Omit<SeedTodoInput, "userId">> & { userId: string },
): SeedTodoInput {
  return {
    id: randomUUID(),
    title: "seed todo",
    text: "",
    completed: false,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...overrides,          // userId comes from here — always required
  };
}
```

All existing callers already pass `userId: testUserId` so there are no breaking call sites. Verify by running `grep -r "makeSeedTodo" packages/api/test/` — every call should have `userId` in the overrides.

### `cleanupTestDatabase` After Default User Removal

```ts
// Before: truncates both tables then re-seeds the default user
// After: just truncates
export async function cleanupTestDatabase(): Promise<void> {
  const db = getTestDb();
  await db.delete(schema.todos);
  await db.delete(schema.users);
}
```

The `DEFAULT_USER_ID` import is removed; the `insert` call is removed. No other changes to this function.

The E2E flow after this change:
1. `global-setup.ts` → `db:reset` → `cleanupTestDatabase()` → DB is empty (no rows in `users` or `todos`)
2. Each spec's `beforeAll` → `registerTestUser()` → creates a fresh user + returns `{ userId, token }`
3. Each spec's `beforeEach` → `page.addInitScript` → sets `localStorage.setItem("auth_token", token)` before `page.goto("/")`
4. App loads with token → renders todo list directly

### E2E Spec File Change Pattern (apply to all 6 files)

```ts
// BEFORE
let userId: string;

test.beforeAll(async ({ request }) => {
  userId = await registerTestUser({ request });
});

test.beforeEach(async ({ page }) => {
  // TODO(story 6.3): remove this header injection once dual-mode is dropped
  await page.route("**/api/**", (route) => {
    route.continue({
      headers: { ...route.request().headers(), "x-user-id": userId },
    });
  });
});

// AFTER
let authToken: string;

test.beforeAll(async ({ request }) => {
  const { token } = await registerTestUser({ request });
  authToken = token;
});

test.beforeEach(async ({ page }) => {
  await page.addInitScript((t) => {
    window.localStorage.setItem("auth_token", t);
  }, authToken);
});
```

`userId` is no longer needed in any spec file (it was only used for header injection). Remove the `let userId` declaration entirely.

**`page.addInitScript` runs before page scripts** — the React app sees the token in `localStorage` on mount and renders the todo list. No interaction with the auth screen is needed.

The inner `page.route()` calls inside individual tests (for failure simulation, e.g., `**/api/todos`) are **untouched** — they stack on top and still work correctly.

### `App.auth.test.tsx` Test Scenarios

```ts
describe("App auth gate", () => {
  describe("when no auth token in localStorage", () => {
    it("shows the Create user button")
    it("does not render the todo list")
  })
  describe("when auth token is present in localStorage", () => {
    beforeEach(() => { localStorage.setItem("auth_token", "test-token"); })
    it("renders the todo list") // fetchMock GET /api/todos already handled by beforeEach in this file
    it("shows the Log out button")
    it("does not show the Create user button")
  })
  describe("on logout button click", () => {
    beforeEach(() => { localStorage.setItem("auth_token", "test-token"); })
    it("shows the Create user button after clicking Log out")
    // fetchMock.post("/api/auth/logout", 204)
    // fetchMock.get("/api/todos", { todos: [] })
    // render App → wait for todo list → click Log out → assert auth gate visible
  })
  describe("on 401 from todo API", () => {
    beforeEach(() => { localStorage.setItem("auth_token", "expired-token"); })
    it("clears the token and shows the Create user button")
    // fetchMock.get("/api/todos", { status: 401, body: { code: "UNAUTHORIZED", message: "..." } })
    // render App → wait for auth gate to appear → assert localStorage.getItem("auth_token") is null
  })
})
```

This is a new file — `App.auth.test.tsx`. It needs `fetchMock.post("/api/auth/logout", 204)` in its `beforeEach` (or top-level setup) for the logout test. The existing global `beforeEach` in `vitest.setup.ts` handles `fetchMock.mockGlobal()`.

Note: the `App.auth.test.tsx` file does NOT need `localStorage.setItem("auth_token", ...)` in the global setup of this file — it tests both states deliberately, setting token per-describe.

### Existing App Tests — Minimal Change Required

In each of the 6 existing `App.*.test.tsx` files, add inside the root `describe` block:

```ts
beforeEach(() => {
  localStorage.setItem("auth_token", "test-token");
  fetchMock.post("/api/auth/logout", 204); // prevents unmatched fetch on 401 scenarios
});
```

These tests render `<App />`. With a token in `localStorage`, the app bypasses the auth gate and renders the todo list. The rest of the test logic is unchanged.

### Migration Note

The Drizzle migration `0004_groovy_may_parker.sql` backfilled the default user into existing DBs — that migration stays as-is (historical, already applied). After `cleanupTestDatabase` stops re-seeding it, the default user row will not exist in test/dev DBs that ran `db:reset`. This is correct: there is no longer a meaningful default user, and all DB users are created by the auth flow.

### Files to Create
- `packages/web/src/hooks/useAuth.ts`
- `packages/web/src/App.auth.test.tsx`

### Files to Modify
- `packages/shared/src/constants.ts` — remove `DEFAULT_USER_ID`
- `packages/web/src/App.tsx` — add auth gate, extract `TodoApp`, use `useAuth` + `useTodos({token})`
- `packages/web/src/hooks/useTodos.ts` — replace `userId` param with `token` + `onUnauthorized`
- `packages/web/src/contracts.ts` — add auth API path constants
- `packages/web/src/test-utils/fetch-mocks.ts` — replace `DEFAULT_USER_ID` import with local constant
- `packages/web/vitest.setup.ts` — add `localStorage.clear()` to `afterEach`
- `packages/web/src/App.test.tsx` + all `App.*.test.tsx` (6 files) — add `beforeEach` with localStorage token
- `packages/web/e2e/test-utils/auth.ts` — return `{ userId, token }`
- All 6 E2E spec files — replace `page.route` injection with `page.addInitScript`
- `packages/api/src/app.ts` — remove `usersRoutes`
- `packages/api/src/plugins/jwt-auth.ts` — remove dual-mode block
- `packages/api/src/routes/todos/schemas.ts` — remove `x-user-id` property
- `packages/api/test/test-utils/db.ts` — remove `DEFAULT_USER_ID`, simplify `cleanupTestDatabase`
- `packages/api/test/test-utils/todos.ts` — remove `DEFAULT_USER_ID`, require `userId` in `makeSeedTodo`
- `_bmad-output/planning-artifacts/architecture.md` — update file tree

### Files to Delete
- `packages/api/src/routes/users/index.ts`
- `packages/api/src/routes/users/schemas.ts`
- `packages/api/test/users.post.test.ts`

### References
- Current auth API routes: [packages/api/src/routes/auth/index.ts](packages/api/src/routes/auth/index.ts)
- JWT auth plugin (dual-mode to remove): [packages/api/src/plugins/jwt-auth.ts](packages/api/src/plugins/jwt-auth.ts)
- `useTodos` (x-user-id to replace): [packages/web/src/hooks/useTodos.ts](packages/web/src/hooks/useTodos.ts)
- `App.tsx` (to refactor): [packages/web/src/App.tsx](packages/web/src/App.tsx)
- `contracts.ts` (add auth paths): [packages/web/src/contracts.ts](packages/web/src/contracts.ts)
- `cleanupTestDatabase` (to simplify): [packages/api/test/test-utils/db.ts](packages/api/test/test-utils/db.ts)
- `makeSeedTodo` (userId to require): [packages/api/test/test-utils/todos.ts](packages/api/test/test-utils/todos.ts)
- E2E auth utils: [packages/web/e2e/test-utils/auth.ts](packages/web/e2e/test-utils/auth.ts)
- Previous story (6.2.1): [_bmad-output/implementation-artifacts/6-2-1-parallelize-e2e-tests-with-per-user-isolation.md](_bmad-output/implementation-artifacts/6-2-1-parallelize-e2e-tests-with-per-user-isolation.md)
- ADR: [docs/decisions/adr-auth-strategy.md](docs/decisions/adr-auth-strategy.md) — NOTE: ADR says httpOnly cookies; actual implementation uses Bearer tokens in response body (Story 6.1 deviation). Follow the actual implementation.

## Dev Agent Record

### Agent Model Used

claude-opus-4-6

### Debug Log References

None — clean implementation with no debugging required.

### Completion Notes List

- Removed `DEFAULT_USER_ID` from shared package and all downstream references (constants, barrel export, test utils, web test files)
- Deleted `POST /users` route (`routes/users/` module) and its test file (`users.post.test.ts`)
- Removed dual-mode `x-user-id` fallback from `jwtAuthPlugin` — now Bearer-only with immediate 401 on missing/invalid token
- Removed `x-user-id` property from `todoRequestHeadersSchema`, made `authorization` required
- Created `useAuth` hook with localStorage-backed JWT state management (login/logout/token)
- Updated `useTodos` from `{ userId }` to `{ token, onUnauthorized }` — all API calls now send `Authorization: Bearer` header, 401 responses trigger `onUnauthorized`
- Restructured `App.tsx` with `AuthGate` (unauthenticated) and `TodoApp` (authenticated) components
- Added auth API path constants to `contracts.ts`
- Updated `vitest.setup.ts` with `localStorage.clear()` in `afterEach`
- Added `localStorage.setItem("auth_token", "test-token")` and `fetchMock.post("/api/auth/logout", 204)` to all 6 existing App test files
- Created `App.auth.test.tsx` with 6 auth gate tests (no token, with token, logout, 401 handling)
- Updated `registerTestUser` E2E utility to return `{ userId, token }` and all 6 spec files to use `page.addInitScript` for localStorage token injection (string form to satisfy E2E tsconfig without DOM types)
- Updated `architecture.md` file tree (removed `routes/users/`, added `useAuth.ts` and `App.auth.test.tsx`)
- All validation gates pass: type:check, biome:check, 151 unit/integration tests, 26 E2E tests

### File List

**Created:**
- `packages/web/src/hooks/useAuth.ts`
- `packages/web/src/App.auth.test.tsx`

**Modified:**
- `packages/shared/src/constants.ts` — removed `DEFAULT_USER_ID`
- `packages/shared/src/index.ts` — removed `DEFAULT_USER_ID` from barrel export
- `packages/api/src/app.ts` — removed `usersRoutes` import and registration
- `packages/api/src/plugins/jwt-auth.ts` — removed dual-mode fallback, Bearer-only auth
- `packages/api/src/routes/todos/schemas.ts` — removed `x-user-id`, made `authorization` required
- `packages/api/test/test-utils/db.ts` — removed `DEFAULT_USER_ID` import, simplified `cleanupTestDatabase`
- `packages/api/test/test-utils/todos.ts` — removed `DEFAULT_USER_ID` import, `makeSeedTodo` requires `userId`
- `packages/web/src/App.tsx` — restructured with `AuthGate`, `TodoApp`, `useAuth` integration
- `packages/web/src/App.module.css` — added `.header` flex row style
- `packages/web/src/contracts.ts` — added auth API path constants
- `packages/web/src/hooks/useTodos.ts` — Bearer token auth, `onUnauthorized` callback, 401 handling
- `packages/web/src/test-utils/fetch-mocks.ts` — local `TEST_USER_ID` constant
- `packages/web/vitest.setup.ts` — added `localStorage.clear()` to `afterEach`
- `packages/web/src/App.test.tsx` — added auth `beforeEach`
- `packages/web/src/App.create-todo.test.tsx` — added auth `beforeEach`, updated header assertions
- `packages/web/src/App.delete-todo.test.tsx` — added auth `beforeEach`
- `packages/web/src/App.edit-todo.test.tsx` — added auth `beforeEach`, updated header assertions
- `packages/web/src/App.mutation-concurrency.test.tsx` — added auth `beforeEach`, updated header assertions
- `packages/web/src/App.toggle-todo.test.tsx` — added auth `beforeEach`, updated header assertions
- `packages/web/src/components/TodoItem.test.tsx` — replaced `DEFAULT_USER_ID` with local constant
- `packages/web/e2e/test-utils/auth.ts` — returns `{ userId, token }`
- `packages/web/e2e/initial-load.spec.ts` — localStorage token injection via `addInitScript`
- `packages/web/e2e/create-todo.spec.ts` — localStorage token injection via `addInitScript`
- `packages/web/e2e/inline-edit.spec.ts` — localStorage token injection via `addInitScript`
- `packages/web/e2e/toggle-completion.spec.ts` — localStorage token injection via `addInitScript`
- `packages/web/e2e/delete-todo.spec.ts` — localStorage token injection via `addInitScript`
- `packages/web/e2e/persistence.spec.ts` — localStorage token injection via `addInitScript`
- `_bmad-output/planning-artifacts/architecture.md` — updated file tree

**Deleted:**
- `packages/api/src/routes/users/index.ts`
- `packages/api/src/routes/users/schemas.ts`
- `packages/api/test/users.post.test.ts`

### Change Log

- Story 6.3 implementation complete (Date: 2026-04-11)
