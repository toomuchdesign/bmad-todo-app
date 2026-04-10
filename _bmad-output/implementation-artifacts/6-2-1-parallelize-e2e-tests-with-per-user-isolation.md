# Story 6.2.1: Parallelize E2E tests with per-user isolation

Status: done

## Story

As a maintainer,
I want E2E tests to run in parallel with isolated user contexts,
so that the suite runs faster as auth adds more test scenarios.

## Acceptance Criteria

### AC1 — Group E2E tests by feature into separate spec files

**Given** the current single `todo-flows.spec.ts` with all 26 E2E tests
**When** split by feature
**Then** each spec file covers one feature area matching the existing `describe` groupings:
- `initial-load.spec.ts` — 2 tests (renders, load failure + retry)
- `create-todo.spec.ts` — 8 tests (create, validation, keyboard-only)
- `inline-edit.spec.ts` — 8 tests (edit, cancel, validation, keyboard-only)
- `toggle-completion.spec.ts` — 3 tests (toggle, failure rollback, keyboard-only)
- `delete-todo.spec.ts` — 4 tests (delete, failure, focus management, keyboard-only)
- `persistence.spec.ts` — 1 test (todos survive page reload)

**And** each spec file registers its own user via `POST /auth/register` (isolated identity)

### AC2 — Playwright parallel workers

**Given** the Playwright configuration
**When** updated for parallelism
**Then** `workers` is set to `4` in `playwright.config.ts`
**And** `fullyParallel` is NOT set (default false) — tests within each file run sequentially
**And** no shared mutable state between spec files

### AC3 — All E2E tests pass in parallel

**Given** multiple spec files running concurrently
**When** the suite completes
**Then** all 26 tests pass with no ordering dependencies between spec files
**And** DB isolation is per-user (each spec file's fresh user starts with no todos)
**And** both CI and local runs use parallel mode

## Tasks / Subtasks

- [x] Task 1 — Create E2E auth utility (shared setup)
  - [x] Create `packages/web/e2e/test-utils/auth.ts` with `registerTestUser({ request })` function that calls `POST http://${API_HOST}:${API_PORT}/auth/register` and returns `userId: string`
  - [x] Update `packages/web/e2e/test-utils/index.ts` to export `registerTestUser`

- [x] Task 2 — Create `initial-load.spec.ts`
  - [x] Move "initial load" describe block from `todo-flows.spec.ts`
  - [x] Add `beforeAll` + `beforeEach` hooks for user registration + route interception

- [x] Task 3 — Create `create-todo.spec.ts`
  - [x] Move "create todo" describe block (including validation + keyboard-only sub-describes)
  - [x] Add `beforeAll` + `beforeEach` hooks

- [x] Task 4 — Create `inline-edit.spec.ts`
  - [x] Move "inline edit" describe block (including keyboard-only sub-describe)
  - [x] Add `beforeAll` + `beforeEach` hooks

- [x] Task 5 — Create `toggle-completion.spec.ts`
  - [x] Move "toggle completion" describe block (including keyboard-only sub-describe)
  - [x] Add `beforeAll` + `beforeEach` hooks

- [x] Task 6 — Create `delete-todo.spec.ts`
  - [x] Move "delete todo" describe block (including keyboard-only sub-describe)
  - [x] Add `beforeAll` + `beforeEach` hooks

- [x] Task 7 — Create `persistence.spec.ts`
  - [x] Move "data persistence" describe block
  - [x] Add `beforeAll` + `beforeEach` hooks

- [x] Task 8 — Delete `todo-flows.spec.ts`
  - [x] Remove the original monolithic spec file

- [x] Task 9 — Update `playwright.config.ts`
  - [x] Add `workers: 4` at the top level of `defineConfig({...})`

- [x] Task 10 — Update documentation
  - [x] Update `_bmad-output/planning-artifacts/architecture.md` — replace `todo-flows.spec.ts` in the file tree with the 6 new spec files + `test-utils/auth.ts`

- [x] Task 11 — Verify
  - [x] Run `npm run test:e2e` — all 26 tests pass in parallel
  - [x] Run `npm run type:check` — no type errors
  - [x] Run `npm run biome:check` — no formatting errors

## Dev Notes

### Architecture Decision — Per-User Isolation via Header Interception

The web app currently hardcodes `x-user-id: DEFAULT_USER_ID` in all API requests (Story 6.3 will replace this with real JWT auth). To achieve per-spec isolation without modifying the web app, each spec file uses Playwright's `page.route()` to intercept all API requests and replace/add the `x-user-id` header with a freshly registered test user's ID.

This is the canonical isolation approach for the dual-mode transition period. It will be removed/replaced in Story 6.3 when the web switches to Bearer token auth.

### Shared Spec File Structure (apply identically to all 6 spec files)

```ts
import { expect, test } from "@playwright/test";
import { createDeferred, registerTestUser } from "./test-utils";

// Module-scoped: shared across all tests within this spec file
let userId: string;

test.beforeAll(async ({ request }) => {
  userId = await registerTestUser({ request });
});

test.beforeEach(async ({ page }) => {
  // Intercept all API requests and inject the per-spec user ID (dual-mode fallback).
  // page.route() persists across page.goto() and page.reload() calls for the lifetime of this page.
  await page.route("**/api/**", (route) => {
    route.continue({ headers: { ...route.request().headers(), "x-user-id": userId } });
  });
});

test.describe("feature name", () => {
  // move tests here verbatim from todo-flows.spec.ts
});
```

**Remove** the outer `test.describe("Todo flows", ...)` wrapper — each spec file IS its own feature scope.

### `auth.ts` — registerTestUser Implementation

```ts
// packages/web/e2e/test-utils/auth.ts
import { randomUUID } from "node:crypto";
import type { APIRequestContext } from "@playwright/test";

/**
 * Registers a unique test user via the auth API and returns their userId.
 * Used in E2E beforeAll hooks to create isolated user contexts per spec file.
 */
async function registerTestUser({
  request,
}: {
  request: APIRequestContext;
}): Promise<string> {
  const apiHost = process.env.API_HOST ?? "127.0.0.1";
  const apiPort = process.env.API_PORT ?? "3002";
  const response = await request.post(
    `http://${apiHost}:${apiPort}/auth/register`,
    {
      data: {
        email: `e2e-${randomUUID()}@test.local`,
        name: `e2e-${randomUUID()}`,
        password: "test-password-123",
      },
    },
  );
  const body = (await response.json()) as { user: { id: string } };
  return body.user.id;
}

export { registerTestUser };
```

**Notes:**
- Call `request.post()` — this is Playwright's built-in HTTP client (available in `beforeAll`), NOT the browser
- API URL uses `process.env.API_HOST` / `process.env.API_PORT` (loaded from `.env.test` by `playwright.config.ts`)
- These env vars are available in test files because `playwright.config.ts` calls `loadEnvFile(...)` before the tests run
- The Fastify route path is `/auth/register` (without `/api/` prefix — nginx strips it; `request.post` bypasses nginx)

### Updated `test-utils/index.ts`

```ts
export { createDeferred, type Deferred } from "./deferred";
export { registerTestUser } from "./auth";
```

### Playwright Config Change

```ts
// packages/web/e2e/playwright.config.ts — add workers to defineConfig
export default defineConfig({
  testDir: ".",
  workers: 4,            // ← add this line
  use: {
    baseURL: `http://localhost:${webPort}`,
  },
  // ... rest unchanged
});
```

Do NOT add `fullyParallel: true` — tests within each file must stay sequential (they accumulate DB state across each other within a spec).

### DB Isolation Mechanism — Per-Spec Fresh User

Each spec file's user starts with **zero todos** (created fresh in `beforeAll`). Tests within the file accumulate todos sequentially, which is correct — the existing tests are designed to run in order and expect cumulative state:

| Spec file | Test ordering | State assumption |
|---|---|---|
| `create-todo.spec.ts` | Test 1 creates "First todo" → Test 2 creates "Detailed todo" → Test 3 creates "Second todo" and checks ordering | Sequential cumulative — works because todos are ordered newest-first |
| `initial-load.spec.ts` | Fresh user = no todos → "No todos yet." shown | Needs empty list ✓ |
| All others | Self-contained (each test creates its own data) | No cross-test dependency |

**Important:** The `count(1)` check in `create-todo.spec.ts` test 1 works because the user starts fresh:
```ts
await expect(items).toHaveCount(1); // only "First todo" exists at this point
```

### Route Interception and Nested Test Routes

Some tests add their own `page.route()` on top of the `beforeEach` route (for failure simulation). Playwright stacks routes in LIFO order — the most recently added route handles the request. Calling `page.unroute(pattern)` removes the last matching route, restoring the `beforeEach` route underneath. This is correct behavior for the failure-simulation tests.

Example (`create-todo.spec.ts` — "shows error banner and preserves input when create fails"):
1. `beforeEach` adds `**/api/**` route (injects user ID, calls `route.continue()`)
2. Test adds `**/api/todos` route (simulates POST failure) — takes precedence for that URL
3. Test calls `page.unroute("**/api/todos")` — removes the failure route
4. Retry hits `**/api/**` route again — user ID injection still works ✓

### Data Persistence Test — Route Survives Reload

The `persistence.spec.ts` test uses `page.reload()`. The `page.route()` interception added in `beforeEach` persists across reloads (it is attached to the `page` object, not the document). After reload, the GET /api/todos call still carries the correct `x-user-id` header. ✓

### Files to Create

- `packages/web/e2e/test-utils/auth.ts` — new auth utility
- `packages/web/e2e/initial-load.spec.ts`
- `packages/web/e2e/create-todo.spec.ts`
- `packages/web/e2e/inline-edit.spec.ts`
- `packages/web/e2e/toggle-completion.spec.ts`
- `packages/web/e2e/delete-todo.spec.ts`
- `packages/web/e2e/persistence.spec.ts`

### Files to Modify

- `packages/web/e2e/test-utils/index.ts` — add `registerTestUser` export
- `packages/web/e2e/playwright.config.ts` — add `workers: 4`
- `_bmad-output/planning-artifacts/architecture.md` — update file tree under `e2e/`

### Files to Delete

- `packages/web/e2e/todo-flows.spec.ts` — replaced by 6 separate spec files

### Files Unchanged

- `packages/web/e2e/global-setup.ts` — DB reset still runs once before the suite; no changes needed
- `packages/web/e2e/test-utils/deferred.ts` — unchanged
- `packages/web/src/` — no web source changes
- `packages/api/` — no API changes
- `.env`, `.env.test` — no changes
- `packages/shared/` — no changes (`DEFAULT_USER_ID` remains, removed in Story 6.3)

### Route URLs in Tests — Existing Patterns

Existing tests use these route patterns for failure simulation (copy verbatim into new spec files):
- `**/api/todos` — matches GET and POST on the todos collection
- `**/api/todos/*` — matches PATCH and DELETE on individual todos

These patterns work against the Vite dev server proxy at `http://localhost:5174` which forwards to the API.

### References

- Current E2E spec (to split): [packages/web/e2e/todo-flows.spec.ts](packages/web/e2e/todo-flows.spec.ts)
- Playwright config: [packages/web/e2e/playwright.config.ts](packages/web/e2e/playwright.config.ts)
- Global setup: [packages/web/e2e/global-setup.ts](packages/web/e2e/global-setup.ts)
- E2E test utils: [packages/web/e2e/test-utils/index.ts](packages/web/e2e/test-utils/index.ts)
- Auth API route (register): `packages/api/src/routes/auth/index.ts`
- Architecture doc: [_bmad-output/planning-artifacts/architecture.md](_bmad-output/planning-artifacts/architecture.md)
- Previous story (6.2): [_bmad-output/implementation-artifacts/6-2-auth-middleware-jwt-verification-and-test-infrastructure-migration.md](_bmad-output/implementation-artifacts/6-2-auth-middleware-jwt-verification-and-test-infrastructure-migration.md)
- Project context: [project-context.md](project-context.md)
- Test env: [.env.test](.env.test) — `API_HOST=127.0.0.1`, `API_PORT=3002`, `WEB_PORT=5174`

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

None — implementation was straightforward with no debugging required.

### Completion Notes List

- Created `packages/web/e2e/test-utils/auth.ts` with `registerTestUser` that POSTs to `/auth/register` and returns `userId`
- Updated `packages/web/e2e/test-utils/index.ts` to export `registerTestUser` (sorted alphabetically per biome)
- Split `todo-flows.spec.ts` (26 tests, 1 file) into 6 feature spec files: `initial-load`, `create-todo`, `inline-edit`, `toggle-completion`, `delete-todo`, `persistence`
- Each spec file uses `beforeAll` to register a fresh user and `beforeEach` to intercept `**/api/**` requests injecting `x-user-id` header for per-spec DB isolation
- Removed outer `test.describe("Todo flows", ...)` wrapper — each spec file is its own feature scope
- Added `workers: 4` to `playwright.config.ts` for parallel file execution (without `fullyParallel` — tests within a file remain sequential)
- Deleted monolithic `packages/web/e2e/todo-flows.spec.ts`
- Updated `_bmad-output/planning-artifacts/architecture.md` file tree to reflect new e2e structure
- All 26 tests pass in 21.3s using 4 workers; type:check and biome:check clean

### Review Findings

- [x] [Review][Patch] No HTTP status check in `registerTestUser` before deserializing response body [packages/web/e2e/test-utils/auth.ts:26]
- [x] [Review][Defer] `create-todo.spec.ts` test 3 depends on test 2's accumulated DB state [packages/web/e2e/create-todo.spec.ts:67-68] — deferred, spec-designed sequential accumulation; retry edge case is low risk with retries:0
- [x] [Review][Defer] `deferred.promise.then()` without `.catch()` in route failure handlers — deferred, pre-existing pattern moved verbatim from todo-flows.spec.ts
- [x] [Review][Defer] Keyboard tab-order test in toggle-completion.spec.ts fragile on DOM changes — deferred, pre-existing pattern
- [x] [Review][Defer] delete-todo.spec.ts focus assertion doesn't verify which checkbox is focused — deferred, pre-existing pattern
- [x] [Review][Defer] persistence.spec.ts test could trivially pass on retry (userId is module-scoped) — deferred, retries:0 in current config

### Change Log

- 2026-04-10: Story 6.2.1 created — parallelize E2E tests with per-user isolation
- 2026-04-10: Story 6.2.1 implemented — split into 6 spec files, workers: 4, all 26 tests passing in parallel
- 2026-04-10: Story 6.2.1 code review — 1 patch, 5 deferred, 5 dismissed
