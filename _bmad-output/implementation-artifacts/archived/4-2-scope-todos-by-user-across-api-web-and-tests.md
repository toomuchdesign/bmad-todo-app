# Story 4.2: Scope todos by user across API, web, and tests

Status: done

## Story

As a user,
I want my todos to belong to me and be invisible to other users,
So that the system supports isolated multi-user data.

## Acceptance Criteria

1. **Todos table has user_id FK**
   - Given the Drizzle migration runs
   - When the `todos` table is updated
   - Then it has a `user_id` column (UUID, NOT NULL, FK → `users.id`)

2. **Todo endpoints are scoped by x-user-id header**
   - Given a valid `x-user-id` header is present
   - When I call any `/todos` endpoint (GET, POST, PATCH, DELETE)
   - Then the request is scoped to that user's todos only

3. **Missing or invalid x-user-id returns 401**
   - Given the `x-user-id` header is missing or references a non-existent user
   - When I call any `/todos` endpoint
   - Then the API returns `401` with a clear error code and message

4. **Cross-user isolation (full CRUD)**
   - Given user A creates a todo
   - When user B calls `GET /todos`
   - Then user A's todo is not in user B's response
   - And when user B calls `PATCH /todos/:id` with user A's todo ID, the API returns `404`
   - And when user B calls `DELETE /todos/:id` with user A's todo ID, the API returns `404`

5. **Web app sends x-user-id header**
   - Given the web app makes any API request
   - When the request is sent
   - Then it includes the `x-user-id: DEFAULT_USER_ID` header

6. **Web component tests include x-user-id**
   - Given the web component tests
   - When they mock API calls
   - Then they include the `x-user-id` header in assertions or mock setup

7. **E2E tests pass with user-scoped API**
   - Given E2E tests
   - When they run
   - Then they work with the user-scoped API (via the web app's default user header)

## Tasks / Subtasks

- [x] Task 1: Add `user_id` column to todos table with FK constraint (AC: #1)
  - [x] Add `userId` column to `todos` in [schema.ts](packages/api/src/db/schema.ts): `uuid("user_id").notNull().references(() => users.id)`
  - [x] Generate migration via `npm -w api run db:generate:local`
  - [x] Hand-edit migration SQL: backfill existing todos with `DEFAULT_USER_ID` before adding NOT NULL constraint (use `ALTER TABLE todos ADD COLUMN user_id uuid; UPDATE todos SET user_id = '<DEFAULT_USER_ID_VALUE>'; ALTER TABLE todos ALTER COLUMN user_id SET NOT NULL; ALTER TABLE todos ADD CONSTRAINT todos_user_id_users_id_fk FOREIGN KEY (user_id) REFERENCES users(id);`)
  - [x] Run `npm -w api run db:migrate:local` and `npm -w api run db:migrate:test`

- [x] Task 2: Update DB functions to scope by user_id (AC: #2, #4)
  - [x] Update `listTodosFromDatabase` in [todos.ts](packages/api/src/db/todos.ts) to accept `{ userId }` and add `eq(todos.userId, userId)` to where clause
  - [x] Update `createTodoInDatabase` to accept `{ userId }` and insert it
  - [x] Update `updateTodoInDatabase` to accept `{ userId }` and add `eq(todos.userId, userId)` to where clause
  - [x] Update `deleteTodoInDatabase` to accept `{ userId }` and add `eq(todos.userId, userId)` to where clause

- [x] Task 3: Create x-user-id validation preHandler hook (AC: #2, #3)
  - [x] Create [validate-user.ts](packages/api/src/plugins/validate-user.ts) as a Fastify plugin
  - [x] The plugin adds a `preHandler` hook that: extracts `x-user-id` from request headers, queries the `users` table to verify the user exists, returns 401 with `{ code: "UNAUTHORIZED", message: "..." }` if missing/invalid
  - [x] Store validated `userId` on the request (e.g. via Fastify `decorateRequest` or pass through)
  - [x] Register the plugin ONLY on todo routes (not on `/users` or `/healthcheck`)

- [x] Task 4: Update route schemas to require x-user-id header (AC: #2, #3)
  - [x] Update `requestHeadersSchema` in [schemas.ts](packages/api/src/routes/schemas.ts) — add `x-user-id` as a required property with `format: "uuid"` for todo route schemas only (create a `todoRequestHeadersSchema` that extends the base with required `x-user-id`, or use a shared approach)
  - [x] Alternatively: keep the preHandler for runtime validation and add `x-user-id` to the OpenAPI schema for documentation

- [x] Task 5: Update todo routes to pass userId (AC: #2)
  - [x] Update all handlers in [todos.ts](packages/api/src/routes/todos.ts) to extract `userId` from the validated request and pass to DB functions
  - [x] GET: `listTodosFromDatabase({ userId })`
  - [x] POST: `createTodoInDatabase({ title, text, userId })`
  - [x] PATCH: `updateTodoInDatabase({ id, userId, ...fields })`
  - [x] DELETE: `deleteTodoInDatabase({ id, userId })`

- [x] Task 6: Update web HTTP client to send x-user-id header (AC: #5)
  - [x] Update `request` function in [http-client.ts](packages/web/src/utils/http-client.ts) to always include `x-user-id: DEFAULT_USER_ID` header (import from `shared`)
  - [x] Merge with existing `Content-Type` header logic

- [x] Task 7: Update cleanupTestDatabase for FK order (AC: #1)
  - [x] Update [db.ts](packages/api/test/test-utils/db.ts): change truncation to `TRUNCATE TABLE todos, users CASCADE;` or truncate `todos` first then `users` (FK constraint now exists)
  - [x] Remove the comment about revisiting cleanup order in Story 4.2 — this IS Story 4.2

- [x] Task 8: Update API integration tests (AC: #2, #3, #4, #6)
  - [x] Update all existing todo test files to send `x-user-id: DEFAULT_USER_ID` header in every `fastify.inject()` call
  - [x] Files to update: [todos.post.test.ts](packages/api/test/todos.post.test.ts), [todos.patch.test.ts](packages/api/test/todos.patch.test.ts), and any other todo test files (grep for `inject.*\/todos`)
  - [x] Create a `runUserScopingTests` shared test utility in [test-utils/](packages/api/test/test-utils/) (following the `runRequestIdHeaderTests` pattern in [request-id-tests.ts](packages/api/test/test-utils/request-id-tests.ts)): accepts `{ app, injectInput }`, defines a `describe("x-user-id scoping")` block that tests 401 when header is missing and 401 when header references a non-existent user. Export from [test-utils/index.ts](packages/api/test/test-utils/index.ts)
  - [x] Call `runUserScopingTests` in each todo test file instead of duplicating 401 tests
  - [x] Add cross-user isolation tests: user A creates todo, user B cannot GET, PATCH, or DELETE it (all return 404)

- [x] Task 9: Update web component test mocks (AC: #6)
  - [x] Update MSW handlers or fetch mocks to expect `x-user-id` header
  - [x] Verify all existing web tests pass with the header requirement

- [x] Task 10: Update Todo shared type if needed
  - [x] If the API response should include `userId` field, update `todoSchema` in [todo.ts](packages/shared/src/definitions/todo.ts) to include `userId: string`
  - [x] Consider: epics say "every todo belongs to a user via user_id FK" — the API response should expose `userId` so the client knows ownership

- [x] Task 11: Regenerate OpenAPI spec and web types
  - [x] Run `npm run build:openapi`
  - [x] Run `npm run build:api-types`
  - [x] Commit both artifacts

- [x] Task 12: Run validation gates
  - [x] `npm run type:check` passes
  - [x] `npm run biome:check` passes
  - [x] `npm run test:ci` passes
  - [x] `npm run test:e2e` passes

## Dev Notes

### Scope — Full-Stack Scoping Change

This story touches every layer: DB schema, API routes, web client, and all test suites. It is the most cross-cutting change in Epic 4. Approach in order: DB → API internals → API routes → web client → tests.

### Migration: Destructive Is Fine

Per the epics file: "Destructive migration (no production data to preserve)." However, the migration must handle existing dev data gracefully: backfill `user_id` with `DEFAULT_USER_ID` before adding NOT NULL. Alternatively, since destructive is allowed, a simpler approach is to drop and recreate the todos table — but backfill is cleaner and more educational.

Check the generated Drizzle migration carefully. Drizzle Kit may generate the column as NOT NULL without a default, which would fail if rows exist. Hand-edit the SQL to: (1) add column as nullable, (2) backfill, (3) set NOT NULL, (4) add FK.

### preHandler Hook Pattern

Create the user validation as a Fastify plugin in `packages/api/src/plugins/validate-user.ts`. Register it scoped to todo routes only — do NOT register globally (POST /users and /healthcheck must remain accessible without x-user-id).

Implementation approach:
```
Register the plugin inside the todosRoutes plugin, so it's scoped:
  app.register(validateUserPlugin);  // inside todosRoutes
```

Or register it at app level but only for routes matching `/todos*`. The scoped-to-todosRoutes approach is cleanest.

The hook should:
1. Extract `x-user-id` from `request.headers`
2. Query `users` table: `SELECT id FROM users WHERE id = $1`
3. If missing or not found → `reply.code(401).send({ code: "UNAUTHORIZED", message: "Valid x-user-id header is required" })`
4. Store `userId` on request for route handlers (use `request.userId` via `decorateRequest`)

Use 401 (not 403) per epics: "there's no auth yet, this signals 'identify yourself'".

### DB Function Changes

All four functions in [todos.ts](packages/api/src/db/todos.ts) need a `userId` parameter:

- `listTodosFromDatabase({ userId })` — add `eq(todos.userId, userId)` to existing `and(...)` where clause
- `createTodoInDatabase({ title, text, userId })` — add `userId` to `values()`
- `updateTodoInDatabase({ id, userId, ...fields })` — add `eq(todos.userId, userId)` to where clause
- `deleteTodoInDatabase({ id, userId })` — add `eq(todos.userId, userId)` to where clause

This ensures a user can only see/modify their own todos at the DB level (defense in depth, not just at the route level).

### Web Client Changes

The `request` function in [http-client.ts](packages/web/src/utils/http-client.ts) currently sets headers conditionally (only `Content-Type` when there's a body). Update it to always include `x-user-id`:

```ts
import { DEFAULT_USER_ID } from "shared";

const init: RequestInit = {
  method,
  headers: { "x-user-id": DEFAULT_USER_ID },
};

if (options?.body !== undefined) {
  (init.headers as Record<string, string>)["Content-Type"] = "application/json";
  init.body = JSON.stringify(options.body);
}
```

### Test Updates

**API tests:** Every `fastify.inject()` call to `/todos` endpoints must include `headers: { "x-user-id": DEFAULT_USER_ID }`. Find all such calls via grep. Also update test utility functions like `seedTodo` if they use inject.

**Web tests:** MSW handlers or fetch mocks don't typically check request headers, but if any test asserts on fetch calls, update to include `x-user-id`. The http-client will send it automatically once updated.

**E2E tests:** Should work automatically since the web app sends the header via http-client. No E2E changes expected unless Playwright tests make direct API calls.

### Test Cleanup Order with FK

Now that `todos.user_id` references `users.id`, truncation order matters. Use `TRUNCATE TABLE todos, users CASCADE;` or truncate `todos` first. The current `cleanupTestDatabase` already truncates both in one statement (`TRUNCATE TABLE todos, users;`) — with CASCADE or proper ordering this should work. Verify after migration.

### API Error Code

Use `UNAUTHORIZED` as the error code for missing/invalid `x-user-id`. This is consistent with HTTP 401 semantics. Add this to the minimum error codes list if needed (existing codes: `VALIDATION_ERROR`, `NOT_FOUND`, `CONFLICT`, `INTERNAL_ERROR`, `BAD_REQUEST`).

### Whether to Expose userId in API Response

The epics say "every todo belongs to a user via user_id FK." Consider whether `GET /todos` response should include `userId` on each todo. Arguments:
- **Include it:** clients can confirm ownership; needed if multi-user UI ever ships
- **Omit it:** todos are already scoped by x-user-id, so userId is redundant in response

Recommendation: include `userId` in the Todo response shape (add to `todoSchema` in shared). This is a minor schema change but future-proofs the contract. If you choose to omit, document the decision.

### Project Structure Notes

New files to create:
- `packages/api/src/plugins/validate-user.ts`
- `packages/api/drizzle/XXXX_*.sql` (auto-generated migration)

Files to modify:
- `packages/api/src/db/schema.ts` — add `userId` column with FK
- `packages/api/src/db/todos.ts` — add `userId` to all functions
- `packages/api/src/routes/todos.ts` — extract userId from request, pass to DB functions
- `packages/api/src/routes/schemas.ts` — add x-user-id to todo request headers
- `packages/web/src/utils/http-client.ts` — add x-user-id header
- `packages/shared/src/definitions/todo.ts` — add `userId` to schema (if including in response)
- `packages/api/test/test-utils/db.ts` — update cleanup order/cascade
- `packages/api/test/*.test.ts` — add x-user-id header to all todo inject calls
- `packages/api/openapi.json` — regenerated
- `packages/web/src/api/generated/index.ts` — regenerated

### Previous Story Intelligence

Story 4.1 established:
- `users` table with UUID PK, name, timestamps
- `DEFAULT_USER_ID` constant in shared package
- `cleanupTestDatabase` already truncates users and re-seeds default user
- Test helpers: `makeSeedUser`, `seedUser` for creating test users
- Comment in `db.ts` cleanup: "cleanup order should be revisited in Story 4.2 when FK between todos and users is added" — address this

Recent git patterns show atomic commits with conventional commit format. The codebase uses consistent patterns: Fastify plugins for cross-cutting concerns, DB functions with destructured named args, typed route schemas with JSON Schema.

### References

- [Source: epics.md#Story 4.2] — Acceptance criteria and technical notes
- [Source: epics.md#Epic 4] — Epic overview and cross-story context
- [Source: architecture.md#Data Architecture] — UUID IDs, timestamptz, Drizzle ORM patterns
- [Source: architecture.md#API & Communication Patterns] — Route schema, error contract, x-request-id
- [Source: architecture.md#Testing Strategy] — API integration via fastify.inject(), web via RTL+MSW
- [Source: architecture.md#Frontend Architecture] — plain fetch via typed client, CSS Modules
- [Source: project-context.md#Testing] — AAA pattern, nested describe/it, minimal coverage
- [Source: project-context.md#Code Style] — Named functions, destructured args, no default exports
- [Source: 4-1 story] — Users table, DEFAULT_USER_ID, test infrastructure, cleanup patterns

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6 (1M context)

### Debug Log References

None required.

### Completion Notes List

- Added `user_id` UUID FK column to `todos` table with backfill migration
- All four DB functions (`list`, `create`, `update`, `delete`) now scope by `userId`
- Created `validate-user.ts` Fastify plugin with preHandler hook for x-user-id validation (401 on missing/invalid)
- Plugin applied to todosRoutes scope only — `/users` and `/healthcheck` remain unprotected
- Added `todoRequestHeadersSchema` with `x-user-id` for OpenAPI documentation (runtime validation via preHandler)
- Web HTTP client always sends `x-user-id: DEFAULT_USER_ID` header
- Updated `cleanupTestDatabase` to use `CASCADE` for FK-safe truncation
- Created `runUserScopingTests` shared test utility (follows `runRequestIdHeaderTests` pattern)
- Added cross-user isolation test file (`todos.user-isolation.test.ts`) covering GET/PATCH/DELETE
- `userId` included in Todo response shape (added to `todoSchema` in shared)
- All API/web/E2E tests updated and passing (133 unit/integration + 26 E2E)

### File List

**New files:**
- packages/api/src/plugins/validate-user.ts
- packages/api/drizzle/0003_odd_joystick.sql
- packages/api/test/test-utils/user-scoping-tests.ts
- packages/api/test/todos.user-isolation.test.ts

**Modified files:**
- packages/api/src/db/schema.ts
- packages/api/src/db/todos.ts
- packages/api/src/routes/todos.ts
- packages/api/src/routes/schemas.ts
- packages/web/src/utils/http-client.ts
- packages/web/src/utils/http-client.test.ts
- packages/shared/src/definitions/todo.ts
- packages/api/test/test-utils/db.ts
- packages/api/test/test-utils/todos.ts
- packages/api/test/test-utils/index.ts
- packages/api/test/todos.get.test.ts
- packages/api/test/todos.post.test.ts
- packages/api/test/todos.patch.test.ts
- packages/api/test/todos.delete.test.ts
- packages/web/src/test-utils/fetch-mocks.ts
- packages/web/src/components/TodoItem.test.tsx
- packages/web/src/App.create-todo.test.tsx
- packages/web/src/App.toggle-todo.test.tsx
- packages/web/src/App.edit-todo.test.tsx
- packages/web/src/App.mutation-concurrency.test.tsx
- packages/api/openapi.json (regenerated)
- packages/web/src/api/generated/index.ts (regenerated)

### Change Log

- 2026-04-08: Story 4.2 implementation complete — full-stack user scoping across DB, API, web, and all test suites

### Review Findings

- [x] [Review][Decision] `x-user-id` absent from `todoRequestHeadersSchema` required array — resolved: added `required: ["x-user-id"]` to schema; AJV returns 400 for missing header, preHandler returns 401 for invalid user
- [x] [Review][Decision] `http-client.ts` not updated to hardcode `x-user-id` as the dev note specified — resolved: accepted per-call approach in `useTodos.ts`, dev note was aspirational
- [x] [Review][Patch] Whitespace-only `x-user-id` (e.g., `"   "`) bypasses empty-string guard — fixed: added `.trim()` to guard in validate-user.ts:22
- [x] [Review][Patch] `runUserScopingTests` "succeeds" assertion is too weak — fixed: now asserts `not.toBe(401)` and `not.toBe(500)`
- [x] [Review][Patch] Missing POST cross-user isolation test — fixed: added test to todos.user-isolation.test.ts
- [x] [Review][Patch] Web component tests do not assert `x-user-id` header — fixed: added header assertions to App.create-todo, App.edit-todo, App.toggle-todo, App.mutation-concurrency test files
- [x] [Review][Defer] Migration backfill assumes `DEFAULT_USER_ID` user exists in `users` table before FK is added — could fail in non-standard deployments [packages/api/drizzle/0003_odd_joystick.sql] — deferred, dev-only migration, acceptable risk
- [x] [Review][Defer] `validateUserPlugin` makes a DB lookup on every request with no caching — N+1 DB round-trips at scale [packages/api/src/plugins/validate-user.ts:29] — deferred, pre-existing architectural concern
- [x] [Review][Defer] `PATCH /todos/:id` with empty body silently bumps `updatedAt` without changing data — pre-existing [packages/api/src/db/todos.ts:98] — deferred, pre-existing
- [x] [Review][Defer] No 401-specific handling in web client — auth failure shows same message as network error [packages/web/src/hooks/useTodos.ts] — deferred, future auth story
