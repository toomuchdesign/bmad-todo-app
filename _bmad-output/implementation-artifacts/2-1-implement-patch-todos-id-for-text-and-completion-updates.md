# Story 2.1: Implement PATCH /todos/:id for text and completion updates

Status: done

## Story

As a user,
I want to update an existing todo,
So that I can correct it and reflect completion status.

## Acceptance Criteria

1. **Update text successfully**
   - Given an existing todo
   - When I call `PATCH /todos/:id` with a new valid `text`
   - Then the API returns `200` with the updated `Todo`
   - And `updatedAt` is advanced

2. **Update completion successfully**
   - Given an existing todo
   - When I call `PATCH /todos/:id` with `completed` changed
   - Then the API returns `200` with the updated `Todo`

3. **Validation error for invalid text**
   - Given the new text is empty/whitespace-only or too long
   - When I call `PATCH /todos/:id`
   - Then the API returns `400` with `code = VALIDATION_ERROR` and a user-displayable `message`

4. **Not found for missing ID**
   - Given the `:id` does not exist
   - When I call `PATCH /todos/:id`
   - Then the API returns `404` with `code = NOT_FOUND`

5. **Retry debounce fix (retro-driven)**
   - Given the `GlobalErrorBanner` is showing with a Retry button
   - When a fetch request is in-flight
   - Then the Retry button is disabled
   - And the existing retry test is updated to assert disabled state during fetch

6. **Pre-commit hook update (retro-driven)**
   - Given the pre-commit hook in `package.json`
   - When it runs
   - Then it executes `source:fix` then `source:check` before `test:ci`

## Tasks / Subtasks

- [x] Task 1: Add PATCH route schema (AC: #1, #2, #3, #4)
  - [x] Add `patchTodosRouteSchema` in `packages/api/src/routes/schemas.ts`
  - [x] Params schema: `{ id: { type: "string" } }`
  - [x] Body schema: `{ text?: string, completed?: boolean }` with same validation as POST for `text` (minLength, maxLength, pattern), both optional, `additionalProperties: false`
  - [x] Response schemas: `200` (todoSchema), `400` (apiErrorResponseSchema), `404` (apiErrorResponseSchema), `default` (apiErrorResponseSchema)
  - [x] Export `PatchTodosRouteResponses` type

- [x] Task 2: Add `updateTodoInDatabase` function (AC: #1, #2, #4)
  - [x] Add function in `packages/api/src/db/todos.ts`
  - [x] Accept `{ id: string, text?: string, completed?: boolean }`
  - [x] Use Drizzle `update().set().where().returning()` targeting the given `id` with `isNull(deletedAt)` filter
  - [x] Always set `updatedAt` to `new Date()` on any update
  - [x] Only include `text` and `completed` in the SET clause when provided
  - [x] Return `Todo | null` (null when no row matched — soft-deleted or non-existent)

- [x] Task 3: Register PATCH route handler (AC: #1, #2, #3, #4)
  - [x] Add `app.patch("/todos/:id", ...)` in `packages/api/src/routes/todos.ts`
  - [x] Import `updateTodoInDatabase` from db module
  - [x] Trim `text` before passing to DB (same as POST handler)
  - [x] If `updateTodoInDatabase` returns `null`, return 404 with `{ code: "NOT_FOUND", message: "Todo not found", requestId }`
  - [x] On success, return `200` with the updated `Todo`

- [x] Task 4: Regenerate OpenAPI and web types (AC: #1)
  - [x] Run `npm run build:openapi:api-types` to regenerate `packages/api/openapi.json` and `packages/web/src/api/generated/index.ts`
  - [x] Verify the PATCH endpoint appears in generated types

- [x] Task 5: Write API integration tests (AC: #1, #2, #3, #4)
  - [x] Create `packages/api/test/todos.patch.test.ts`
  - [x] Test: PATCH with valid `text` returns 200 with updated todo and advanced `updatedAt`
  - [x] Test: PATCH with `completed: true` returns 200 with updated todo
  - [x] Test: PATCH with both `text` and `completed` returns 200
  - [x] Test: PATCH with empty/whitespace text returns 400 VALIDATION_ERROR
  - [x] Test: PATCH with text exceeding MAX_TODO_TEXT_LENGTH returns 400
  - [x] Test: PATCH with non-existent ID returns 404 NOT_FOUND
  - [x] Test: PATCH on soft-deleted todo returns 404 NOT_FOUND
  - [x] Test: x-request-id header tests via `runRequestIdHeaderTests`
  - [x] Use `seedTodo` from test-utils to create test data

- [x] Task 6: Fix retry debounce in GlobalErrorBanner (AC: #5)
  - [x] Add `loading` prop to `GlobalErrorBanner` component (`packages/web/src/components/GlobalErrorBanner.tsx`)
  - [x] Disable the Retry button when `loading` is `true`
  - [x] Pass `loading` from `useTodos` to `GlobalErrorBanner` in `App.tsx`
  - [x] Update the existing retry test in `App.test.tsx` to assert button is `disabled` during fetch

- [x] Task 7: Update pre-commit hook (AC: #6)
  - [x] In root `package.json`, update `simple-git-hooks.pre-commit` to run `source:fix` before `source:check`
  - [x] New hook: `"npm run build:openapi:api-types:stage && npm run source:fix && npm run source:check && npm run test:ci && npm run test:e2e"`
  - [x] Run `npm run prepare` to apply the hook change

- [x] Task 8: Run all validation gates
  - [x] `npm run type:check` passes
  - [x] `npm run biome:check` passes
  - [x] `npm run test:ci` passes (all existing + new tests)
  - [x] `npm run test:e2e` passes (existing E2E tests unaffected)

### Review Findings

- [x] [Review][Patch] Non-UUID `:id` param triggers Postgres 500 instead of 400 — added `format: "uuid"` to `patchTodosRouteSchema.params.id` and `todoSchema.id` in shared
- [x] [Review][Defer] Pre-commit `source:fix` may silently modify already-staged files, leaving unstaged changes post-commit — deferred, pre-existing workflow choice from retro

## Dev Notes

### Story Scope

This is an API-only story for the PATCH endpoint plus two small retro-driven fixes. No new web UI features — Stories 2.2 and 2.3 will consume this endpoint from the frontend.

### Existing Patterns to Follow

**Route schema pattern** — follow `postTodosRouteSchema` in [schemas.ts](packages/api/src/routes/schemas.ts). Use the same `responseHeadersSchema`, `todoSchema`, and `apiErrorResponseSchema` imports. Add a `params` schema for `:id`.

**Route handler pattern** — follow the POST handler in [todos.ts](packages/api/src/routes/todos.ts). Trim text before DB call. Use `reply.code(status).send(body)`.

**DB function pattern** — follow `createTodoInDatabase` in [db/todos.ts](packages/api/src/db/todos.ts). Use the existing `mapTodoRowToApiTodo` helper for response mapping.

**Error handling** — the centralized error handler in [error-handler.ts](packages/api/src/plugins/error-handler.ts) already catches validation errors (from schema mismatch) and returns `VALIDATION_ERROR`. For 404, the route handler must return it explicitly since Drizzle won't throw.

**Test pattern** — follow [todos.post.test.ts](packages/api/test/todos.post.test.ts). Use `beforeEach`/`afterEach` at file scope for app setup/teardown. Use `seedTodo` from test-utils to insert test data. Use `runRequestIdHeaderTests` for x-request-id coverage.

### 404 Handling Detail

The `updateTodoInDatabase` function must filter by `isNull(deletedAt)` in addition to matching `id`. This means:
- A non-existent UUID returns null → 404
- A soft-deleted todo also returns null → 404 (consistent with GET which filters by `isNull(deletedAt)`)

### PATCH Body Semantics

Both `text` and `completed` are optional. The schema should NOT require either field — but the handler should still accept an empty body `{}` gracefully (Drizzle update with no SET fields is a no-op, but `updatedAt` should still advance since a PATCH was requested). Simplest: always include `updatedAt: new Date()` in the SET clause.

### Retry Debounce Fix

The `GlobalErrorBanner` at [GlobalErrorBanner.tsx](packages/web/src/components/GlobalErrorBanner.tsx) currently has no `loading` prop. Add it as optional (`loading?: boolean`), default to `false`. When `true`, set `disabled` attribute on the retry button. Pass `loading` from the `useTodos` hook through `App.tsx`.

### Pre-commit Hook

Current hook in [package.json](package.json:33):
```
"pre-commit": "npm run build:openapi:api-types:stage && npm run source:check && npm run test:ci && npm run test:e2e"
```

Updated to insert `source:fix` before `source:check`:
```
"pre-commit": "npm run build:openapi:api-types:stage && npm run source:fix && npm run source:check && npm run test:ci && npm run test:e2e"
```

After editing, run `npm run prepare` to update the git hook.

### Project Structure Notes

- No new files outside existing directories
- New test file: `packages/api/test/todos.patch.test.ts` (follows existing `todos.get.test.ts`, `todos.post.test.ts` naming)
- Modified files stay in their existing locations
- Architecture filesystem tree unchanged

### References

- [Source: epics.md#Story 2.1] — Acceptance criteria and retro-driven additions
- [Source: architecture.md] — API contract shape, error codes, tech stack
- [Source: epic-1-retro] — Retry debounce fix, pre-commit hook update decisions
- [Source: project-context.md] — Testing practices, coding conventions
- [Source: packages/api/src/routes/schemas.ts] — Route schema patterns
- [Source: packages/api/src/db/todos.ts] — DB function patterns with mapTodoRowToApiTodo
- [Source: packages/api/test/todos.post.test.ts] — Test patterns with seedTodo and runRequestIdHeaderTests
- [Source: packages/web/src/components/GlobalErrorBanner.tsx] — Current component (no loading prop)

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6 (1M context)

### Debug Log References

- Type errors fixed: Drizzle SET clause typing, exactOptionalPropertyTypes for route handler args
- Retry debounce required moving `setError(null)` from fetchTodos start to success path so error banner stays visible during retry

### Completion Notes List

- Implemented PATCH /todos/:id with text, completed, and combined updates
- Schema follows POST pattern with optional body fields and params for :id
- `updateTodoInDatabase` uses Drizzle update with `isNull(deletedAt)` filter, always advances `updatedAt`
- Route handler trims text and returns explicit 404 for missing/soft-deleted todos
- 9 new API integration tests covering all ACs (valid updates, validation errors, 404s, x-request-id)
- Retry debounce fix: added `loading` prop to GlobalErrorBanner, disabled button during fetch, updated useTodos to preserve error during retry
- Pre-commit hook updated to run `source:fix` before `source:check`
- OpenAPI spec and web types regenerated with PATCH endpoint

### Change Log

- 2026-03-30: Implemented story 2.1 — PATCH endpoint, retry debounce fix, pre-commit hook update

### File List

- packages/api/src/routes/schemas.ts (modified — added patchTodosRouteSchema)
- packages/api/src/db/todos.ts (modified — added updateTodoInDatabase)
- packages/api/src/routes/todos.ts (modified — added PATCH route handler)
- packages/api/openapi.json (regenerated — includes PATCH /todos/{id})
- packages/web/src/api/generated/index.ts (regenerated — includes PATCH types)
- packages/api/test/todos.patch.test.ts (new — 9 integration tests)
- packages/web/src/components/GlobalErrorBanner.tsx (modified — added loading prop)
- packages/web/src/App.tsx (modified — pass loading to GlobalErrorBanner)
- packages/web/src/hooks/useTodos.ts (modified — preserve error during retry)
- packages/web/src/App.test.tsx (modified — retry test asserts disabled button during fetch)
- package.json (modified — pre-commit hook includes source:fix)
