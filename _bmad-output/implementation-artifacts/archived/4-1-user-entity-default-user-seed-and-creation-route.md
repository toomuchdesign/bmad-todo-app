# Story 4.1: User entity, default user seed, and creation route

Status: done

## Story

As a developer,
I want a users table, a seeded default user, and a route to create new users,
So that the system has user identities before scoping todos to them.

## Acceptance Criteria

1. **Users table exists after migration**
   - Given the database has no `users` table
   - When the Drizzle migration runs
   - Then a `users` table exists with `id` (UUID PK), `name` (text, NOT NULL), `created_at` (timestamptz), `updated_at` (timestamptz)
   - And a default user row is inserted with the fixed `DEFAULT_USER_ID`

2. **DEFAULT_USER_ID is exported from shared**
   - Given the `shared` package
   - When any package imports `DEFAULT_USER_ID`
   - Then it receives a fixed UUID string constant

3. **POST /users creates a user with valid name**
   - Given the API is running
   - When I call `POST /users` with `{ name: "Alice" }`
   - Then it returns `201` with the created user (`id`, `name`, `createdAt`, `updatedAt`)

4. **POST /users rejects empty/whitespace name**
   - Given the API is running
   - When I call `POST /users` with an empty or whitespace-only name
   - Then it returns `400` with `code = VALIDATION_ERROR`

5. **POST /users returns x-request-id header**
   - Given the API receives a `POST /users` request
   - When it responds (success or error)
   - Then it includes an `x-request-id` response header

## Tasks / Subtasks

- [x] Task 1: Add `DEFAULT_USER_ID` constant to shared package (AC: #2)
  - [x] Add `DEFAULT_USER_ID` (fixed UUID) to [constants.ts](packages/shared/src/constants.ts)
  - [x] Export from [index.ts](packages/shared/src/index.ts) (if not auto-exported via barrel)

- [x] Task 2: Add User schema definition to shared package (AC: #3)
  - [x] Create [user.ts](packages/shared/src/definitions/user.ts) with `userSchema` and `User` type (follow the pattern in [todo.ts](packages/shared/src/definitions/todo.ts))
  - [x] Export from [definitions/index.ts](packages/shared/src/definitions/index.ts)
  - [x] User shape: `{ id: string, name: string, createdAt: string, updatedAt: string }`
  - [x] Add `MAX_USER_NAME_LENGTH` constant (suggested: 100) to [constants.ts](packages/shared/src/constants.ts)

- [x] Task 3: Add `users` table to Drizzle schema and generate migration (AC: #1)
  - [x] Add `users` table definition to [schema.ts](packages/api/src/db/schema.ts) following the same pattern as `todos` (uuid PK, text name NOT NULL, timestamptz created_at/updated_at)
  - [x] Generate migration via `npm -w api run db:generate` (or `db:generate:test`)
  - [x] Hand-edit migration SQL to include seed: `INSERT INTO users (id, name, created_at, updated_at) VALUES ('DEFAULT_USER_ID_VALUE', 'Default User', NOW(), NOW())`
  - [x] Run migration: `npm -w api run db:migrate:local` and `npm -w api run db:migrate:test`

- [x] Task 4: Add DB functions for users (AC: #3)
  - [x] Create [users.ts](packages/api/src/db/users.ts) with `createUserInDatabase` function (follow pattern in [todos.ts](packages/api/src/db/todos.ts))
  - [x] Use `crypto.randomUUID()` for ID generation, server-set timestamps
  - [x] Trim `name` before insert
  - [x] Map DB row to API shape (snake_case → camelCase) via a `mapUserRowToApiUser` function

- [x] Task 5: Add user route schemas (AC: #3, #4, #5)
  - [x] Add `postUsersRouteSchema` to [schemas.ts](packages/api/src/routes/schemas.ts)
  - [x] Body: `{ name: string }` with `minLength: 1`, `maxLength: MAX_USER_NAME_LENGTH`, `pattern: ".*\\S.*"` (reject whitespace-only)
  - [x] Response 201: spread `userSchema`
  - [x] Response 400/default: `errorResponseSchema`
  - [x] Add `PostUsersRouteResponses` type export

- [x] Task 6: Implement POST /users route (AC: #3, #4, #5)
  - [x] Create [users.ts](packages/api/src/routes/users.ts) as a Fastify plugin (follow pattern in [todos.ts](packages/api/src/routes/todos.ts))
  - [x] Register in [app.ts](packages/api/src/app.ts) alongside `todosRoutes`
  - [x] Handler: extract `name` from body, call `createUserInDatabase({ name: name.trim() })`, return `reply.code(201).send(user)`

- [x] Task 7: Update test infrastructure (AC: #1)
  - [x] Update `cleanupTestDatabase` in [db.ts](packages/api/test/test-utils/db.ts) to also truncate `users` table (order matters: truncate `todos` first if FK exists later, but for now `users` has no dependents)
  - [x] Create [users.ts](packages/api/test/test-utils/users.ts) with `seedUser()` and `makeSeedUser()` helpers
  - [x] Export from [test-utils/index.ts](packages/api/test/test-utils/index.ts)

- [x] Task 8: Write API integration tests for POST /users (AC: #3, #4, #5)
  - [x] Create [users.post.test.ts](packages/api/test/users.post.test.ts)
  - [x] Test: valid name → 201 with user shape
  - [x] Test: empty name → 400 VALIDATION_ERROR
  - [x] Test: whitespace-only name → 400 VALIDATION_ERROR
  - [x] Test: name exceeding max length → 400 VALIDATION_ERROR
  - [x] Test: name is trimmed in response
  - [x] Use `runRequestIdHeaderTests` for x-request-id coverage

- [x] Task 9: Verify default user seed exists (AC: #1)
  - [x] Add a test that queries for `DEFAULT_USER_ID` after DB setup and confirms the row exists

- [x] Task 10: Regenerate OpenAPI spec and web types
  - [x] Run `npm run build:openapi` to update [openapi.json](packages/api/openapi.json)
  - [x] Run `npm run build:api-types` to update [generated/index.ts](packages/web/src/api/generated/index.ts)
  - [x] Both files must be committed in the same change

- [x] Task 11: Run validation gates
  - [x] `npm run type:check` passes
  - [x] `npm run biome:check` passes
  - [x] `npm run test:ci` passes
  - [x] `npm run test:e2e` passes (no regressions — no product behavior changed)

### Review Findings

Code review completed 2026-04-08. Three parallel review layers (Blind Hunter, Edge Case Hunter, Acceptance Auditor) found 0 actionable issues. All 5 acceptance criteria verified as correctly implemented. 14 findings dismissed as noise, false positives, or pre-existing patterns.

## Dev Notes

### Scope — DB + API Only, No Todo Changes

This story adds the `users` table and `POST /users` route. It does NOT:
- Add `user_id` to todos (that's Story 4.2)
- Change any existing todo routes or behavior
- Change the web app in any way
- Require `x-user-id` header on any existing endpoint

All existing tests must continue to pass unchanged. The only test infrastructure change is adding `users` to the `cleanupTestDatabase` truncation list.

### Migration: Destructive Is Fine

Per the epics file: "Destructive migration (no production data to preserve)." The migration can create the table and seed data in one step. No need for backward-compatible migration strategies.

### Seeding the Default User

The seed INSERT must be part of the migration SQL (not a runtime seed script). This ensures the default user exists in every environment (dev, test, CI) after migrations run. Use the exact `DEFAULT_USER_ID` UUID value from the shared constant.

**Important:** The migration SQL is static — it must use the literal UUID string, not a code import. Make sure the UUID in the migration matches `DEFAULT_USER_ID` in `packages/shared/src/constants.ts`.

### DB Functions — Follow Existing Patterns

Look at [packages/api/src/db/todos.ts](packages/api/src/db/todos.ts) for the exact pattern:
- Import `getDb` from `./client`
- Import table from `./schema`
- Use `crypto.randomUUID()` for IDs
- Server-set `new Date()` for timestamps
- Return mapped API shape (camelCase properties)
- Destructured named arguments for 2+ params

### Route Schema — Follow Existing Patterns

Look at [packages/api/src/routes/schemas.ts](packages/api/src/routes/schemas.ts) for the exact pattern:
- JSON Schema `as const` for type inference
- `tags: ["users"]` for OpenAPI grouping
- Reuse `requestHeadersSchema`, `responseHeadersSchema`, `errorResponseSchema`
- Export `PostUsersRouteResponses` type via `InferRouteResponses`

### Test Cleanup Order

When `cleanupTestDatabase` truncates tables, order matters if there are FK constraints. Currently no FK exists between `users` and `todos`, but Story 4.2 will add one. For now, truncating in any order is fine. Add a comment noting that cleanup order should be revisited in Story 4.2.

### No Web Changes Required

This is a backend-only story. The web app doesn't call `POST /users` and doesn't need to know about users yet. However, `build:api-types` will regenerate the web types file to include the new endpoint — this is expected and must be committed.

### Project Structure Notes

New files to create:
- `packages/shared/src/definitions/user.ts`
- `packages/api/src/db/users.ts`
- `packages/api/src/routes/users.ts`
- `packages/api/drizzle/XXXX_*.sql` (auto-generated migration)
- `packages/api/test/test-utils/users.ts`
- `packages/api/test/users.post.test.ts`

Files to modify:
- `packages/shared/src/constants.ts` — add `DEFAULT_USER_ID`, `MAX_USER_NAME_LENGTH`
- `packages/shared/src/definitions/index.ts` — export user definitions
- `packages/shared/src/index.ts` — export user definitions (if not already via barrel)
- `packages/api/src/db/schema.ts` — add `users` table
- `packages/api/src/routes/schemas.ts` — add user route schemas
- `packages/api/src/app.ts` — register `usersRoutes`
- `packages/api/test/test-utils/db.ts` — add `users` to cleanup
- `packages/api/test/test-utils/index.ts` — export user test helpers
- `packages/api/openapi.json` — regenerated
- `packages/web/src/api/generated/index.ts` — regenerated

### Previous Story Intelligence

Recent work (Stories 3.0–3.4) was focused on testing and accessibility. No API route changes since Story 3.0 (title/text split). The last structural API change was the `title`/`text` migration in Story 3.0 — review that migration pattern as reference for the users table migration.

Recent git commits show refactoring activity (extracting hooks, deriving types from generated API types). The codebase has been cleaned up and follows consistent patterns — follow them precisely.

### References

- [Source: epics.md#Story 4.1] — Acceptance criteria and technical notes
- [Source: architecture.md#Data Architecture] — UUID IDs, timestamptz, Drizzle ORM patterns
- [Source: architecture.md#API Contract Sharing] — OpenAPI generation pipeline
- [Source: architecture.md#Testing Strategy] — API integration test approach
- [Source: architecture.md#Test & Local Data Reset] — cleanupTestDatabase pattern
- [Source: project-context.md#Testing] — AAA pattern, nested describe/it, minimal coverage
- [Source: project-context.md#Code Style] — Named functions, destructured args, no default exports

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6

### Debug Log References

None

### Completion Notes List

- Added `DEFAULT_USER_ID` and `MAX_USER_NAME_LENGTH` constants to shared package
- Created `userSchema` and `User` type in shared definitions following the `todoSchema` pattern
- Added `users` table to Drizzle schema with UUID PK, name, created_at, updated_at
- Generated migration with seed INSERT for the default user (UUID matches shared constant)
- Created `createUserInDatabase` DB function following the todos pattern
- Added `postUsersRouteSchema` with name validation (minLength, maxLength, whitespace-only rejection)
- Implemented `POST /users` route as Fastify plugin, registered in app.ts
- Updated `cleanupTestDatabase` to truncate users table and re-seed the default user
- Created `makeSeedUser`/`seedUser` test utilities
- Wrote 8 integration tests: seed verification, valid creation, name trimming, 3 validation error cases, 2 x-request-id header tests
- Regenerated OpenAPI spec and web API types
- Fixed web type error: changed `TODOS_API_PATH`/`TODO_BY_ID_API_PATH` from `: keyof paths` to `satisfies keyof paths` to preserve literal types after new `/users` path was added to generated types
- All gates pass: type:check, biome:check, test:ci (118 tests), test:e2e (26 tests)

### Change Log

- 2026-04-08: Implemented Story 4.1 — users table, default user seed, POST /users route with tests

### File List

New files:
- `packages/shared/src/definitions/user.ts`
- `packages/api/src/db/users.ts`
- `packages/api/src/routes/users.ts`
- `packages/api/drizzle/0002_curved_talkback.sql`
- `packages/api/test/test-utils/users.ts`
- `packages/api/test/users.post.test.ts`

Modified files:
- `packages/shared/src/constants.ts`
- `packages/shared/src/definitions/index.ts`
- `packages/shared/src/index.ts`
- `packages/api/src/db/schema.ts`
- `packages/api/src/routes/schemas.ts`
- `packages/api/src/app.ts`
- `packages/api/test/test-utils/db.ts`
- `packages/api/test/test-utils/index.ts`
- `packages/api/openapi.json`
- `packages/web/src/api/generated/index.ts`
- `packages/web/src/contracts.ts`
