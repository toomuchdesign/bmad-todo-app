# Story 6.1: Auth API — schema migration, dependencies, and auth routes

Status: ready-for-dev

## Story

As a user,
I want registration and login endpoints,
so that I can create an account and authenticate.

## Acceptance Criteria

### AC1 — Schema migration

**Given** the existing `users` table with `id`, `name`, `createdAt`, `updatedAt`
**When** the Drizzle migration runs
**Then** `email` (text, unique, not null) and `password_hash` (text, not null) are added to the `users` table
**And** the existing `id`, `name`, `createdAt`, `updatedAt` columns are unchanged
**And** the `todos.user_id` FK is unaffected
**And** the default seeded user is backfilled with an email and hashed password

### AC2 — Dependencies and plugin registration

**Given** the API package
**When** dependencies are installed
**Then** `@fastify/jwt`, `@fastify/cookie`, and `argon2` are added
**And** both plugins are registered in `app.ts`
**And** `JWT_SECRET` is read from an environment variable via `getConfig` (startup fails if missing)
**And** `.env`, `.env.test`, and `.env.prod.example` are updated with `JWT_SECRET`

### AC3 — POST /api/auth/register

**Given** the API is running
**When** I call `POST /api/auth/register` with `{ email, password, name }`
**Then** the password is hashed with argon2, a user is created, and the user object is returned (without `passwordHash`)
**And** an httpOnly JWT cookie is set (`sameSite: lax`, `secure` based on env, `path: /`)
**And** the response status is 201

**Given** the request has missing/invalid fields or password is too short (< 8 chars)
**When** I call `POST /api/auth/register`
**Then** the API returns `400` with `code = VALIDATION_ERROR`

**Given** the email is already registered
**When** I call `POST /api/auth/register`
**Then** the API returns `409` with `code = CONFLICT`

### AC4 — POST /api/auth/login

**Given** valid credentials
**When** I call `POST /api/auth/login` with `{ email, password }`
**Then** the API verifies the credentials, returns the user object (without `passwordHash`), and sets an httpOnly JWT cookie
**And** the response status is 200

**Given** invalid credentials (wrong password or unknown email)
**When** I call `POST /api/auth/login`
**Then** the API returns `401` with `code = UNAUTHORIZED` (deliberately vague to prevent enumeration)

**Given** missing fields
**When** I call `POST /api/auth/login`
**Then** the API returns `400` with `code = VALIDATION_ERROR`

### AC5 — POST /api/auth/logout

**Given** any request (authenticated or not)
**When** I call `POST /api/auth/logout`
**Then** the auth cookie is cleared and the API returns `204` with no body

### AC6 — Integration tests

**Given** the auth routes exist
**When** I run the API test suite
**Then** all auth routes are tested (success + failure cases per AC3–AC5)
**And** cookie assertions verify httpOnly flag is set on register/login responses
**And** existing todo tests are unchanged and passing (still use `x-user-id` header — validateUserPlugin is NOT touched in this story)

### AC7 — Docker/nginx cookie support

**Given** the nginx proxy configuration (`packages/web/nginx.conf`)
**When** updated
**Then** `proxy_pass_header Set-Cookie` is included so cookies survive the proxy hop
**And** the `secure` cookie flag is `false` for dev (HTTP) and documented as `true` for production (HTTPS)

## Tasks / Subtasks

- [ ] Task 1 — Schema migration (AC1)
  - [ ] Add `email` text unique not-null and `passwordHash` text not-null columns to the `users` table in `packages/api/src/db/schema.ts`
  - [ ] Run `npm run db:generate` to produce the Drizzle migration file (inspect it to confirm no destructive changes to existing columns or FK)
  - [ ] Update the seed migration or add a separate data migration to backfill the default user with `email = 'seed@example.com'` and a valid argon2 hash for a known password (e.g. `seedpassword`)
  - [ ] Apply migration locally with `npm run db:migrate` and verify `users` table shape

- [ ] Task 2 — Install and register new dependencies (AC2)
  - [ ] Add `@fastify/jwt`, `@fastify/cookie`, and `argon2` to `packages/api/package.json`
  - [ ] Install via `npm install` from repo root
  - [ ] Register `@fastify/cookie` in `packages/api/src/app.ts` before route registration
  - [ ] Register `@fastify/jwt` in `packages/api/src/app.ts` with `secret: config.JWT_SECRET` and `cookie: { cookieName: "auth", signed: false }`
  - [ ] Add `JWT_SECRET` to `packages/api/src/config.ts` env-schema (required string, startup fails if missing)
  - [ ] Add `JWT_SECRET=<dev-secret>` to `.env` and `.env.test`
  - [ ] Add `JWT_SECRET=<your-strong-secret>` placeholder to `.env.prod.example`

- [ ] Task 3 — Auth route module (AC3–AC5)
  - [ ] Create `packages/api/src/routes/auth/` directory with `index.ts` and `schemas.ts`
  - [ ] In `schemas.ts`: define `postRegisterRouteSchema`, `postLoginRouteSchema`, `postLogoutRouteSchema` following the existing schema pattern in `packages/api/src/routes/users/schemas.ts`
  - [ ] In `index.ts`: implement `authRoutes: FastifyPluginAsyncJsonSchemaToTs` with the three handlers
  - [ ] Register `authRoutes` in `packages/api/src/app.ts` (no auth plugin wrapping — auth routes must be accessible to unauthenticated users)
  - [ ] Implement register handler: validate → argon2 hash → DB insert → sign JWT → set cookie → return user (201)
  - [ ] Implement login handler: lookup by email → argon2 verify → sign JWT → set cookie → return user (200)
  - [ ] Implement logout handler: clear cookie → 204 no body
  - [ ] Use `reply.setCookie("auth", token, { httpOnly: true, sameSite: "lax", secure: isProduction, path: "/" })` for register and login
  - [ ] Use `reply.clearCookie("auth", { path: "/" })` for logout

- [ ] Task 4 — DB operations (AC1, AC3, AC4)
  - [ ] Add `getUserByEmail(email)` to `packages/api/src/db/users.ts` — returns full DB row including `passwordHash` (needed for login verification)
  - [ ] Add `createAuthUser({ email, passwordHash, name })` to `packages/api/src/db/users.ts`
  - [ ] Update `mapUserRowToApiUser()` to exclude `passwordHash` from the mapped API response (User type must not expose the hash)
  - [ ] Update `userSchema` in `packages/shared/src/definitions/user.ts` to include `email` (required string) — this change propagates to all route schemas using `userSchema`

- [ ] Task 5 — Update shared User type (AC3, AC4)
  - [ ] Add `email: { type: "string", format: "email" }` to `userSchema` in `packages/shared/src/definitions/user.ts`
  - [ ] Add `"email"` to the `required` array in `userSchema`
  - [ ] Verify the updated `User` type compiles correctly throughout the codebase

- [ ] Task 6 — nginx cookie support (AC7)
  - [ ] Add `proxy_pass_header Set-Cookie;` to the `/api/` location block in `packages/web/nginx.conf`

- [ ] Task 7 — Integration tests (AC6)
  - [ ] Create `packages/api/test/auth.test.ts` with tests for all three auth routes
  - [ ] Test register: success (201 + cookie set), duplicate email (409), missing fields (400), short password (400)
  - [ ] Test login: success (200 + cookie set), wrong password (401), unknown email (401), missing fields (400)
  - [ ] Test logout: success (204, Set-Cookie clears the cookie)
  - [ ] Run full test suite (`npm run test:ci`) to confirm no regressions in todo or user tests

## Dev Notes

### Architecture Decisions (DO NOT deviate from these)

- **Auth routes are NOT wrapped by validateUserPlugin** — they must be registered separately in `app.ts` without auth enforcement, so unauthenticated users can reach register/login
- **validateUserPlugin stays unchanged in this story** — all existing todo routes still use `x-user-id` header auth; the plugin replacement happens in Story 6.2
- **`passwordHash` must NEVER appear in any API response** — always strip it in `mapUserRowToApiUser()`
- **JWT cookie name is `"auth"`** — used in both register/login (setCookie) and logout (clearCookie)
- **JWT payload** should contain `{ userId: user.id }` at minimum; signed with `JWT_SECRET`
- **JWT expiry**: 7 days (`expiresIn: "7d"`) — acceptable for MVP; no refresh token needed
- **Cookie flags**: `httpOnly: true`, `sameSite: "lax"`, `path: "/"`, `secure` driven by `NODE_ENV === "production"` (or a `COOKIE_SECURE` env var)
- **argon2 default options** are safe to use; no need to customize cost parameters for MVP
- **Error codes match the existing contract**: `VALIDATION_ERROR` (400), `CONFLICT` (409), `UNAUTHORIZED` (401)

### Plugin Registration Order in `app.ts`

Current order: `requestIdPlugin` → `errorHandlerPlugin` → health route → route modules.

New order after this story:

1. `requestIdPlugin`
2. `errorHandlerPlugin`
3. `@fastify/cookie` plugin
4. `@fastify/jwt` plugin (depends on cookie)
5. Health route
6. `authRoutes` (no auth guard)
7. `todosRoutes` (still wrapped by `validateUserPlugin`)
8. `usersRoutes` (unchanged)

### Route Paths — Fastify vs External

nginx strips the `/api` prefix before forwarding to Fastify (`rewrite ^/api(/.*)$ $1 break` in `nginx.conf`). Fastify registers routes **without** the `/api` prefix. The ACs above describe the external-facing URLs (what the browser/client calls); Fastify sees the paths below:

| External (client/AC) | Fastify registration |
|---|---|
| `POST /api/auth/register` | `POST /auth/register` |
| `POST /api/auth/login` | `POST /auth/login` |
| `POST /api/auth/logout` | `POST /auth/logout` |

In `app.inject()` tests, always use the **Fastify paths** (without `/api`):
```ts
app.inject({ method: "POST", url: "/auth/register", payload: { ... } })
```

Reference: existing routes are `/todos`, `/todos/:id`, `/users` — never `/api/todos`.

### File Locations

Follow the existing route module pattern exactly:

```
packages/api/src/routes/auth/
  index.ts    — route handlers (authRoutes: FastifyPluginAsyncJsonSchemaToTs)
  schemas.ts  — route schemas (postRegisterRouteSchema, postLoginRouteSchema, postLogoutRouteSchema)
```

Reference: `packages/api/src/routes/users/index.ts` and `schemas.ts` for the pattern.

### Schema Pattern

Every route schema follows this shape (from `packages/api/src/routes/users/schemas.ts`):

```ts
export const postRegisterRouteSchema = {
  tags: ["auth"],
  summary: "Register a new user",
  body: {
    type: "object",
    required: ["email", "password", "name"],
    additionalProperties: false,
    properties: {
      email: { type: "string", format: "email" },
      password: { type: "string", minLength: 8 },
      name: { type: "string", minLength: 1, maxLength: MAX_USER_NAME_LENGTH },
    },
  },
  response: {
    201: { headers: responseHeadersSchema, ...userSchema },
    400: errorResponseSchema,
    409: errorResponseSchema,
    default: errorResponseSchema,
  },
} as const;

export type PostRegisterRouteResponses = InferRouteResponses<
  typeof postRegisterRouteSchema.response
>;
```

Use `InferRouteResponses` from `packages/api/src/routes/shared/schemas.ts` (check existing patterns).

### userSchema Update

The `userSchema` in `packages/shared/src/definitions/user.ts` needs `email` added:

```ts
export const userSchema = {
  type: "object",
  required: ["id", "name", "email", "createdAt", "updatedAt"],
  properties: {
    id: { type: "string", format: "uuid" },
    name: { type: "string" },
    email: { type: "string", format: "email" },
    createdAt: { type: "string", format: "date-time" },
    updatedAt: { type: "string", format: "date-time" },
  },
} as const;
```

**IMPORTANT:** Adding `email` to `userSchema` will affect every response that returns a `User`. The `mapUserRowToApiUser()` function in `packages/api/src/db/users.ts` must be updated to include `email` in the returned object. This is expected — the user object now includes email.

**NEVER include `passwordHash` in `userSchema`** — it must be stripped at the DB layer.

### DB Migration Strategy

The migration must handle adding NOT NULL columns to an existing table that already has rows (the default seeded user). Two approaches:

**Option A (preferred — single migration):**

1. Add columns with `DEFAULT` temporarily
2. `UPDATE users SET email = 'seed@example.com', password_hash = '<argon2hash>'`
3. `ALTER TABLE users ALTER COLUMN email DROP DEFAULT`
4. `ALTER TABLE users ALTER COLUMN password_hash DROP DEFAULT`

Or simply: add columns as nullable → backfill → alter to NOT NULL in the same migration SQL file.

**When writing the Drizzle schema**, add the columns with `.notNull()`. After `drizzle-kit generate`, inspect the generated SQL and manually add the backfill `UPDATE` statement between the column ADD and the NOT NULL constraint. Alternatively, generate the schema without `.notNull()`, apply, then generate and apply a second migration adding the constraint.

Confirm the migration leaves the `todos.user_id` FK intact by checking the generated SQL.

### Argon2 Hash for Seed User

Generate a one-time hash for the seed user's password in the migration. You can use a small script:

```ts
import * as argon2 from "argon2";
const hash = await argon2.hash("seedpassword");
console.log(hash); // paste into migration
```

Use `email = 'seed@example.com'` and `password = 'seedpassword'` for the default user. Document these in a comment in the migration file.

### Config Update

Add to `packages/api/src/config.ts` env-schema:

```ts
JWT_SECRET: {
  type: "string";
}
```

Add to `required` array. The app fails fast at startup if `JWT_SECRET` is not set — this is intentional.

### Testing — `auth.test.ts`

Follow the pattern from `packages/api/test/users.post.test.ts` exactly. Use `fastify.inject()` (no real HTTP). Use `createTestContext()` from `packages/api/test/test-utils/index.ts` for app setup.

Cookie assertions: after a successful register or login, check `response.headers["set-cookie"]` contains `auth=` and `HttpOnly`.

Logout assertion: after logout, the `Set-Cookie` header should clear the cookie (check for `auth=;` or `Max-Age=0` pattern).

Existing tests (`todos.*.test.ts`, `users.post.test.ts`) must still pass unchanged — they still use `x-user-id` header which `validateUserPlugin` still handles in this story.

**Test file isolation:** each test file creates its own user via `beforeAll`/`createTestUser` and cleans up in `beforeEach`. For the auth tests, register a new user in each test directly via `app.inject()` — do not use `createTestUser` (which POSTs to `/users`) for the core auth route tests.

### Project Structure Notes

- New files: `packages/api/src/routes/auth/index.ts`, `packages/api/src/routes/auth/schemas.ts`
- Modified files: `packages/api/src/db/schema.ts`, `packages/api/src/db/users.ts`, `packages/api/src/app.ts`, `packages/api/src/config.ts`, `packages/shared/src/definitions/user.ts`, `packages/web/nginx.conf`, `.env`, `.env.test`, `.env.prod.example`
- New migration file: `packages/api/src/db/migrations/<timestamp>_add_auth_columns.sql` (auto-generated by drizzle-kit)
- New test file: `packages/api/test/auth.test.ts`

### References

- Auth ADR: [docs/decisions/adr-auth-strategy.md](docs/decisions/adr-auth-strategy.md)
- Existing route pattern: [packages/api/src/routes/users/index.ts](packages/api/src/routes/users/index.ts)
- Existing route schemas: [packages/api/src/routes/users/schemas.ts](packages/api/src/routes/users/schemas.ts)
- DB operations pattern: [packages/api/src/db/users.ts](packages/api/src/db/users.ts)
- Shared User schema: [packages/shared/src/definitions/user.ts](packages/shared/src/definitions/user.ts)
- Config pattern: [packages/api/src/config.ts](packages/api/src/config.ts)
- App bootstrap: [packages/api/src/app.ts](packages/api/src/app.ts)
- Current auth plugin (unchanged this story): [packages/api/src/plugins/validate-user.ts](packages/api/src/plugins/validate-user.ts)
- Shared error response schema: [packages/shared/src/definitions/api-error-response.ts](packages/shared/src/definitions/api-error-response.ts)
- Test utils barrel: [packages/api/test/test-utils/index.ts](packages/api/test/test-utils/index.ts)
- Test example: [packages/api/test/users.post.test.ts](packages/api/test/users.post.test.ts)
- nginx config: [packages/web/nginx.conf](packages/web/nginx.conf)
- Epic 6 definition: [\_bmad-output/planning-artifacts/epics.md](/_bmad-output/planning-artifacts/epics.md) — Story 6.1
- Sprint change proposal (Epic 6 rationale): [\_bmad-output/planning-artifacts/sprint-change-proposal-2026-04-09.md](/_bmad-output/planning-artifacts/sprint-change-proposal-2026-04-09.md)

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6[1m]

### Debug Log References

### Completion Notes List

### File List
