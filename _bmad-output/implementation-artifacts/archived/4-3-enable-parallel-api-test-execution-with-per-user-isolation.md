# Story 4.3: Enable parallel API test execution with per-user isolation

Status: done

## Story

As a developer,
I want API tests to run in parallel using per-file user isolation,
So that the test suite runs faster without DB concurrency issues.

## Acceptance Criteria

1. **Per-file user isolation**
   - Given each API test file
   - When it sets up test data
   - Then it creates its own user via `POST /users` and uses that user's ID for all requests
   - And cleanup is scoped to `DELETE FROM todos WHERE user_id = $testUserId`

2. **Parallel execution enabled**
   - Given the API vitest config
   - When tests run
   - Then `fileParallelism` is `true` and all test files pass concurrently

3. **Cross-file data isolation**
   - Given any two test files running in parallel
   - When both create and query todos
   - Then neither file sees the other's data

## Tasks / Subtasks

- [x] Task 1: Create per-file test setup helper (AC: #1, #3)
  - [x] Create a helper function (e.g., `createTestUser`) in [test-utils/](packages/api/test/test-utils/) that calls `POST /users` via `app.inject()` and returns `{ userId, headers }` where `headers = { "x-user-id": userId }`
  - [x] Create a helper function (e.g., `cleanupUserTodos`) that runs `DELETE FROM todos WHERE user_id = $testUserId` via `runQuery`
  - [x] Export both from [test-utils/index.ts](packages/api/test/test-utils/index.ts)

- [x] Task 2: Remove global truncation from vitest.setup.ts (AC: #1, #2)
  - [x] Remove the `beforeEach(cleanupTestDatabase)` call from [vitest.setup.ts](packages/api/vitest.setup.ts)
  - [x] Keep the `cleanupTestDatabase` function in [test-utils/db.ts](packages/api/test/test-utils/db.ts) for reference or potential reuse, but it is no longer called globally
  - [x] Consider whether to keep the `cleanupTestDatabase` function or remove it entirely — if nothing imports it after refactoring, remove it

- [x] Task 3: Update each test file to use per-user setup (AC: #1, #3)
  - [x] In each test file (`todos.get.test.ts`, `todos.post.test.ts`, `todos.patch.test.ts`, `todos.delete.test.ts`, `todos.user-isolation.test.ts`, `users.post.test.ts`):
    - [x] Add a file-level `beforeAll` that creates a unique test user via the helper and stores the `userId` and `headers`
    - [x] Replace `DEFAULT_HEADERS` / `{ "x-user-id": DEFAULT_USER_ID }` with the per-file user headers
    - [x] Add a file-level `beforeEach` that cleans up only that user's todos via `cleanupUserTodos`
    - [x] Update `seedTodo` calls to use the file's `userId` instead of `DEFAULT_USER_ID`
  - [x] Special handling for `todos.user-isolation.test.ts`: this file tests cross-user behavior, so it likely already creates multiple users — adapt its setup to be self-contained without relying on global cleanup
  - [x] Special handling for `users.post.test.ts`: this file tests user creation, so it may not need todo cleanup — adapt accordingly

- [x] Task 4: Update shared test suites for per-user context (AC: #1)
  - [x] Update `runUserScopingTests` in [user-scoping-tests.ts](packages/api/test/test-utils/user-scoping-tests.ts) if it relies on `DEFAULT_USER_ID` being the only user — ensure it works when multiple users exist concurrently
  - [x] Update `runRequestIdHeaderTests` in [request-id-tests.ts](packages/api/test/test-utils/request-id-tests.ts) if it hardcodes headers — ensure it accepts dynamic headers
  - [x] Verify `makeSeedTodo` default `userId` is overridden by test files (it currently defaults to `DEFAULT_USER_ID`)

- [x] Task 5: Enable fileParallelism in vitest config (AC: #2)
  - [x] Change `fileParallelism: false` to `fileParallelism: true` in [vitest.config.ts](packages/api/vitest.config.ts)

- [x] Task 6: Run validation gates (AC: #1, #2, #3)
  - [x] `npm run type:check` passes
  - [x] `npm run biome:check` passes
  - [x] `npm run test:ci` passes (all test files pass concurrently)
  - [x] Run `npm run test:ci` multiple times (at least 3) to verify no flaky race conditions
  - [x] `npm run test:e2e` passes (unchanged, but verify no regressions)

### Review Findings

- [x] [Review][Decision] `createTestContext` hides lifecycle hooks inside a utility — resolved: keep factory, updated project-context.md to document exception
- [x] [Review][Decision] `todos.user-isolation.test.ts` does not use `createTestContext` — resolved: kept manual dual-user setup, added comment explaining why
- [x] [Review][Decision] `vitest.setup.ts` is effectively empty — resolved: kept as placeholder for future global hooks
- [x] [Review][Decision] Test users accumulate in DB — resolved: added `DELETE FROM todos` then `DELETE FROM users` in `afterAll` (both in `createTestContext` and `todos.user-isolation.test.ts`)
- [x] [Review][Decision] `users.post.test.ts` uses `createTestContext` — resolved: replaced with lightweight manual `buildApp` setup, added comment explaining circular-dependency rationale
- [x] [Review][Patch] `createTestUser` lacks status-code validation — fixed: added 201 guard, throws with status + body on failure [packages/api/test/test-utils/db.ts]
- [x] [Review][Patch] `createTestUser` uses `Date.now()` for name uniqueness — fixed: replaced with `randomUUID()` [packages/api/test/test-utils/db.ts]
- [x] [Review][Patch] `createTestContext` getter provides no guard if called before `beforeAll` completes — fixed: throws if `app` is uninitialized [packages/api/test/test-utils/db.ts]
- [x] [Review][Patch] `createTestContext` `afterAll` calls `app.close()` on potentially-`undefined` `app` — fixed: null guard added [packages/api/test/test-utils/db.ts]
- [x] [Review][Patch] `createTestContext` `beforeEach` calls `cleanupUserTodos` with potentially-`undefined` `userId` — fixed: throws if `testUserId` is uninitialized [packages/api/test/test-utils/db.ts]
- [x] [Review][Patch] `fileParallelism` removed rather than explicitly set to `true` — fixed: added explicit `fileParallelism: true` [packages/api/vitest.config.ts]
- [x] [Review][Defer] Pre-existing: `users.post.test.ts` seed test lacks AAA structure — not introduced by this story [packages/api/test/users.post.test.ts] — deferred, pre-existing
- [x] [Review][Defer] `runUserScopingTests` "valid user" test assumes `injectInput` always carries valid headers — intentional design, load-bearing by convention [packages/api/test/test-utils/user-scoping-tests.ts] — deferred, intentional design
- [x] [Review][Defer] `app.test.ts` has no `beforeEach` cleanup — acceptable because the file writes no DB state [packages/api/test/app.test.ts] — deferred, no DB writes in file
- [x] [Review][Defer] `cleanupUserTodos` has no error diagnostics — a failure surfaces as a hook error with no `userId` context, harder to debug under parallel execution [packages/api/test/test-utils/db.ts] — deferred, minor observability gap
- [x] [Review][Defer] `runUserScopingTests` "valid user" test conflates Arrange context into Act comment — minor AAA style issue [packages/api/test/test-utils/user-scoping-tests.ts] — deferred, minor style issue

## Dev Notes

### Scope — Test Infrastructure Only

No product code changes. This is purely a test infrastructure refactoring to enable parallel API test execution. The only files affected are in `packages/api/test/` and `packages/api/vitest.config.ts` / `vitest.setup.ts`.

### Current State (What Needs to Change)

- `vitest.config.ts`: `fileParallelism: false` — sequential execution
- `vitest.setup.ts`: `beforeEach(cleanupTestDatabase)` — global truncation of ALL todos and users, then re-seeds `DEFAULT_USER_ID` before every test
- All test files use `DEFAULT_HEADERS = { "x-user-id": DEFAULT_USER_ID }` and seed data for `DEFAULT_USER_ID`
- `cleanupTestDatabase()` in `db.ts`: truncates `todos` then `users` with `CASCADE`, then re-inserts `DEFAULT_USER_ID` user

### Target State

- `vitest.config.ts`: `fileParallelism: true`
- `vitest.setup.ts`: empty or removed global `beforeEach` — no global cleanup
- Each test file creates its own user in `beforeAll`, uses that user's ID for all operations, and cleans only its own todos in `beforeEach`
- Files can run concurrently because each operates on isolated user data
- `DEFAULT_USER_ID` is no longer used in test files (each file creates its own user)

### Per-File Setup Pattern

Each test file should follow this pattern:

```ts
import { buildApp } from "../src/app";
import { createTestUser, cleanupUserTodos, seedTodo, makeSeedTodo } from "./test-utils";

let app: FastifyInstance;
let testUserId: string;
let testHeaders: Record<string, string>;

beforeAll(async () => {
  app = await buildApp({ logger: false });
  const testUser = await createTestUser({ app });
  testUserId = testUser.userId;
  testHeaders = testUser.headers;
});

afterAll(async () => {
  await app.close();
});

beforeEach(async () => {
  await cleanupUserTodos({ userId: testUserId });
});
```

Note: this moves `app` creation from `beforeEach` to `beforeAll` since we need the app to create the user. This is safe because each file gets its own isolated app instance and user. The `beforeEach` only cleans up todos, not the app.

### App Lifecycle Change

Currently, each test file creates and closes the app in `beforeEach`/`afterEach`. For per-user isolation, the app must be available in `beforeAll` to create the user. Two options:

1. **Move app to `beforeAll`/`afterAll`** (recommended): app lives for the file's lifetime. Tests are faster (no app rebuild per test). Safe because each file has its own user isolation.
2. **Create a temporary app in `beforeAll` just for user creation, then per-test apps**: more complex, no clear benefit.

Go with option 1.

### Shared Test Suite Adaptation

`runUserScopingTests` and `runRequestIdHeaderTests` currently receive `app` as a function `() => app` (lazy evaluation). This pattern already works with the `beforeAll` approach since `app` is assigned before tests run.

However, `runUserScopingTests` tests the 401 behavior for missing/invalid `x-user-id`. It creates its own invalid user scenarios. Verify it doesn't depend on `DEFAULT_USER_ID` being the only user in the DB.

`runRequestIdHeaderTests` may hardcode headers — ensure it can accept dynamic `testHeaders` instead of assuming `DEFAULT_USER_ID`.

### User Isolation Test File

`todos.user-isolation.test.ts` explicitly tests cross-user isolation. It creates multiple users by design. Adapt it so:
- It creates its own users in `beforeAll` (user A and user B)
- Cleans up both users' todos in `beforeEach`
- Does not rely on global cleanup

### users.post.test.ts

This file tests `POST /users` which doesn't require `x-user-id`. It may not need per-user todo cleanup, but it does create users. Ensure created users don't collide with other test files' users (they won't, since each gets a random UUID from the API).

However, if `users.post.test.ts` previously relied on the global cleanup to remove users between tests, the cleanup strategy for this file is different: it only needs to clean up users IT created (other than the file's own test user). Consider whether this file needs adaptation or can remain as-is.

### Potential Gotchas

1. **`DEFAULT_USER_ID` seeding**: The global cleanup currently re-seeds `DEFAULT_USER_ID` before each test. With per-user isolation, `DEFAULT_USER_ID` may or may not exist depending on whether migrations seed it. Check if the Drizzle migration inserts the default user — if yes, it exists after DB setup and doesn't need re-seeding. If not, test files that still reference it will fail.

2. **Test ordering within a file**: Tests within a single file still run sequentially (Vitest's default). Only cross-file parallelism is enabled.

3. **Database connection pool**: Multiple test files hitting the DB concurrently could exhaust connections. The current `runQuery` creates a short-lived client per query. Monitor for connection errors during parallel execution.

4. **`seedTodo` default userId**: `makeSeedTodo()` defaults `userId` to `DEFAULT_USER_ID`. All callers must override this with their file's `testUserId`. Grep for `makeSeedTodo()` calls without a `userId` override.

5. **Shared test suites `injectInput`**: `runRequestIdHeaderTests` and `runUserScopingTests` receive `injectInput` config. Ensure the `headers` in `injectInput` use the file's `testHeaders` not `DEFAULT_HEADERS`.

### Files to Modify

- `packages/api/vitest.config.ts` — change `fileParallelism` to `true`
- `packages/api/vitest.setup.ts` — remove global `beforeEach(cleanupTestDatabase)`
- `packages/api/test/test-utils/db.ts` — add `cleanupUserTodos()`, evaluate keeping/removing `cleanupTestDatabase`
- `packages/api/test/test-utils/index.ts` — export new helpers
- `packages/api/test/todos.get.test.ts` — per-user setup
- `packages/api/test/todos.post.test.ts` — per-user setup
- `packages/api/test/todos.patch.test.ts` — per-user setup
- `packages/api/test/todos.delete.test.ts` — per-user setup
- `packages/api/test/todos.user-isolation.test.ts` — per-user setup (multi-user)
- `packages/api/test/users.post.test.ts` — evaluate if changes needed

No new files expected (helper goes into existing `db.ts` or a new file in `test-utils/`).

### Previous Story Intelligence

Story 4.2 established:
- All todo endpoints require `x-user-id` header (validated by `validate-user.ts` preHandler)
- DB functions scope all queries by `userId` — critical for parallel isolation
- `makeSeedUser`/`seedUser` helpers exist for creating test users directly in DB
- `makeSeedTodo` accepts `userId` override
- Cross-user isolation was already tested in `todos.user-isolation.test.ts`
- `cleanupTestDatabase` uses `TRUNCATE TABLE todos CASCADE; TRUNCATE TABLE users CASCADE;` then re-seeds DEFAULT_USER_ID

The fact that DB functions already scope by userId means parallel test files with different users are guaranteed not to see each other's data at the query level.

### Git Intelligence

Recent commits show conventional commit format. Last commit was `refactor: split API routes into per-domain folders with shared schemas`. The codebase uses consistent patterns: Fastify plugins, typed route schemas, test utilities exported from barrels.

### Project Structure Notes

- No new directories or structural changes
- Test utility barrel at `packages/api/test/test-utils/index.ts` is the single import point
- All test files are in `packages/api/test/`

### References

- [Source: epics.md#Story 4.3] — Acceptance criteria and technical notes
- [Source: epics.md#Epic 4] — Epic overview: parallel tests with per-user isolation
- [Source: architecture.md#Testing Strategy] — API integration via fastify.inject(), vitest
- [Source: project-context.md#Testing] — AAA pattern, nested describe/it, minimal coverage, test-utils barrels
- [Source: 4-2 story] — User scoping, validate-user plugin, test helpers, cleanup patterns
- [Source: NFR10] — "API test files run in parallel (fileParallelism: true) with each file using a distinct user for DB isolation"

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6 (1M context)

### Debug Log References

None — no debugging needed.

### Completion Notes List

- Created `createTestUser` and `cleanupUserTodos` helpers in `test-utils/db.ts`
- Removed global `beforeEach(cleanupTestDatabase)` from `vitest.setup.ts`; kept `cleanupTestDatabase` for `db-reset.ts` script
- Migrated all 7 API test files from `beforeEach`/`afterEach` app lifecycle to `beforeAll`/`afterAll` with per-file user creation
- Updated shared test suites (`runRequestIdHeaderTests`, `runUserScopingTests`) to accept dynamic headers and user IDs via `getHeaders`/`getValidUserId` callbacks
- `todos.user-isolation.test.ts` now creates two self-contained test users (A and B) instead of relying on `DEFAULT_USER_ID`
- `users.post.test.ts` moved to `beforeAll`/`afterAll` with no per-user todo cleanup needed
- `app.test.ts` moved to `beforeAll`/`afterAll` lifecycle
- Enabled `fileParallelism: true` in `vitest.config.ts`
- Ran `test:ci` 3 times with 0 flaky failures; all 134 tests pass concurrently
- E2E tests (26) pass with no regressions

### Change Log

- 2026-04-08: Implemented per-user test isolation and enabled parallel API test execution

### File List

- `packages/api/test/test-utils/db.ts` — added `createTestUser`, `cleanupUserTodos`; kept `cleanupTestDatabase` for db-reset script
- `packages/api/test/test-utils/index.ts` — updated barrel exports
- `packages/api/test/test-utils/request-id-tests.ts` — added `getHeaders` option for dynamic headers
- `packages/api/test/test-utils/user-scoping-tests.ts` — replaced `DEFAULT_USER_ID` with `getValidUserId` callback
- `packages/api/vitest.setup.ts` — removed global `beforeEach(cleanupTestDatabase)`
- `packages/api/vitest.config.ts` — `fileParallelism: true`
- `packages/api/test/todos.get.test.ts` — per-user setup
- `packages/api/test/todos.post.test.ts` — per-user setup
- `packages/api/test/todos.patch.test.ts` — per-user setup
- `packages/api/test/todos.delete.test.ts` — per-user setup
- `packages/api/test/todos.user-isolation.test.ts` — self-contained dual-user setup
- `packages/api/test/users.post.test.ts` — `beforeAll`/`afterAll` lifecycle
- `packages/api/test/app.test.ts` — `beforeAll`/`afterAll` lifecycle
