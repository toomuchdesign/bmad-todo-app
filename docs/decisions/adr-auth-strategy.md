# ADR: Auth Strategy for bmad-todo

**Date:** 2026-04-09
**Status:** Accepted

## Problem

The current authentication model uses a hardcoded `x-user-id` header with a `DEFAULT_USER_ID` constant — a placeholder from Epic 4 that cannot support real user-facing authentication. The app needs register/login/logout flows so that multiple users can securely manage their own todos.

The `users` table already exists (Epic 4) with `id`, `name`, `createdAt`, `updatedAt` but has no credential columns. Every todo has a `user_id` FK to this table. The chosen strategy must extend — not break — this foundation.

## Constraints

- **Stack:** Fastify 5, Drizzle ORM, Postgres, Vite React, Docker + nginx
- **No vendor lock-in:** the app must remain fully self-hosted and runnable via `docker compose`
- **Learning value:** this is a learning project; understanding auth internals matters
- **Existing architecture:** plugins follow `FastifyPluginAsync` pattern; routes are under `/api` via nginx reverse proxy
- **Cookie transport:** nginx proxies `/api/` to Fastify — httpOnly cookies must survive the proxy hop (`proxy_pass_header Set-Cookie` or equivalent)
- **No breaking migrations:** `users.id` UUID PK and `todos.user_id` FK must remain intact
- **Minimal new dependencies:** prefer well-maintained, focused packages over large frameworks

## Options Considered

### Option A — DIY JWT (`@fastify/jwt` + `argon2`)

**Approach:** Email/password registration with `argon2` hashing. `@fastify/jwt` signs a JWT on login, delivered as an httpOnly cookie. A Fastify `onRequest` hook verifies the JWT and sets `request.userId`.

**Pros:**
- Full control over every auth decision — token shape, expiry, cookie options, error responses
- Maximum learning value: forces understanding of password hashing, JWT signing/verification, cookie security, CSRF considerations
- `@fastify/jwt` is maintained by the Fastify org, mature, well-documented, and designed specifically for Fastify's plugin architecture
- `argon2` is the OWASP-recommended password hashing algorithm (superior to bcrypt for new projects)
- Zero vendor risk — runs entirely on owned infrastructure
- httpOnly cookie transport is transparent to frontend JS — no token storage logic needed in the browser
- Minimal new dependencies: `@fastify/jwt`, `@fastify/cookie`, `argon2`
- Clean mapping to existing `users` table — just add `email` and `password_hash` columns

**Cons:**
- You own the full security surface: must correctly implement password hashing, token expiry, cookie flags (`httpOnly`, `secure`, `sameSite`), and logout/token invalidation
- No built-in OAuth/social login (not needed for MVP; can be added later)
- Token refresh requires manual implementation if access tokens are short-lived (mitigated by using a single longer-lived token for this project's scope)

**Effort:** Medium — ~2–3 stories for full implementation

### Option B — Better Auth

**Approach:** `better-auth` is a TypeScript-first auth library with a Drizzle adapter. It manages user sessions, provides email/password auth, and can generate its own DB schema.

**Pros:**
- Type-safe API with good DX
- Official Drizzle adapter — can generate and run migrations
- Handles edge cases (rate limiting, CSRF) out of the box
- Supports email/password + OAuth providers

**Cons:**
- **Fastify support is secondary** — Better Auth is designed primarily for Next.js and Express. Fastify integration requires a manual adapter or using the generic `toNodeHandler()` escape hatch, which bypasses Fastify's plugin/hook architecture
- **Schema ownership conflict** — Better Auth expects to own the `user` table schema (with its own column conventions like `emailVerified`, `image`). Coexisting with the existing `users` table requires careful mapping or accepting duplicate concepts
- **Young library** (~1 year old) — smaller community, fewer production battle-tests, API surface may still shift
- **Abstraction mismatch** — hides auth internals behind a framework, reducing learning value
- **Debugging complexity** — when something goes wrong inside Better Auth's session handling or token flow, you're debugging a third-party abstraction rather than code you wrote

**Effort:** Medium — but significant time may be spent on Fastify adapter workarounds

### Option C — Clerk (External Service)

**Approach:** Clerk handles all auth UI and session management externally. The API verifies Clerk-issued JWTs via JWKS. Pre-built React components handle login/register.

**Pros:**
- Fastest time-to-value — pre-built UI, session management, user management dashboard
- Free tier generous (10k MAU)
- Handles security edge cases (brute force, session fixation, etc.)

**Cons:**
- **Vendor lock-in** — auth is entirely dependent on an external service; cannot run offline or in a closed Docker environment without internet access
- **Violates self-hosted constraint** — `docker compose up` would not produce a working app without Clerk API keys and internet connectivity
- **Minimal learning value** — auth internals are a black box
- **Schema disconnect** — Clerk owns user identity; the local `users` table would need a sync mechanism (webhook or lazy-create on first API call) to maintain the `user_id` FK relationship
- **Cost risk** — free tier is generous now but pricing changes are outside our control

**Effort:** Low implementation, but high integration complexity for the existing user/todo data model

### Option D — Session-based (`@fastify/session` + `@fastify/cookie`)

**Approach:** Server-side sessions stored in Postgres (via `connect-pg-simple`). Login creates a session; a session ID cookie identifies the user on subsequent requests.

**Pros:**
- Simple mental model — session data lives on the server, cookie is just an opaque ID
- `@fastify/session` and `@fastify/cookie` are Fastify-org maintained
- Immediate revocation — delete the session row and the user is logged out
- No JWT complexity (no expiry/refresh/signing considerations)

**Cons:**
- **Stateful** — every request requires a DB lookup to resolve the session; adds latency and DB load
- **Horizontal scaling** — requires shared session store (Postgres handles this, but adds coupling); sticky sessions needed if using in-memory store
- **Less portable** — session-based auth is harder to extend to mobile clients or service-to-service calls later
- **New table required** — needs a `sessions` table with its own cleanup/expiry logic
- **Learning value** is moderate — less transferable to modern API patterns (most modern APIs use token-based auth)

**Effort:** Medium — similar to Option A, but with session store setup overhead

## Decision

**Option A — DIY JWT with `@fastify/jwt` + `argon2` + `@fastify/cookie`**

### Rationale

Option A is the strongest fit across all evaluation criteria:

1. **Stack alignment:** `@fastify/jwt` and `@fastify/cookie` are first-party Fastify plugins, designed for the plugin/hook architecture already used in this project. They follow the same `FastifyPluginAsync` pattern as `validateUserPlugin`, `errorHandlerPlugin`, and `requestIdPlugin`.

2. **Learning value:** This project explicitly values understanding auth internals. DIY JWT forces correct implementation of password hashing, token signing, cookie security, and auth middleware — knowledge that transfers to any future project.

3. **No vendor lock-in:** Runs entirely on owned infrastructure. `docker compose up` produces a fully working app with no external service dependencies.

4. **Clean schema extension:** The existing `users` table gains two columns (`email`, `password_hash`). No new tables required for MVP auth (unlike sessions which need a `sessions` table, or Better Auth which expects its own schema).

5. **Minimal new dependencies:** Three focused, well-maintained packages — no large framework with features we don't need.

### Why not the others?

- **Better Auth (B):** Fastify is not a first-class target. The adapter workarounds and schema ownership conflicts would consume effort better spent on understanding auth fundamentals. If the project used Next.js, this would be the top candidate.
- **Clerk (C):** Violates the self-hosted and learning-value constraints. The vendor dependency is unacceptable for a project that must work fully offline in Docker.
- **Session-based (D):** Viable but less modern. The stateful session store adds DB overhead on every request and is less portable to future mobile or API-to-API scenarios. JWT is stateless and more aligned with current industry practice.

## Consequences

### Positive

- Full ownership and understanding of every auth decision
- Clean, minimal extension of the existing schema and plugin architecture
- No vendor dependencies — fully self-hosted, works offline in Docker
- httpOnly cookie transport means no token storage logic in the React app
- `argon2` provides OWASP-recommended password hashing with no bcrypt legacy concerns
- Auth middleware slots naturally into Fastify's hook system, replacing `validateUserPlugin` with a JWT verification hook

### Negative / Trade-offs

- **Security responsibility:** We own the full auth surface. Must correctly implement: password hashing with argon2, JWT signing with a strong secret, httpOnly + secure + sameSite cookie flags, CSRF protection (sameSite=strict or double-submit pattern), and input validation on auth endpoints.
- **No built-in OAuth:** Social login (Google, GitHub) would require additional implementation. Not needed for the current scope but noted as a future effort.
- **Token revocation is limited:** JWTs are stateless — a signed token is valid until expiry. For this project's scope (single-user learning app), short-lived tokens (e.g., 7 days) with re-login on expiry is acceptable. A token blacklist or refresh token rotation can be added later if needed.
- **No email verification flow:** MVP auth will not include email verification. Users register and can log in immediately. This is acceptable for a learning project; a verification flow can be layered on later.

## Implementation Outline (for Story 6.1+)

### DB Schema Changes

Add two columns to the `users` table via a new Drizzle migration:

```ts
// New columns on existing `users` table
email: text("email").notNull().unique(),
passwordHash: text("password_hash").notNull(),
```

- `email` is the login identifier — unique, not null, indexed
- `passwordHash` stores the argon2 hash — never exposed in API responses
- Existing `id` (UUID PK), `name`, `createdAt`, `updatedAt` remain unchanged
- Existing `todos.user_id` FK is unaffected
- Migration approach: new migration file via `drizzle-kit generate`, no destructive changes
- The default seeded user will need a backfill (email + password hash) or be recreated in the migration

### New Dependencies

```
@fastify/jwt    — JWT signing/verification (Fastify-org maintained)
@fastify/cookie — Cookie parsing/setting (Fastify-org maintained)
argon2          — Password hashing (OWASP-recommended)
```

### API Surface

All new routes under `/api/auth/` prefix (via Fastify route registration, proxied through nginx like existing routes).

#### `POST /api/auth/register`

Register a new user with email and password.

**Request body:**
```json
{
  "email": "user@example.com",
  "password": "securepassword123",
  "name": "Alice"
}
```

**Success response (201):**
```json
{
  "id": "uuid",
  "email": "user@example.com",
  "name": "Alice",
  "createdAt": "ISO-8601",
  "updatedAt": "ISO-8601"
}
```
Sets httpOnly cookie with signed JWT.

**Error responses:**
- `400 VALIDATION_ERROR` — missing/invalid fields, password too short
- `409 CONFLICT` — email already registered

#### `POST /api/auth/login`

Authenticate with email and password.

**Request body:**
```json
{
  "email": "user@example.com",
  "password": "securepassword123"
}
```

**Success response (200):**
```json
{
  "id": "uuid",
  "email": "user@example.com",
  "name": "Alice",
  "createdAt": "ISO-8601",
  "updatedAt": "ISO-8601"
}
```
Sets httpOnly cookie with signed JWT.

**Error responses:**
- `400 VALIDATION_ERROR` — missing fields
- `401 UNAUTHORIZED` — invalid email or password (deliberately vague to prevent enumeration)

#### `POST /api/auth/logout`

Clear the auth cookie.

**Success response (204):** No body. Clears the httpOnly cookie.

#### `GET /api/auth/me`

Return the currently authenticated user (useful for session persistence check on page load).

**Success response (200):**
```json
{
  "id": "uuid",
  "email": "user@example.com",
  "name": "Alice",
  "createdAt": "ISO-8601",
  "updatedAt": "ISO-8601"
}
```

**Error response:**
- `401 UNAUTHORIZED` — no valid token

### Auth Middleware Transition

The current `validateUserPlugin` reads `x-user-id` from headers. It will be replaced by a JWT verification plugin:

```
Current flow:  x-user-id header → DB lookup → request.userId
New flow:      httpOnly cookie → JWT verify → request.userId (from token payload)
```

The new plugin will:
1. Extract the JWT from the httpOnly cookie (via `@fastify/cookie`)
2. Verify the signature and expiry (via `@fastify/jwt`)
3. Set `request.userId` from the token payload
4. Return 401 if the cookie is missing, expired, or invalid

Auth routes (`/api/auth/*`) will be registered outside the auth middleware scope so they remain accessible to unauthenticated users.

### Web Client Changes

**Current auth bypass (`App.tsx`):**
- Line 2: `import { DEFAULT_USER_ID } from "shared"`
- Line 12: `useTodos({ userId: DEFAULT_USER_ID })`

**After auth implementation:**
- Remove `DEFAULT_USER_ID` import and usage
- `useTodos` no longer needs a `userId` parameter — the server identifies the user from the JWT cookie
- All `fetch()` calls in `useTodos` automatically include the httpOnly cookie (same-origin, no JS intervention needed)
- The `x-user-id` header is removed from all fetch calls

**Token/session storage:**
- httpOnly cookie — set by the server, sent automatically by the browser on same-origin requests
- No localStorage, no sessionStorage, no in-memory token management
- This is the most secure approach: JS cannot access the token, eliminating XSS token theft

**New components needed:**
- `LoginForm` — email + password fields, submit, error display
- `RegisterForm` — email + password + name fields, submit, error display
- Auth-aware routing: unauthenticated users see login/register; authenticated users see the todo list

### UX Implications

**Login screen:**
- Fields: email, password
- Validation: required fields, email format (client-side), password minimum length
- Error states: inline field validation + server error display (wrong credentials)
- Submit: POST to `/api/auth/login`, on success redirect to `/` (todo list)

**Register screen:**
- Fields: name, email, password
- Validation: required fields, email format, password minimum length (e.g., 8 chars)
- Error states: inline field validation + server error (email taken)
- Submit: POST to `/api/auth/register`, on success redirect to `/` (todo list, auto-logged-in)

**Session persistence:**
- httpOnly cookie survives page refresh — user stays logged in
- Cookie expiry (e.g., 7 days) determines max session length
- On cookie expiry, the next API call returns 401, and the app redirects to `/login`

**Redirect behaviour:**
- Unauthenticated user visiting `/` → redirect to `/login`
- Successful login/register → redirect to `/` (todo list)
- Logout → clear cookie, redirect to `/login`

**Logout:**
- A logout button/link in the app UI
- POST to `/api/auth/logout` → clears the cookie → redirect to `/login`

### Docker / nginx Considerations

For httpOnly cookies to work through the nginx reverse proxy:

```nginx
location /api/ {
    rewrite ^/api(/.*)$ $1 break;
    proxy_pass http://api:${API_PORT};
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_pass_header Set-Cookie;  # Ensure cookies survive the proxy hop
}
```

Cookie options in Fastify:
- `httpOnly: true` — not accessible from JS
- `secure: true` in production (HTTPS), `secure: false` in local dev (HTTP)
- `sameSite: "lax"` — allows the cookie on top-level navigations, prevents CSRF on cross-origin POST
- `path: "/"` — cookie sent on all routes
- `domain`: omit (defaults to the current host) — works for both local dev and Docker

The JWT secret must be provided via environment variable (`JWT_SECRET`), never hardcoded.
