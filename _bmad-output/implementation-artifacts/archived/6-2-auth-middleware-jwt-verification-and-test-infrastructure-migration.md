# Story 6.2: Auth middleware — JWT verification and test infrastructure migration

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a maintainer,
I want the API to authenticate requests via JWT,
so that the `x-user-id` placeholder can be retired.

## Acceptance Criteria

### AC1 — JWT auth plugin replaces `validateUserPlugin`

**Given** a request to any protected route (todo routes)
**When** the new JWT auth plugin runs
**Then** it extracts the JWT from the `Authorization: Bearer <token>` header, verifies signature and expiry, and sets `request.userId` from the token payload

**Given** a request with no `Authorization` header or an expired/invalid token
**When** the JWT auth plugin runs
**Then** it falls back to `x-user-id` header with DB lookup (dual-mode transition for the web layer, which still sends this header until Story 6.3)
**And** if neither mechanism succeeds, returns `401` with `code = UNAUTHORIZED`

**Given** a request to `/auth/*` routes
**When** the auth plugin runs
**Then** those routes are excluded from JWT requirement (accessible to unauthenticated users)

### AC2 — Todo route schemas updated

**Given** the todo route schemas in `packages/api/src/routes/todos/schemas.ts`
**When** updated
**Then** `x-user-id` is removed from the `required` array in `todoRequestHeadersSchema` (the auth plugin handles authentication, not schema validation)
**And** `x-user-id` remains as an optional property for the dual-mode transition
**And** an optional `authorization` header property is added for documentation purposes

### AC3 — Test utility migration

**Given** the test utilities in `packages/api/test/test-utils/`
**When** updated for auth
**Then** `createTestUser` creates a user via `POST /auth/register` and returns `{ userId, headers }` where headers contain `authorization: "Bearer <jwt>"`
**And** all test helpers inject the auth token via `headers: { authorization: "Bearer <jwt>" }` instead of `x-user-id`
**And** helpers are exported from `packages/api/test/test-utils/index.ts`

### AC4 — All API tests migrated

**Given** every API test file
**When** it sets up test data
**Then** it uses JWT Bearer auth via the updated `createTestUser` / `createTestContext`
**And** no test sends `x-user-id` headers
**And** all tests pass with `fileParallelism: true`

### AC5 — E2E tests continue working via dual-mode

**Given** the E2E test suite
**When** it runs
**Then** all existing E2E tests pass without modification (the web still sends `x-user-id: DEFAULT_USER_ID`, which the dual-mode auth plugin accepts via fallback)
**And** no E2E test changes are required in this story (per-user E2E isolation is deferred to Story 6.2.1 when the web layer switches to token auth)

### AC6 — Auth tests unchanged

**Given** the existing `packages/api/test/auth.test.ts`
**When** the test suite runs
**Then** all auth tests pass (auth routes return `{ user, token }` in the body — unchanged from Story 6.1)
**And** auth tests use `Authorization: Bearer <jwt>` for any authenticated requests (if any)

## Tasks / Subtasks

- [x] Task 1 — Create JWT auth plugin (AC1)
  - [x] Create `packages/api/src/plugins/jwt-auth.ts` as a `FastifyPluginAsync`
  - [x] Move the `declare module "fastify"` type augmentation for `request.userId` from `validate-user.ts` to `jwt-auth.ts`
  - [x] Call `app.decorateRequest("userId", "")` in the plugin body (same as `validateUserPlugin` does)
  - [x] In an `onRequest` hook, implement dual-mode auth:
    1. Extract Bearer token from `request.headers.authorization` (strip `Bearer ` prefix) → verify JWT via `app.jwt.verify<{ userId: string }>(token)` → set `request.userId` from payload → return
    2. If no valid Bearer token, fall back to `x-user-id` header → DB lookup to verify user exists (same query as current `validateUserPlugin`) → set `request.userId` → return
    3. If neither mechanism succeeds → return 401 with `{ code: "UNAUTHORIZED", message: "Authentication required" }`
  - [x] Export `jwtAuthPlugin` as a named export

- [x] Task 2 — Replace `validateUserPlugin` with `jwtAuthPlugin` in route registration (AC1)
  - [x] In `packages/api/src/routes/todos/index.ts`: replace `import { validateUserPlugin }` with `import { jwtAuthPlugin }` and change `await validateUserPlugin(app, {})` to `await jwtAuthPlugin(app, {})`
  - [x] Verify auth routes (`/auth/*`) are NOT wrapped by the auth plugin (they are registered separately in `app.ts` — no change needed there)
  - [x] Delete `packages/api/src/plugins/validate-user.ts` (replaced by `jwt-auth.ts`)
  - [x] Remove any unused imports of `validateUserPlugin`

- [x] Task 3 — Update todo route schemas (AC2)
  - [x] In `packages/api/src/routes/todos/schemas.ts`: remove `"x-user-id"` from the `required` array in `todoRequestHeadersSchema`
  - [x] Keep `x-user-id` as an optional property (for dual-mode backward compat)
  - [x] Add optional `authorization` property: `{ type: "string", description: "Bearer JWT token" }`
  - [x] Verify all route schemas that reference `todoRequestHeadersSchema` compile correctly

- [x] Task 4 — Migrate test utilities to Bearer auth (AC3)
  - [x] Update `createTestUser` in `packages/api/test/test-utils/db.ts`:
    - Call `POST /auth/register` with `{ email: "<unique>@test.local", password: "test-password-123", name: "test-user-<uuid>" }`
    - Extract `token` from the response body (`response.json<{ user: { id: string }, token: string }>()`)
    - Return `{ userId: body.user.id, headers: { authorization: "Bearer ${body.token}" } }`
  - [x] `TestContext.testHeaders` type is already `Record<string, string>` — the shape change from `{ "x-user-id": id }` to `{ authorization: "Bearer ..." }` is type-compatible
  - [x] Verify `cleanupUserTodos` and `deleteUser` still work (they use direct DB access, unaffected by auth changes)
  - [x] Keep `DEFAULT_USER_ID` import for `cleanupTestDatabase` which seeds the default user for E2E

- [x] Task 5 — Rewrite `runUserScopingTests` for JWT auth (AC4)
  - [x] In `packages/api/test/test-utils/user-scoping-tests.ts`: rewrite the three tests:
    - **"returns 401 when no auth is provided"**: remove both `authorization` and `x-user-id` headers from `injectInput` → expect 401
    - **"returns 401 with invalid Bearer token"**: set `authorization: "Bearer invalid-token"` → expect 401
    - **"does not return 401 with valid auth"**: keep existing valid headers from `injectInput` → expect not-401 (unchanged logic)
  - [x] Rename the describe block from `"x-user-id scoping"` to `"auth scoping"`
  - [x] Remove references to `x-user-id` in the test helper

- [x] Task 6 — Migrate all API test files (AC4)
  - [x] All test files use `testHeaders` from `createTestContext()` / `createTestUser()` — header content changes automatically
  - [x] Verified no hardcoded `"x-user-id"` references in any test file
  - [x] `todos.user-isolation.test.ts` uses `createTestUser()` for both users — no changes needed
  - [x] Run `npm run test:ci` — all 152 tests pass with `fileParallelism: true`

- [x] Task 7 — Verify auth tests pass (AC6)
  - [x] Run `packages/api/test/auth.test.ts` — all pass, no changes needed
  - [x] Auth routes are not wrapped by auth plugin, response shape unchanged

- [x] Task 8 — Verify E2E tests pass (AC5)
  - [x] Run `npm run test:e2e` — all 26 tests pass via dual-mode (web sends `x-user-id`, plugin accepts it as fallback)
  - [x] No E2E test changes required

## Dev Notes

### Architecture Decisions (DO NOT deviate from these)

- **Token delivery stays as response body** — auth routes return `{ user, token }` (Story 6.1 design decision). NO cookies. NO `@fastify/cookie`. The web client will store the token and send it as `Authorization: Bearer <token>` (implemented in Story 6.3).
- **`validateUserPlugin` is DELETED in this story** — replaced entirely by `jwtAuthPlugin`. Do not extend or wrap the old plugin.
- **Dual-mode is a transitional measure** — `Authorization: Bearer <token>` takes precedence. If no valid Bearer token, fall back to `x-user-id` header with DB lookup. The web layer still sends `x-user-id` until Story 6.3. This keeps the app deployable after this story.
- **Auth routes remain outside the auth plugin scope** — registered separately in `app.ts`, no auth enforcement (same as Story 6.1).
- **`x-user-id` is removed from `required` in todo route schemas** — schema validation no longer rejects missing `x-user-id`. The auth plugin (not the schema) handles authentication. This changes the error from 400 → 401 for missing auth.
- **`passwordHash` must NEVER appear in any API response** — always stripped in `mapUserRowToApiUser()` (unchanged from Story 6.1).
- **`usersRoutes` is NOT protected by auth** — `POST /users` has no auth middleware (same as current state). It is a legacy endpoint removed in Story 6.3.

### Plugin Registration Order in `app.ts` (UNCHANGED)

The `app.ts` registration order does not change in this story. The `jwtAuthPlugin` is called **inside** `todosRoutes` (same pattern as `validateUserPlugin`), not at the app level:

```
1. requestIdPlugin
2. errorHandlerPlugin
3. @fastify/jwt (already registered)
4. Healthcheck route
5. authRoutes (no auth guard — unchanged)
6. todosRoutes (internally calls jwtAuthPlugin instead of validateUserPlugin)
7. usersRoutes (no auth guard — unchanged)
```

### JWT Auth Plugin Design

The new plugin (`packages/api/src/plugins/jwt-auth.ts`) follows the same `FastifyPluginAsync` pattern as `validateUserPlugin`:

```ts
// packages/api/src/plugins/jwt-auth.ts
import { eq } from "drizzle-orm";
import type { FastifyPluginAsync } from "fastify";
import { getDb } from "../db/client.js";
import { users } from "../db/schema.js";

declare module "fastify" {
  interface FastifyRequest {
    userId: string;
  }
}

/**
 * Fastify plugin that authenticates requests via JWT Bearer token.
 * Falls back to x-user-id header for dual-mode transition (removed in Story 6.3).
 */
export const jwtAuthPlugin: FastifyPluginAsync = async (app) => {
  app.decorateRequest("userId", "");

  app.addHook("onRequest", async (request, reply) => {
    // 1. Try Authorization: Bearer <token>
    const authHeader = request.headers.authorization;
    if (authHeader?.startsWith("Bearer ")) {
      const token = authHeader.slice(7); // "Bearer ".length
      try {
        const decoded = app.jwt.verify<{ userId: string }>(token);
        request.userId = decoded.userId;
        return;
      } catch {
        // Invalid/expired token — fall through to x-user-id
      }
    }

    // 2. Dual-mode fallback: x-user-id header (removed in Story 6.3)
    const headerValue = request.headers["x-user-id"];
    if (typeof headerValue === "string" && headerValue.trim().length > 0) {
      const db = getDb();
      const [user] = await db
        .select({ id: users.id })
        .from(users)
        .where(eq(users.id, headerValue))
        .limit(1);

      if (user) {
        request.userId = user.id;
        return;
      }
    }

    // 3. Neither mechanism succeeded
    return reply.code(401).send({
      code: "UNAUTHORIZED",
      message: "Authentication required",
    });
  });
};
```

**Key differences from `validateUserPlugin`:**
- Uses `onRequest` hook (runs before body parsing) instead of `preHandler` — authentication should happen before wasting resources parsing the body
- JWT verification is stateless (no DB lookup) — only the `x-user-id` fallback does a DB query
- `declare module "fastify"` type augmentation and `decorateRequest` move here from `validate-user.ts`

### Todo Route Schema Changes

**Current `todoRequestHeadersSchema`** in `packages/api/src/routes/todos/schemas.ts`:
```ts
const todoRequestHeadersSchema = {
  type: "object",
  required: ["x-user-id"],  // ← REMOVE this line
  properties: {
    ...requestHeadersSchema.properties,
    "x-user-id": { type: "string", format: "uuid", description: "..." },
  },
} as const;
```

**After:**
```ts
const todoRequestHeadersSchema = {
  type: "object",
  properties: {
    ...requestHeadersSchema.properties,
    "x-user-id": { type: "string", format: "uuid", description: "Legacy user ID header (dual-mode transition)" },
    authorization: { type: "string", description: "Bearer JWT token" },
  },
} as const;
```

**Impact:** Removing `x-user-id` from `required` means Fastify no longer rejects requests missing this header at the schema level (was 400). Instead, the `jwtAuthPlugin` returns 401 for missing auth. This changes `runUserScopingTests` behavior: the "missing header" test now expects 401 instead of 400.

### Test Utility Migration

**`createTestUser` changes** in `packages/api/test/test-utils/db.ts`:

```ts
// Before: POST /users with no auth, returns x-user-id headers
export async function createTestUser({ app }) {
  const response = await app.inject({
    method: "POST", url: "/users",
    payload: { name: `test-user-${randomUUID()}` },
  });
  const body = response.json<{ id: string }>();
  return { userId: body.id, headers: { "x-user-id": body.id } };
}

// After: POST /auth/register, returns Authorization headers
export async function createTestUser({ app }) {
  const response = await app.inject({
    method: "POST", url: "/auth/register",
    payload: {
      email: `test-${randomUUID()}@test.local`,
      password: "test-password-123",
      name: `test-user-${randomUUID()}`,
    },
  });
  const body = response.json<{ user: { id: string }; token: string }>();
  return {
    userId: body.user.id,
    headers: { authorization: `Bearer ${body.token}` },
  };
}
```

**`TestContext.testHeaders`** type is already `Record<string, string>` — the shape change is type-compatible. All callers using `testHeaders` (via `createTestContext`) will automatically use Bearer auth without code changes.

### `runUserScopingTests` Rewrite

**Behavior changes:**

| Old test (schema + plugin) | New test (plugin only) |
|---|---|
| Missing `x-user-id` → **400** (schema rejects) | No auth at all → **401** (plugin rejects) |
| Non-existent user in `x-user-id` → **401** (plugin rejects) | Invalid Bearer token → **401** (plugin rejects) |
| Valid `x-user-id` → success | Valid Bearer → success |

The "missing header → 400" test becomes "no auth → 401" because authentication is now handled by the plugin, not by schema validation.

### `todos.user-isolation.test.ts` — Second User

This test file creates a second user for cross-user isolation tests. Currently it uses `POST /users` directly. After this story, it should use `POST /auth/register` to create the second user and extract the Bearer token, same as `createTestUser`. Check if the file calls `createTestUser` for the second user or has inline code.

### E2E Tests — No Changes Needed

The web app sends `x-user-id: DEFAULT_USER_ID` (hardcoded in `App.tsx`). The dual-mode auth plugin accepts this via the `x-user-id` fallback with DB lookup. E2E tests continue working as-is.

Per-user E2E isolation is deferred:
- Story 6.2.1 parallelizes E2E tests with per-user isolation
- Story 6.3 updates the web layer to use Bearer tokens (removing `x-user-id` entirely)

### Deferred Work from Story 6.1 — Relevant to This Story

- **`argon2.verify` against placeholder hash `"no-auth"`**: The `x-user-id` fallback in the new plugin does a DB lookup but does NOT call `argon2.verify`. The login path is the only place `argon2.verify` runs. So this latent risk is unchanged.
- **`validateUserPlugin` DB lookup on every request**: For Bearer-authenticated requests, the JWT is stateless (no DB lookup). The `x-user-id` fallback still does a DB lookup — acceptable during the transition period.

### Route Paths — Fastify vs External

nginx strips the `/api` prefix before forwarding. In `app.inject()` tests, always use Fastify paths (without `/api`):

| External (client) | Fastify registration |
|---|---|
| `POST /api/auth/register` | `POST /auth/register` |
| `POST /api/auth/login` | `POST /auth/login` |
| `GET /api/todos` | `GET /todos` |

### Files to Create

- `packages/api/src/plugins/jwt-auth.ts` — new JWT auth plugin

### Files to Modify

- `packages/api/src/routes/todos/index.ts` — replace `validateUserPlugin` import/call with `jwtAuthPlugin`
- `packages/api/src/routes/todos/schemas.ts` — remove `x-user-id` from required headers
- `packages/api/test/test-utils/db.ts` — update `createTestUser` to use `/auth/register`
- `packages/api/test/test-utils/user-scoping-tests.ts` — rewrite for JWT auth behavior
- `packages/api/test/todos.user-isolation.test.ts` — update second user creation (if inline)
- Potentially other test files if they hardcode `x-user-id`

### Files to Delete

- `packages/api/src/plugins/validate-user.ts` — replaced by `jwt-auth.ts`

### Files Unchanged

- `packages/api/src/app.ts` — no changes (plugin order, @fastify/jwt registration stay the same)
- `packages/api/src/routes/auth/index.ts` — auth routes unchanged (still return `{ user, token }`)
- `packages/api/src/routes/auth/schemas.ts` — auth schemas unchanged
- `packages/shared/` — no changes (DEFAULT_USER_ID remains, removed in Story 6.3)
- `packages/web/src/` — no changes (still sends `x-user-id`, changed in Story 6.3)
- `packages/web/e2e/` — no changes (works via dual-mode fallback)
- `.env`, `.env.test` — no changes

### References

- Auth ADR: [docs/decisions/adr-auth-strategy.md](docs/decisions/adr-auth-strategy.md)
- Previous story (6.1): [_bmad-output/implementation-artifacts/6-1-auth-api-schema-migration-dependencies-and-auth-routes.md](_bmad-output/implementation-artifacts/6-1-auth-api-schema-migration-dependencies-and-auth-routes.md)
- Current auth plugin (to be replaced): [packages/api/src/plugins/validate-user.ts](packages/api/src/plugins/validate-user.ts)
- Auth routes (unchanged): [packages/api/src/routes/auth/index.ts](packages/api/src/routes/auth/index.ts)
- Auth schemas (unchanged): [packages/api/src/routes/auth/schemas.ts](packages/api/src/routes/auth/schemas.ts)
- Todos route module: [packages/api/src/routes/todos/index.ts](packages/api/src/routes/todos/index.ts)
- Todo route schemas: [packages/api/src/routes/todos/schemas.ts](packages/api/src/routes/todos/schemas.ts)
- App bootstrap (unchanged): [packages/api/src/app.ts](packages/api/src/app.ts)
- DB users operations: [packages/api/src/db/users.ts](packages/api/src/db/users.ts)
- Test utils barrel: [packages/api/test/test-utils/index.ts](packages/api/test/test-utils/index.ts)
- Test context setup: [packages/api/test/test-utils/db.ts](packages/api/test/test-utils/db.ts)
- Test user helpers: [packages/api/test/test-utils/users.ts](packages/api/test/test-utils/users.ts)
- User scoping tests: [packages/api/test/test-utils/user-scoping-tests.ts](packages/api/test/test-utils/user-scoping-tests.ts)
- Auth tests: [packages/api/test/auth.test.ts](packages/api/test/auth.test.ts)
- E2E tests: [packages/web/e2e/todo-flows.spec.ts](packages/web/e2e/todo-flows.spec.ts)
- E2E global setup: [packages/web/e2e/global-setup.ts](packages/web/e2e/global-setup.ts)
- Epic 6 definition: [_bmad-output/planning-artifacts/epics.md](_bmad-output/planning-artifacts/epics.md) — Story 6.2
- Shared constants: [packages/shared/src/constants.ts](packages/shared/src/constants.ts)
- Project context: [project-context.md](project-context.md)

### Review Findings

- [x] [Review][Decision] Invalid JWT silently falls through to x-user-id fallback — accepted as-is for dual-mode window; Story 6.3 must reject immediately if Bearer header is present (whether valid or not) once x-user-id fallback is removed entirely
- [x] [Review][Patch] JWT missing `userId` claim bypasses 401 and sets `request.userId` to `undefined` — `app.jwt.verify<{ userId: string }>()` is a generic cast, not a runtime validation; if payload lacks `userId`, the hook returns early with `request.userId = undefined` [packages/api/src/plugins/jwt-auth.ts:25-27]
- [x] [Review][Defer] x-user-id fallback issues DB query for any non-empty string — plugin runs at `onRequest` (before schema validation), so the `format: uuid` constraint on `x-user-id` no longer blocks malformed values before the DB round-trip [packages/api/src/plugins/jwt-auth.ts:34-47] — deferred, removed entirely in Story 6.3
- [x] [Review][Patch] Stale JSDoc in authRoutes still references deleted `validateUserPlugin` — fixed [packages/api/src/routes/auth/index.ts:18]
- [x] [Review][Defer] `decorateRequest("userId", "")` initializes to empty string — pre-existing pattern, routes outside the plugin scope silently receive `""` [packages/api/src/plugins/jwt-auth.ts:18] — deferred, pre-existing
- [x] [Review][Defer] Hardcoded `"test-password-123"` in `createTestUser` — test-only, no real risk today [packages/api/test/test-utils/db.ts:~62] — deferred, test-only
- [x] [Review][Defer] `Authorization: Bearer ` (empty after prefix) silently falls through to x-user-id — spec-compliant but untested edge case [packages/api/src/plugins/jwt-auth.ts:22-30] — deferred, spec-compliant transitional behavior

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6 (1M context)

### Debug Log References

No debug issues encountered.

### Completion Notes List

- Created `jwtAuthPlugin` with dual-mode auth: JWT Bearer token (stateless) with `x-user-id` DB-lookup fallback for transitional compatibility
- Uses `onRequest` hook (before body parsing) instead of `preHandler` — authentication runs earlier in the request lifecycle
- Deleted `validateUserPlugin` — fully replaced
- Removed `x-user-id` from `required` in `todoRequestHeadersSchema` — auth is now handled by plugin, not schema validation (error changes from 400 → 401)
- Migrated `createTestUser` from `POST /users` to `POST /auth/register` — returns Bearer auth headers
- Rewrote `runUserScopingTests`: tests now verify 401 for no-auth and invalid-token scenarios
- No individual test files needed changes — all use `testHeaders` from `createTestContext()` / `createTestUser()` which automatically picks up Bearer auth
- E2E tests pass unchanged via dual-mode fallback (web sends `x-user-id: DEFAULT_USER_ID`)
- All validation gates pass: type:check, biome:check, 152 CI tests, 26 E2E tests

### Change Log

- 2026-04-10: Story 6.2 implemented — JWT auth middleware with dual-mode transition and full test migration

### File List

- **Created:** `packages/api/src/plugins/jwt-auth.ts`
- **Modified:** `packages/api/src/routes/todos/index.ts`
- **Modified:** `packages/api/src/routes/todos/schemas.ts`
- **Modified:** `packages/api/test/test-utils/db.ts`
- **Modified:** `packages/api/test/test-utils/user-scoping-tests.ts`
- **Deleted:** `packages/api/src/plugins/validate-user.ts`
