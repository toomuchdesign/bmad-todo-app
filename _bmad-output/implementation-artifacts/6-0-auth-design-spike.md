# Story 6.0: Auth design spike — evaluate and decide auth strategy

Status: ready-for-dev

## Story

As a maintainer,
I want a documented, evaluated decision on the authentication approach,
so that implementation stories are built on a well-reasoned foundation with no surprise pivots.

## Acceptance Criteria

### AC1 — Evaluate all four candidate auth strategies

**Given** the four candidate approaches (A: DIY JWT, B: Better Auth, C: Clerk, D: session-based)
**When** the design spike is complete
**Then** each option is evaluated across: implementation effort, security surface, vendor risk, DX, Fastify/Drizzle/Postgres/Docker compatibility, and alignment with learning goals

### AC2 — Select an approach and document the rationale

**Given** the evaluation from AC1
**When** a strategy is selected
**Then** the decision is explicitly stated with rationale covering why the chosen option outperforms the others
**And** the rationale acknowledges trade-offs honestly

### AC3 — Document DB schema changes required

**Given** the current `users` table (id UUID, name text, createdAt, updatedAt — no credentials)
**When** the selected strategy requires identity fields
**Then** the ADR specifies which columns to add (e.g. `email`, `password_hash`) or how an external provider maps to the existing `users` row
**And** migration approach is noted (new migration file, backfill strategy if needed)

### AC4 — Sketch the new API surface

**Given** the selected auth strategy
**When** the API surface is sketched
**Then** the ADR includes the new routes (at minimum: register, login, logout under `/api/auth/`), their request/response shapes, and how existing protected routes transition from `x-user-id` header to the new mechanism

### AC5 — Document web client changes

**Given** the selected strategy
**When** web client changes are described
**Then** the ADR covers: how the token/session is stored (httpOnly cookie vs. localStorage vs. memory), how it is attached to API requests (Authorization header vs. automatic cookie), and what changes `useTodos` / the `x-user-id` call site in `App.tsx` require

### AC6 — Document UX implications

**Given** the selected strategy
**When** UX implications are described
**Then** the ADR covers: login and register screen requirements, session persistence behaviour (stay logged in across refresh?), and redirect behaviour (unauthenticated → login, post-login → todo list)

### AC7 — ADR committed at correct path

**Given** the completed spike
**When** the work is committed
**Then** the ADR exists at `docs/decisions/adr-auth-strategy.md`
**And** the `docs/decisions/` directory is created if it does not yet exist

## Tasks / Subtasks

- [ ] Task 1 — Evaluate each option (AC1)
  - [ ] **Option A — DIY JWT** (`@fastify/jwt` + `bcrypt`/`argon2`): email/password → signed JWT stored in httpOnly cookie or Authorization header. Assess: JWKS not needed (symmetric secret), token expiry + refresh complexity, security surface owned entirely.
  - [ ] **Option B — Better Auth**: TS-first library with official Drizzle adapter. Assess: schema migration path, how it wraps Fastify, community maturity (~1 yr old), email/password + OAuth support, whether it can coexist with the existing `users` table.
  - [ ] **Option C — Clerk**: external service, issues JWTs verified via JWKS; pre-built React UI components. Assess: free tier (10k MAU), vendor lock-in, Docker/self-hosted feasibility, learning value for auth internals.
  - [ ] **Option D — Session-based** (`@fastify/session` + `@fastify/cookie`): server-side sessions in Postgres or memory. Assess: statefulness and horizontal-scaling implications, simplicity of implementation, session store options (connect-pg-simple or in-memory for dev).

- [ ] Task 2 — Make and justify the decision (AC2)
  - [ ] Choose one primary option (preference: A or B, stack-native, no vendor lock-in)
  - [ ] Write a clear rationale paragraph; list rejected alternatives and why

- [ ] Task 3 — Define DB schema changes (AC3)
  - [ ] Determine what columns are added to `users` (or if a new table is needed, e.g. `sessions`, `accounts`)
  - [ ] Specify migration approach: new Drizzle migration file, no destructive changes to existing `user_id` FK or todo rows

- [ ] Task 4 — Sketch API surface (AC4)
  - [ ] List new routes: `POST /api/auth/register`, `POST /api/auth/login`, `POST /api/auth/logout` (at minimum)
  - [ ] Specify request bodies and success/error response shapes using the existing API error contract (`{ code, message, requestId? }`)
  - [ ] Describe how `validateUserPlugin` (`packages/api/src/plugins/validate-user.ts`) is replaced or extended: e.g. JWT verification hook vs. session lookup hook

- [ ] Task 5 — Document web client changes (AC5)
  - [ ] Identify the `x-user-id` call site: `App.tsx:2+12` imports `DEFAULT_USER_ID` from `shared` and passes to `useTodos`
  - [ ] Specify how the token/session reaches the API: httpOnly cookie (transparent to JS) vs. header (requires JS to store/attach)
  - [ ] Describe changes to `useTodos` hook and its fetch calls in `packages/web/src`

- [ ] Task 6 — Document UX implications (AC6)
  - [ ] Define login + register screen requirements (fields, validation, error states)
  - [ ] Session persistence: remain logged in across refresh (httpOnly cookie → yes by default; JWT in memory → no)
  - [ ] Redirect flow: unauth user lands on `/login`, successful auth redirects to `/` (todo list)

- [ ] Task 7 — Write and commit the ADR (AC7)
  - [ ] Create `docs/decisions/` directory
  - [ ] Write `docs/decisions/adr-auth-strategy.md` using the structure: Problem → Constraints → Options considered → Decision → Consequences
  - [ ] Commit only the ADR file (no production code changes in this story)

## Dev Notes

### Scope — Decision Document Only

**No production code changes** are required for this story. The sole deliverable is `docs/decisions/adr-auth-strategy.md`. Implementation starts in Story 6.1+ after this ADR is approved.

If a tiny throwaway spike is needed to validate a hypothesis (e.g. a minimal `@fastify/jwt` hello-world), it must **not** be committed to production files.

### Current Auth Baseline (What Must Be Replaced)

- **`validateUserPlugin`** (`packages/api/src/plugins/validate-user.ts`): reads `x-user-id` header, validates it's a non-empty string, queries `users` table, sets `request.userId`. This plugin is the central auth enforcement point — it will be replaced or rewritten.
- **`App.tsx`** (`packages/web/src/App.tsx`): imports `DEFAULT_USER_ID` from `shared` and passes to `useTodos({ userId: DEFAULT_USER_ID })`. This is the web auth bypass — line 2 (import) and line 12 (usage).
- **`shared` constants** (`packages/shared/src/constants.ts`): exports `DEFAULT_USER_ID`. Once real auth exists, this constant becomes obsolete.

### Current `users` DB Schema

```ts
// packages/api/src/db/schema.ts
export const users = pgTable("users", {
  id: uuid("id").primaryKey().notNull(),
  name: text("name").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" }).notNull(),
});
```

No `email` or credential column yet. Every todo has a `user_id` FK to this table. Any schema migration must not break this FK.

### Auth Options Reference

| Option | Library/Service | Token storage | Stateless? | Vendor risk | Learning value |
|--------|----------------|---------------|-----------|-------------|----------------|
| A — DIY JWT | `@fastify/jwt` + `argon2`/`bcrypt` | httpOnly cookie or Auth header | Yes (JWT) | None | High |
| B — Better Auth | `better-auth` (Drizzle adapter) | httpOnly cookie | Yes | Low | Medium |
| C — Clerk | External service (JWKS) | Managed by Clerk SDK | Yes | High | Low |
| D — Session | `@fastify/session` + `@fastify/cookie` | Server session + cookie | No (stateful) | None | Medium |

**Recommendation for this spike:** Evaluate A and B as primary candidates. Evaluate C only if speed-to-value outweighs learning goals. D is a valid fallback if simplicity is paramount.

### Fastify Plugin Architecture Pattern

Existing plugins in `packages/api/src/plugins/`:
- `error-handler.ts` — global error handler
- `request-id.ts` — `x-request-id` propagation
- `validate-user.ts` — current auth enforcement

Any new auth plugin should follow the same `FastifyPluginAsync` pattern with encapsulated scope registration via `app.register()` in `packages/api/src/app.ts`.

### API Route Prefix Convention

All routes are prefixed under `/api` via Fastify's proxy in the web layer. New auth routes must use the prefix `/api/auth/...` to remain consistent. See `packages/api/src/routes/` for the existing route module pattern (folder + `index.ts` + `schemas.ts`).

### Docker / CORS Considerations

The app runs in Docker with `nginx` proxying `/api` to the Fastify service. For httpOnly cookies to work cross-origin:
- The Fastify API must set `sameSite`, `secure`, and `domain` correctly in the cookie options
- nginx config may need `proxy_pass_header Set-Cookie` or equivalent
- For local dev (non-HTTPS), `secure: false` is acceptable; production requires `secure: true`

Note this in the ADR as an implementation constraint.

### ADR Format

Use this structure for `docs/decisions/adr-auth-strategy.md`:

```markdown
# ADR: Auth Strategy for bmad-todo

**Date:** YYYY-MM-DD
**Status:** Accepted

## Problem

## Constraints

## Options Considered

### Option A — DIY JWT
### Option B — Better Auth
### Option C — Clerk
### Option D — Session-based

## Decision

## Consequences

### Positive
### Negative / Trade-offs

## Implementation Outline (for Story 6.1+)
```

### Project Structure Notes

- ADR output path: `docs/decisions/adr-auth-strategy.md` — `docs/decisions/` does not yet exist; create it.
- No changes to `packages/` in this story.
- `docs/` currently contains only `initial-product-requirements*.md` files — ADR is the first decision record.

### References

- Epic 6 definition: `_bmad-output/planning-artifacts/epics.md#Epic-6-User-Authentication`
- Sprint change proposal (Epic 6 rationale): `_bmad-output/planning-artifacts/sprint-change-proposal-2026-04-09.md`
- Current auth plugin: `packages/api/src/plugins/validate-user.ts`
- Current DB schema: `packages/api/src/db/schema.ts`
- Architecture auth section: `_bmad-output/planning-artifacts/architecture.md#Authentication--Security`
- Web auth call site: `packages/web/src/App.tsx` (lines 2, 12)

## Dev Agent Record

### Agent Model Used

### Debug Log References

### Completion Notes List

### File List
