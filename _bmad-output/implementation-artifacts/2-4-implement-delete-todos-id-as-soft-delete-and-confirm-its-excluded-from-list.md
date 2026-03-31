# Story 2.4: Implement DELETE /todos/:id as soft delete and confirm it's excluded from list

Status: done

## Story

As a user,
I want to remove a todo,
So that my list stays tidy.

## Acceptance Criteria

1. **Soft delete on DELETE request**
   - Given an existing todo
   - When I call `DELETE /todos/:id`
   - Then the API returns `204 No Content`
   - And the todo is soft-deleted (`deletedAt` is set to current timestamp)

2. **Deleted todo excluded from list**
   - Given I subsequently call `GET /todos`
   - When the response returns
   - Then the deleted todo is not present

3. **Non-existent ID returns 404**
   - Given the `:id` does not exist
   - When I call `DELETE /todos/:id`
   - Then the API returns `404` with `code = NOT_FOUND`

## Tasks / Subtasks

- [x] Task 1: Add `deleteTodoInDatabase` to the DB layer (AC: #1)
  - [x] Add function `deleteTodoInDatabase({ id: string }): Promise<boolean>` in `packages/api/src/db/todos.ts`
  - [x] Set `deletedAt` to `new Date()` and `updatedAt` to same timestamp via Drizzle `update().set().where()`
  - [x] WHERE clause: `eq(todos.id, id)` AND `isNull(todos.deletedAt)` (prevent double-delete)
  - [x] Return `true` if a row was updated (check returned array length), `false` otherwise

- [x] Task 2: Add DELETE route schema (AC: #1, #3)
  - [x] Add `deleteTodosRouteSchema` in `packages/api/src/routes/schemas.ts`
  - [x] Params: same UUID validation as PATCH (`{ type: "object", required: ["id"], properties: { id: { type: "string", format: "uuid" } } }`)
  - [x] No request body
  - [x] Response: `204` with empty schema (no body), `404` with `errorResponseSchema`, `default` with `errorResponseSchema`
  - [x] Export `DeleteTodosRouteResponses` type using `InferRouteResponses`

- [x] Task 3: Add DELETE route handler (AC: #1, #2, #3)
  - [x] Add `app.delete("/todos/:id", ...)` in `packages/api/src/routes/todos.ts`
  - [x] Import `deleteTodoInDatabase` and `deleteTodosRouteSchema`
  - [x] Call `deleteTodoInDatabase({ id: request.params.id })`
  - [x] If returns `false` -> `reply.code(404).send({ code: "NOT_FOUND", message: "Todo not found", requestId })`
  - [x] If returns `true` -> `reply.code(204).send()`

- [x] Task 4: Write API integration tests (AC: #1, #2, #3)
  - [x] Create `packages/api/test/todos.delete.test.ts`
  - [x] Test: DELETE existing todo returns 204
  - [x] Test: after DELETE, GET /todos excludes the deleted todo
  - [x] Test: DELETE non-existent UUID returns 404 with NOT_FOUND
  - [x] Test: DELETE already soft-deleted todo returns 404 with NOT_FOUND
  - [x] Test: DELETE with invalid UUID format returns 400
  - [x] Add `runRequestIdHeaderTests` for DELETE route
  - [x] Follow existing test patterns from `todos.patch.test.ts`

- [x] Task 5: Regenerate OpenAPI spec and web types
  - [x] Run `npm run build:openapi` to update `packages/api/openapi.json`
  - [x] Run `npm run build:api-types` to regenerate `packages/web/src/api/generated/index.ts`
  - [x] Verify the DELETE endpoint appears in both artifacts

- [x] Task 6: Run all validation gates
  - [x] `npm run type:check` passes
  - [x] `npm run biome:check` passes
  - [x] `npm run test:ci` passes (all existing + new tests)

## Dev Notes

### Architecture Compliance

- **No new dependencies needed** — all required Drizzle operators (`eq`, `isNull`, `and`) already imported in `packages/api/src/db/todos.ts`
- **DELETE returns 204 No Content** — per architecture: `DELETE /todos/:id → 204 No Content` (no body)
- **Soft delete semantics** — set `deletedAt` timestamp; the existing `listTodosFromDatabase` already filters `WHERE deletedAt IS NULL`, so exclusion is automatic
- **Error contract** — same `{ code, message, requestId }` shape as all other routes
- **Route schema pattern** — use `@fastify/type-provider-json-schema-to-ts` same as PATCH route; define schema in `schemas.ts`, handler in `todos.ts`

### Implementation Pattern (Follow PATCH route closely)

The DELETE route follows the same structural pattern as PATCH but is simpler — no request body, no response body on success.

**DB function pattern** — unlike `updateTodoInDatabase` which returns the mapped todo, `deleteTodoInDatabase` only needs to return a boolean (success/not-found), since 204 has no body.

```
// In packages/api/src/db/todos.ts
export async function deleteTodoInDatabase({ id }: { id: string }): Promise<boolean> {
  const db = getDb();
  const now = new Date();
  const result = await db
    .update(todos)
    .set({ deletedAt: now, updatedAt: now })
    .where(and(eq(todos.id, id), isNull(todos.deletedAt)))
    .returning();
  return result.length > 0;
}
```

**Route handler pattern** — mirrors PATCH structure:
```
app.delete("/todos/:id", { schema: deleteTodosRouteSchema }, async (request, reply) => {
  const { id } = request.params;
  const deleted = await deleteTodoInDatabase({ id });
  if (!deleted) {
    return reply.code(404).send({
      code: "NOT_FOUND",
      message: "Todo not found",
      requestId: reply.getHeader("x-request-id") as string,
    });
  }
  return reply.code(204).send();
});
```

### Route Schema for 204 Response

Fastify + JSON Schema for a 204 with no body:
```
response: {
  204: {
    headers: responseHeadersSchema,
    type: "null",
    description: "Todo deleted",
  },
  404: errorResponseSchema,
  default: errorResponseSchema,
}
```

### Existing Patterns to Follow

**Route file** — [packages/api/src/routes/todos.ts](packages/api/src/routes/todos.ts): imports DB functions and schemas, registers route with `app.<method>`. Add the delete import alongside existing ones.

**Schema file** — [packages/api/src/routes/schemas.ts](packages/api/src/routes/schemas.ts): each route has a schema const + exported response type. The `params` schema for UUID is identical to `patchTodosRouteSchema.params`.

**DB layer** — [packages/api/src/db/todos.ts](packages/api/src/db/todos.ts): uses Drizzle `update` with `where(and(eq(todos.id, id), isNull(todos.deletedAt)))` pattern.

**Test file** — [packages/api/test/todos.patch.test.ts](packages/api/test/todos.patch.test.ts): same structure with `buildApp`, `beforeEach`/`afterEach`, nested `describe`/`it`, `makeSeedTodo`/`seedTodo`, `runRequestIdHeaderTests`. Import test utils from `packages/api/test/test-utils/index.ts`.

### Test Patterns

- File: `packages/api/test/todos.delete.test.ts`
- Use `app.inject({ method: "DELETE", url: "/todos/${id}" })` — no payload
- For 204 assertions: `expect(response.statusCode).toBe(204)` and `expect(response.body).toBe("")`
- For 404 assertions: same pattern as PATCH 404 tests
- Verify exclusion: after DELETE, call GET /todos and assert the deleted todo is not in the list
- Use `makeSeedTodo({ deletedAt: "2026-01-02T00:00:00.000Z" })` for already-deleted scenario
- Use `randomUUID()` for non-existent ID scenario

### File Structure

New files:
- `packages/api/test/todos.delete.test.ts`

Modified files:
- `packages/api/src/db/todos.ts` — add `deleteTodoInDatabase`
- `packages/api/src/routes/schemas.ts` — add `deleteTodosRouteSchema` + `DeleteTodosRouteResponses`
- `packages/api/src/routes/todos.ts` — add DELETE route handler
- `packages/api/openapi.json` — regenerated (includes DELETE endpoint)
- `packages/web/src/api/generated/index.ts` — regenerated (includes DELETE types)

### Project Structure Notes

- All changes are in `packages/api` (API-only story)
- No web UI changes (Story 2.5 handles the UI)
- No new directories needed
- Test file follows existing `todos.<method>.test.ts` naming convention

### Previous Story Intelligence (Story 2.3)

Key learnings from Story 2.3:
- `pendingActions` map, optimistic patterns, and `.pending` CSS class are established — not relevant to this API-only story, but useful context for Story 2.5
- The `where(and(eq(todos.id, id), isNull(todos.deletedAt)))` pattern is proven in `updateTodoInDatabase` — reuse exactly for delete
- `runRequestIdHeaderTests` helper is standard and must be included in every route test file
- All validation gates must pass before story is complete

### Git Intelligence

Recent commits:
- `4a3a280 refactor: move mockGlobal to beforeEach, import fetchMock directly` — test refactoring
- `d7b66bc refactor: drop mock helpers, use fetch-mock directly in tests` — test cleanup
- `819b0ac feat: implement story 2.3` — toggle completion, latest feature story
- Commit message convention: `feat: implement story X.Y`

### References

- [Source: epics.md#Story 2.4] — Acceptance criteria
- [Source: architecture.md#API & Communication Patterns] — `DELETE /todos/:id → 204 No Content`
- [Source: architecture.md#Data Architecture] — Soft delete via `deleted_at` timestamp
- [Source: architecture.md#Route schema definitions] — JSON Schema + type provider pattern
- [Source: architecture.md#Frontend Architecture] — Delete: not optimistic (Story 2.5 concern)
- [Source: project-context.md] — Testing practices, AAA pattern, nested describe/it blocks
- [Source: 2-3-toggle-completion.md] — Previous story learnings, WHERE clause pattern

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6 (1M context)

### Debug Log References

- Type error fix: `reply.code(204).send()` requires `send(null)` due to JSON Schema `type: "null"` in the 204 response schema

### Completion Notes List

- Implemented `deleteTodoInDatabase` in DB layer using proven `where(and(eq, isNull))` pattern
- Added `deleteTodosRouteSchema` with 204/404/default responses and UUID params validation
- Added DELETE `/todos/:id` route handler following PATCH route pattern
- Created comprehensive integration tests (6 test cases + request-id header tests)
- Regenerated OpenAPI spec and web types — DELETE endpoint present in both
- All validation gates pass: type:check, biome:check, test:ci (68 tests, 0 failures)

### Change Log

- 2026-03-31: Implemented DELETE /todos/:id soft-delete endpoint with full test coverage

### File List

New files:
- `packages/api/test/todos.delete.test.ts`

Modified files:
- `packages/api/src/db/todos.ts`
- `packages/api/src/routes/schemas.ts`
- `packages/api/src/routes/todos.ts`
- `packages/api/openapi.json`
- `packages/web/src/api/generated/index.ts`

### Review Findings

- [x] [Review][Patch] Missing explicit `400` in `deleteTodosRouteSchema.response` [schemas.ts:142] — fixed, added `400: errorResponseSchema` to match PATCH route pattern
