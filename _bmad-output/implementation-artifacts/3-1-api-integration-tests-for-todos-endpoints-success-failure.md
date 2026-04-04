# Story 3.1: API integration tests for todos endpoints (success + failure)

Status: done

## Story

As a maintainer,
I want fast API integration tests against a deterministic database,
So that API behavior stays correct as the UI evolves.

## Acceptance Criteria

1. **Full CRUD endpoint coverage**
   - Given a dedicated test database configuration
   - When I run the API test suite
   - Then tests cover `GET /todos`, `POST /todos`, `PATCH /todos/:id`, and `DELETE /todos/:id`
   - And tests include validation failures, not-found failures, and requestId/error-shape assertions

2. **Deterministic DB state**
   - Given tests run repeatedly
   - When each test starts
   - Then DB state is reset via truncation (not via a public reset endpoint)

## Tasks / Subtasks

- [x] Task 1: Audit existing API test coverage against acceptance criteria (AC: #1)
  - [x] Read all test files in `packages/api/test/` and catalog every test case
  - [x] Map each test case to the AC requirements below
  - [x] Identify gaps: missing success paths, missing failure paths, missing error-shape assertions, missing requestId assertions
  - [x] Document findings as a checklist of gaps to fill

- [x] Task 2: Fill GET /todos test gaps (AC: #1)
  - [x] Verify: returns empty array when no todos exist
  - [x] Verify: response shape matches `{ todos: Todo[] }` with all fields (`id`, `title`, `text`, `completed`, `createdAt`, `updatedAt`, `deletedAt`)
  - [x] Verify: ordering is `createdAt` descending (seed 3+ todos with distinct timestamps)
  - [x] Verify: soft-deleted todos excluded
  - [x] Verify: both completed and incomplete todos included
  - [x] Verify: `x-request-id` header tests via `runRequestIdHeaderTests`
  - [x] Verify: content-type is `application/json`

- [x] Task 3: Fill POST /todos test gaps (AC: #1)
  - [x] Verify: success with `{ title, text }` — returns 201 with full Todo shape
  - [x] Verify: success with `{ title }` only — `text` defaults to `""`
  - [x] Verify: server assigns `id`, `createdAt`, `updatedAt`, `deletedAt` (undefined)
  - [x] Verify: title is trimmed
  - [x] Verify: text is trimmed when provided
  - [x] Verify: empty/whitespace-only title → 400 `VALIDATION_ERROR`
  - [x] Verify: title exceeding `MAX_TODO_TITLE_LENGTH` (100) → 400 `VALIDATION_ERROR`
  - [x] Verify: text exceeding `MAX_TODO_TEXT_LENGTH` (500) → 400 `VALIDATION_ERROR`
  - [x] Verify: error response shape: `{ code: string, message: string }` with displayable message
  - [x] Verify: `x-request-id` header tests via `runRequestIdHeaderTests`

- [x] Task 4: Fill PATCH /todos/:id test gaps (AC: #1)
  - [x] Verify: update title only — returns 200 with updated Todo
  - [x] Verify: update text only — returns 200 with updated Todo
  - [x] Verify: update title + text together — returns 200
  - [x] Verify: update completed only — returns 200
  - [x] Verify: `updatedAt` advances on any update
  - [x] Verify: empty/whitespace title → 400 `VALIDATION_ERROR`
  - [x] Verify: title exceeding length → 400 `VALIDATION_ERROR`
  - [x] Verify: text exceeding length → 400 `VALIDATION_ERROR`
  - [x] Verify: non-existent UUID → 404 `NOT_FOUND`
  - [x] Verify: soft-deleted todo → 404 `NOT_FOUND`
  - [x] Verify: invalid UUID format → 400 `VALIDATION_ERROR`
  - [x] Verify: error response shape matches `ApiErrorResponse`
  - [x] Verify: `x-request-id` header tests via `runRequestIdHeaderTests`

- [x] Task 5: Fill DELETE /todos/:id test gaps (AC: #1)
  - [x] Verify: existing todo → 204 empty body
  - [x] Verify: soft delete sets `deletedAt` (verify via direct DB query or subsequent GET)
  - [x] Verify: deleted todo excluded from GET /todos
  - [x] Verify: non-existent UUID → 404 `NOT_FOUND`
  - [x] Verify: already soft-deleted todo → 404 `NOT_FOUND`
  - [x] Verify: invalid UUID format → 400 `VALIDATION_ERROR`
  - [x] Verify: `x-request-id` header tests via `runRequestIdHeaderTests`

- [x] Task 6: Verify deterministic DB reset (AC: #2)
  - [x] Confirm `packages/api/vitest.setup.ts` runs `cleanupTestDatabase` in global `beforeEach`
  - [x] Confirm no per-file DB reset duplication (unless justified)
  - [x] Confirm test isolation: no test depends on state from another test

- [x] Task 7: Run validation gates
  - [x] `npm run type:check` passes
  - [x] `npm run biome:check` passes
  - [x] `npm run test:ci` passes
  - [x] `npm run test:e2e` passes

### Review Findings

- [x] [Review][Decision] `.each` rule "Always abstract into `.each`" wording may be overly prescriptive — softened to "Prefer"
- [x] [Review][Patch] DELETE test should assert `response.statusCode === 204` before querying DB state — fixed
- [x] [Review][Defer] PATCH with empty body `{}` silently bumps `updatedAt` — no test for this edge case — deferred, pre-existing (noted from Story 3.0 review)
- [x] [Review][Defer] `mapTodoRowToApiTodo` conditionally includes `deletedAt` — no test verifies Fastify strips it from responses when present — deferred, pre-existing

## Dev Notes

### Critical Context: Most Coverage Already Exists

The epic note explicitly states: **"Make sure we integrate tests with existing ones. Most of this story requirements might be already implemented."**

Story 3.0 updated all 4 API test files (`todos.get.test.ts`, `todos.post.test.ts`, `todos.patch.test.ts`, `todos.delete.test.ts`) for the title/text schema change. The existing test suite already covers:

- **GET**: ordering, soft-delete exclusion, completed/incomplete inclusion, x-request-id
- **POST**: valid title+text, title-only, empty title, title too long, text too long, x-request-id
- **PATCH**: update title+text, completion, title+completion, updatedAt advance, empty title, title too long, text too long, non-existent ID, soft-deleted ID, x-request-id
- **DELETE**: 204 success, exclusion from GET, non-existent UUID, already-deleted, invalid UUID, x-request-id

**Start by auditing (Task 1) before writing any code.** The primary value of this story is to confirm comprehensive coverage exists, fill any gaps found, and ensure error shape assertions are consistent.

### Existing Test Infrastructure

- **Test framework**: Vitest with `fastify.inject()` — no real HTTP network
- **DB cleanup**: centralized in `packages/api/vitest.setup.ts` via global `beforeEach(cleanupTestDatabase)`
- **Test utilities barrel**: `packages/api/test/test-utils/index.ts` exports `cleanupTestDatabase`, `createDbClient`, `runQuery`, `runRequestIdHeaderTests`, `dropTodosTable`, `makeSeedTodo`, `seedTodo`
- **Seed helper**: `makeSeedTodo(overrides?)` creates seed data; `seedTodo(input)` inserts directly into Postgres
- **Request ID helper**: `runRequestIdHeaderTests({ app, injectInput })` — reusable `describe` block testing provided and generated request IDs
- **Response types**: use schema-derived types from `../src/routes/schemas.js` (e.g., `PostTodosRouteResponses[201]`, `GetTodosRouteResponses[200]`)
- **App setup pattern**: each test file has `beforeEach` creating `app = await buildApp({ logger: false })` and `afterEach` closing it

### Test File Locations

| Endpoint | Test file |
|----------|-----------|
| App boot / Swagger | `packages/api/test/app.test.ts` |
| GET /todos | `packages/api/test/todos.get.test.ts` |
| POST /todos | `packages/api/test/todos.post.test.ts` |
| PATCH /todos/:id | `packages/api/test/todos.patch.test.ts` |
| DELETE /todos/:id | `packages/api/test/todos.delete.test.ts` |
| Test utilities | `packages/api/test/test-utils/` (barrel: `index.ts`) |
| DB utils | `packages/api/test/test-utils/db.ts` |
| Todo seed helpers | `packages/api/test/test-utils/todos.ts` |
| Request ID tests | `packages/api/test/test-utils/request-id-tests.ts` |
| Global setup | `packages/api/vitest.setup.ts` |

### Error Response Contract

All error responses must match the `ApiErrorResponse` shape:

```ts
{ code: string, message: string }
```

Minimum error codes: `VALIDATION_ERROR`, `NOT_FOUND`, `INTERNAL_ERROR`, `BAD_REQUEST`

The `x-request-id` response header must always be present (success and error responses). Error bodies include `requestId` when available.

### Potential Gaps to Investigate

Based on the architecture doc and previous story review findings:

1. **Empty body PATCH** — PATCH with `{}` body may bump `updatedAt` without changing data (deferred review finding from Story 3.0). Decide whether to add a test documenting this behavior.
2. **DB-level verification after DELETE** — existing DELETE tests verify exclusion from GET but may not query DB directly to confirm `deletedAt` is set.
3. **Response field completeness** — ensure all Todo fields are asserted (`id`, `title`, `text`, `completed`, `createdAt`, `updatedAt`, `deletedAt`).
4. **Error message displayability** — verify error messages are non-empty, human-readable strings (not raw framework messages).
5. **Content-Type header** — verify `application/json` on all JSON responses.

### Anti-Patterns to Avoid

- Do NOT duplicate the global `beforeEach(cleanupTestDatabase)` in individual test files
- Do NOT create a public reset API endpoint — DB reset is test-infrastructure only
- Do NOT add new test utilities outside the `packages/api/test/test-utils/` barrel
- Do NOT mock the database — these are integration tests hitting real Postgres
- Do NOT change existing test structure (nested `describe`/`it`, AAA pattern) — extend it
- Do NOT write tests that depend on execution order

### Project Structure Notes

- All changes confined to `packages/api/test/` directory
- No new files expected unless a new test utility is genuinely needed
- Existing file structure and barrel exports must be preserved
- Test utilities imported from `packages/api/test/test-utils/index.ts`

### Previous Story Intelligence (Story 3.0)

- All 4 API test files were updated for title/text schema in Story 3.0
- `makeSeedTodo` defaults: `title: "seed todo"`, `text: null`
- `seedTodo` uses direct Postgres INSERT
- Review found and fixed: missing POST test for title-only success case, missing POST test for text exceeding MAX_TODO_TEXT_LENGTH
- Deferred findings to be aware of: PATCH with empty body bumps `updatedAt`, no DB-level CHECK on `title`, `export default` in todosRoutes

### Git Intelligence

Recent commits:
- `75cbc3d refactor: remove unnecessary null coercions in DB layer`
- `be26144 refactor: replace deletedAt null with undefined across the stack`
- `b1e1f7b story 3.0 retro`

These show `deletedAt` now uses `undefined` (not `null`) in the API layer. Ensure test assertions use `undefined` for `deletedAt` on active todos.

### References

- [Source: epics.md#Story 3.1] — Acceptance criteria
- [Source: architecture.md#Testing Strategy & Tooling] — Test pyramid, fastify.inject(), determinism rules
- [Source: architecture.md#Test & Local Data Reset] — Centralized cleanup, dedicated test DB, no public reset endpoint
- [Source: architecture.md#API & Communication Patterns] — Endpoint contracts, error shapes, x-request-id
- [Source: architecture.md#Data Architecture] — Todo schema fields, constraints, timestamp ownership
- [Source: 3-0-*.md] — Previous story file list, review findings, test fixture updates
- [Source: project-context.md#Testing] — AAA pattern, nested describe/it, no shared mutable state

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6 (1M context)

### Debug Log References

### Implementation Plan

Task 1 Audit found these gaps to fill:
- GET: missing "empty array when no todos" test
- POST: missing deletedAt assertion in 201 response
- PATCH: missing "update title only", "update text only", "invalid UUID format" tests
- DELETE: missing DB-level deletedAt verification after soft delete

### Completion Notes List

- Audited all 4 API test files against AC requirements — most coverage already existed from Story 3.0
- Added GET /todos "empty array" test case
- Added POST /todos `deletedAt` absence assertion for new todos
- Added PATCH /todos/:id "update title only", "update text only", and "invalid UUID format" tests
- Added DELETE /todos/:id DB-level `deletedAt` verification via direct SQL query
- Verified deterministic DB reset via global `beforeEach(cleanupTestDatabase)` — no duplication found
- All validation gates pass: type:check, biome:check, test:ci (105 tests), test:e2e (18 tests)

### Change Log

- 2026-04-04: Filled API integration test gaps — 5 new test cases added across GET, POST, PATCH, DELETE endpoints

### File List

- `packages/api/test/todos.get.test.ts` (modified) — added empty array test
- `packages/api/test/todos.post.test.ts` (modified) — added deletedAt absence assertion
- `packages/api/test/todos.patch.test.ts` (modified) — added title-only, text-only, invalid UUID tests
- `packages/api/test/todos.delete.test.ts` (modified) — added DB-level deletedAt verification
