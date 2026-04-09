---
stepsCompleted: [1, 2, 3, 4, 5, 6, 7, 8]
inputDocuments:
  - _bmad-output/planning-artifacts/prd.md
  - _bmad-output/planning-artifacts/ux-design-specification.md
  - _bmad-output/planning-artifacts/prd.validation-report.md
workflowType: "architecture"
project_name: "bmad-todo"
user_name: "Andrea"
date: "2026-03-26"
lastStep: 8
status: "complete"
completedAt: "2026-03-26"
---

# Architecture Decision Document

_This document builds collaboratively through step-by-step discovery. Sections are appended as we work through each architectural decision together._

## Project Context Analysis

### Requirements Overview

**Functional Requirements (architectural implications):**

- CRUD over todos with durability (refresh-safe) implies a backend API + persistence layer and a clear client state model.
- Inline edit + toggle + soft delete implies partial updates, operations with predictable reconciliation on failures, and explicit pending/error UI semantics.
- Ordering newest-first and excluding deleted implies server-defined sorting/filtering rules (or clearly defined client responsibility).
- Global error + retry implies a standardized error contract and UI-wide error handling pattern.
- Automated flow-level tests for success/failure implies stable UI states and deterministic API error behaviors.

**Non-Functional Requirements (what will drive design):**

- Performance: p95 API ≤300ms (dev baseline), UI feedback ≤200ms; initial usable ≤2s p95 on modern mobile.
- Reliability: no data loss; no inconsistent UI after failed operations.
- Security baseline: safe rendering/handling of user text; TLS when deployed.
- Accessibility best-effort: keyboard operability + accessible names; predictable focus; announce errors without stealing focus.

**Scale & Complexity:**

- Primary domain: full-stack SPA + API
- Complexity level: low (scope) + medium (failure rigor/testing)
- Estimated architectural components: 4–6 (UI, API, persistence, shared contracts/types, tests, minimal observability)

### Technical Constraints & Dependencies

- Single-user MVP; no auth, multi-tenancy, realtime, or offline-first required.
- Modern browser support; mobile-first; single route/screen.
- API must emit stable error codes + human messages; every response includes `x-request-id` header.
- Soft delete semantics must be consistent across API + UI.

### Cross-Cutting Concerns Identified

- Error taxonomy + mapping to UX copy (global banner vs inline validation).
- State consistency rules for optimistic updates and rollback/revert behavior.
- Validation consistency (trim rules, max length constant, preservation of typed text).
- Observability/debuggability via `x-request-id` header propagation.
- Accessibility and focus management as part of core flow correctness.
- Testability: deterministic states for load/mutation failures and retries.

## Starter Template Evaluation

### Primary Technology Domain

Full-stack web app (SPA + separate HTTP API), based on PRD/UX:

- React SPA (single screen)
- Separate backend API with CRUD + stable error contracts
- Postgres persistence

### Starter Options Considered

**Option 1: Vite (React + TypeScript) for SPA**

- Official scaffold flow: `npm create vite@latest`
- Template: `react-ts` ensures TS/TSX source.

**Option 2: Fastify CLI generator (TypeScript) for API**

- Fastify ecosystem provides `fastify-cli` scaffolding:
  - `fastify generate <app>` with `--lang=ts` / `--lang=typescript`
- Generates the typical Fastify structure (routes/plugins/tests) which maps well to the PRD’s “clear API contract + resilience”.

**Option 3: Monorepo tooling (npm workspaces)**

- npm workspaces are supported directly by npm:
  - Root `package.json` defines `workspaces`
  - Run workspace commands via `-w/--workspace` (e.g., `npm install <pkg> -w <workspaceNameOrPath>`)

### Selected Starter: npm workspaces + Vite(react-ts) + Fastify TS generator

**Rationale for Selection:**

- Matches explicit stack decisions: TypeScript everywhere, React SPA, separate Fastify API, Postgres.
- Minimal framework “magic” while still giving modern DX.
- Workspaces keep FE/BE in one repo but cleanly separated.

**Initialization Commands (monorepo layout: `packages/web`, `packages/api`)**

```bash
# SPA (React + TypeScript)
npm create vite@latest src/web -- --template react-ts

# API (Fastify + TypeScript template)
npm exec --package fastify-cli -- fastify generate src/api --lang=ts
```

**Monorepo root setup (conceptual):**

- Root `package.json` will declare workspaces like:
  - `packages/*`
  - (optional later) `packages/*` for shared types/contracts between API and SPA

**Architectural Decisions Provided by Starters:**

**Language & Type System:**

- SPA: TypeScript + React TSX out of the box.
- API: Fastify project skeleton with TypeScript support via `--lang=ts`.

**Build Tooling:**

- SPA: Vite dev/build/preview scripts.
- API: Fastify CLI-centric scripts (start/dev/test) depending on generated template.

**Code Organization:**

- `packages/web`: UI and client state
- `packages/api`: HTTP API + DB integration (Postgres)

**Note:** Project initialization using these commands should be the first implementation story.

## Core Architectural Decisions

### Version Matrix (verified at architecture time)

- **Runtime/tooling:** Node `>=22.12`, npm workspaces
- **Web:** React `19.2.4`, React DOM `19.2.4`, Vite `8.0.3`, TypeScript `6.0.2`
- **API:** Fastify `5.8.4`, `fastify-cli` `7.4.1`, `pg` `8.20.0`
- **DB:** Postgres + Drizzle ORM `0.45.1` + Drizzle Kit `0.31.10`
- **Testing:** Vitest `4.1.2`, `@testing-library/react` `16.3.2`, `@testing-library/jest-dom` `6.9.1`, Playwright `1.58.2`
- **Security plugins:** `@fastify/cors` `11.2.0`, `@fastify/helmet` `13.0.2`, `@fastify/rate-limit` `10.3.0`

### Development Tooling (Formatting/Linting)

- **Tool:** Biome (format + lint)
- **Scripts:**
  - `biome:check`: `biome check .`
  - `biome:fix`: `biome check --write .`
- **TypeScript-only policy:** application source is TS/TSX only; TypeScript `allowJs: false` enforced in all `tsconfig.json`.

### API Contract Sharing (BE → FE)

Goal: if the backend changes its public API (request/response shapes), the frontend should fail fast during typechecking and/or code generation.

**Contract source of truth:** API route schemas in `packages/api`.

**Published artifact (version controlled):** OpenAPI spec generated from those schemas.

- **OpenAPI file path (committed):** `packages/api/openapi.json`
- **Generation is mandatory:** when API route schemas change, `packages/api/openapi.json` must be updated in the same PR.
- **Frontend types are derived from OpenAPI:** `npm run build:api-types` uses `openapi-typescript` to generate typed interfaces from `packages/api/openapi.json` into `packages/web/packages/api/generated/index.ts`.
- **Automation:** a git `pre-commit` hook runs `npm run build:openapi` to keep the committed OpenAPI in sync.
- **Hook tool:** use `simple-git-hooks.

**CI enforcement (required):**

- CI runs `npm run build:openapi` and `npm run build:api-types`.
- CI then runs `git diff --exit-code` (or equivalent) to ensure contract artifacts are committed; this prevents merging API changes without updating the OpenAPI and the derived frontend types.

Example hook configuration shape (to be applied in root `package.json` when scaffolding begins):

```json
{
  "scripts": {
    "prepare": "simple-git-hooks",
    "build:openapi": "npm -w api run build:openapi",
    "build:api-types": "npm -w web run build:api-types"
  },
  "simple-git-hooks": {
    "pre-commit": "npm run test:ci && npm run build:openapi && npm run build:api-types && git add packages/api/openapi.json packages/web/packages/api/generated"
  }
}
```

#### Canonical npm scripts (contract)

Define script names and responsibilities _now_ to prevent divergence. Exact underlying commands can be adjusted during scaffolding, but the **names and intent below are treated as stable**.

**Root (`/package.json`)**

- `biome:check` / `biome:fix`: run Biome over the whole repo.
- `build:openapi`: generate/update the committed OpenAPI spec (`packages/api/openapi.json`).
- `build:api-types`: regenerate frontend API types/client from the committed OpenAPI.
- `type:check`: run TypeScript typechecking across all workspaces.
- `source:check`: biome:check + type:check + any other static source check
- `test`: run all non-E2E tests across all workspaces (web unit/component + API integration).
- `test:ci`: run all non-E2E tests across all workspaces (web unit/component + API integration) (non-watch, CI-friendly).
- `test:e2e`: run Playwright E2E suite (from the web workspace).
- `build`: build all workspaces required for production (at minimum: `shared`, `api`, `web`).
- `dev:web`: start Vite dev server (watch mode).
- `dev:api`: start API dev server (watch mode).
- `dev`: dev:web + dev:api

Notes:

- Prefer `npm -w <workspace> run <script>` for workspace-specific commands.
- A root `dev` script is allowed for convenience and may use `concurrently`; `dev:web` and `dev:api` remain the canonical entrypoints.
- `test` is intended as a handy dev command (may be watch/interactive); `test:ci` is the non-watch single-shot entrypoint used by hooks/CI.

**Web workspace (`packages/web/package.json`)**

- `dev`: Vite dev server in watch mode.
- `build`: Vite production build.
- `start`: serve the built SPA locally.
- `test`: Vitest unit/component tests.
- `test:ci`: Vitest unit/component tests (non-watch, CI-friendly).
- `test:e2e`: Playwright tests.
- `type:check`: `tsc --noEmit` (workspace-local typecheck).
- `build:api-types`: regenerate the FE types via `openapi-typescript` from the committed OpenAPI spec (`openapi-typescript ../api/openapi.json -o packages/api/generated/index.ts`).

**API workspace (`packages/api/package.json`)**

- `dev`: run Fastify in watch mode.
- `build`: compile TypeScript to `dist/`.
- `build:openapi`: generate/update `openapi.json` (OpenAPI spec) from route schemas.
- `start`: run the compiled server (`dist/`) for production-like runs.
- `test`: Vitest API integration tests using `fastify.inject()`.
- `test:ci`: Vitest API integration tests using `fastify.inject()` (non-watch, CI-friendly).
- `type:check`: `tsc --noEmit` (workspace-local typecheck).
- `db:generate`: generate a new migration from Drizzle schema changes (expects `DATABASE_URL` in env — CI/deploy).
- `db:migrate`: apply migrations (expects `DATABASE_URL` in env — CI/deploy).
- `db:generate:local`: generate migration against the dev database (loads `.env`, starts Docker).
- `db:generate:test`: generate migration against the test database (loads `.env.test`, starts Docker).
- `db:migrate:local`: apply migrations to the dev database (loads `.env`, starts Docker).
- `db:migrate:test`: apply migrations to the test database (loads `.env.test`, starts Docker).
- `db:reset`: truncate `todos` in the configured database (wraps `scripts/db-reset.ts`, which reuses `cleanupTestDatabase` from test-utils).

**Shared workspace (`packages/shared/package.json`)**

- `build`: emit types/build outputs as needed by downstream packages (if any).
- `type:check`: `tsc --noEmit`.

### Testing Strategy & Tooling

- **Web unit/component:** Vitest + React Testing Library (+ jest-dom)
- **Web network mocking (component tests):** MSW (`msw` + `msw/node`) intercepting HTTP requests at the boundary (preferred over stubbing internal API clients)
- **Web E2E:** Playwright
- **API integration:** Vitest + `fastify.inject()` (no real network; deterministic + fast)

### Test & Local Data Reset (Todos)

- **Principle:** resetting data is a development/testing concern, not a user-facing MVP feature.
- **Do not expose a public reset API endpoint** (avoids accidentally shipping a destructive capability).
- **Tests:** reset state at the database level.
  - Use a dedicated test database via the root `.env.test` (`DATABASE_URL` pointing to the test DB) to prevent wiping dev data.
  - API Vitest and Playwright both load the root `.env.test` automatically.
  - Per-file isolation: each API test file creates its own user in `beforeAll` via `createTestUser` and cleans only that user's todos in `beforeEach` via `cleanupUserTodos`. API test files run in parallel (`fileParallelism: true`).
- **Local usage:** provide a local script to clear todos in the dev database.
  - Implement as a Node/TS script in `packages/api/scripts/db-reset.ts` that reuses `cleanupTestDatabase` from test-utils. The script does not load any env file itself — the caller provides `DATABASE_URL` via `--env-file` or `loadEnvFile`.
  - Expose it via an npm script in the API workspace and (optionally) a root convenience script that runs the workspace script.
- **E2E:** run the reset script before Playwright suites (and optionally per spec) to keep runs deterministic.

### Task-by-Task Testing Strategy (Definition of Done)

To keep quality high while moving quickly, every story/task is considered **done** only when it ships with the smallest appropriate set of tests at the right layer.

**Test pyramid for this repo (MVP):**

- **API integration (primary):** Vitest + `fastify.inject()` against a real test Postgres database. These tests protect contracts, DB behavior (ordering/filtering/soft delete), and error shapes.
- **Web unit/component (primary):** Vitest + React Testing Library, with MSW mocking HTTP requests (or, if needed, an injected `fetch`) to validate UX states and failure handling deterministically.
- **E2E (selective):** Playwright for the end-to-end critical loop and failure-mode regressions. Keep E2E small but representative; it should validate the system wiring (web ↔ api ↔ db) rather than re-test every edge case.

**Incremental mapping to epics/stories (practical guidance):**

- **Story 1.1 (scaffold):** establish runnable `test`, `test:ci`, and workspace test scripts; add one smoke test per workspace (API: boot app; Web: render App) to prove tooling.
- **Story 1.2 (DB schema):** add a DB reset helper and prove it via one API test that creates and

**Determinism rules (non-negotiable):**

- API tests must start from a known DB state (truncate via helper) and must not depend on execution order.
- Web tests must not hit the real network; they control responses via MSW handlers (preferred) or injected `fetch`.
- E2E tests must reset the DB before the suite (and optionally between specs) using the reset script; do not add a public reset API.

### Data Architecture

- **Database:** Postgres
- **DB access:** Drizzle ORM (`drizzle-orm@0.45.1`) + `pg`
- **Migrations:** Drizzle Kit (`drizzle-kit@0.31.10`)
- **IDs & timestamps:**
  - `id`: Postgres `uuid`, generated in-app via `crypto.randomUUID()`
  - `created_at`, `updated_at`: `timestamptz`
  - Soft delete: `deleted_at timestamptz null`
- **Timestamp wire format:** API responses expose `createdAt`, `updatedAt`, and `deletedAt` as ISO RFC 3339 date-time strings (UTC, `Z` suffix).
- **Timestamp ownership:** server sets `created_at`/`updated_at` on create and sets `updated_at` on any update (text/completed/delete).
- **List semantics:**
  - Default list excludes soft-deleted rows (`deleted_at is null`)
  - Default ordering is newest first (`created_at desc`)
- **Text constraints:**
  - `MAX_TODO_TITLE_LENGTH = 100` (title field)
  - `MAX_TODO_TEXT_LENGTH = 500` (optional description field)
  - Validation trims input and rejects empty/whitespace-only values
- **Shared constants location (monorepo):** `packages/shared/src/constants.ts` exports `MAX_TODO_TITLE_LENGTH` and `MAX_TODO_TEXT_LENGTH` so both `packages/web` and `packages/api` consume the same values.

### Authentication & Security

- **Authentication (MVP):** none (single-user MVP — `x-user-id` header placeholder)
- **Authentication (Epic 6):** strategy TBD — see Story 6.0 ADR in `docs/decisions/`.
  Options evaluated: DIY JWT (`@fastify/jwt` + bcrypt), Better Auth (Drizzle adapter),
  Clerk (external service), session-based (`@fastify/session`).
  Decision and implementation details will be appended here after ADR approval.
- **API guard:** none (no static API key)
- **CORS:** enabled and restricted to the SPA origin (no `*`) via `@fastify/cors@11.2.0`
  - Use env var `WEB_ORIGIN` to configure the allowed origin in non-local environments.
- **Security headers:** baseline security headers via `@fastify/helmet@13.0.2`
- **Rate limiting:** optional; default off for MVP (enable later if needed) via `@fastify/rate-limit@10.3.0`
- **Error/validation hygiene (baseline):** validate inputs at the API boundary; never render user text as HTML; return a stable error response shape with machine code + human message; `x-request-id` is conveyed via response header only.

### API & Communication Patterns

- **API style:** REST + JSON over HTTP
- **Endpoints (per PRD):**
  - `GET /todos` (list, excludes soft-deleted)
  - `POST /todos` (create)
  - `PATCH /todos/:id` (update text and/or completion)
  - `DELETE /todos/:id` (soft delete)

- **Route schema definitions:**
  - Routes should define strict input/output JSON schema definitions
  - Such schemas should be enforced and reused in the type handler using: `@fastify/type-provider-json-schema-to-ts`
  - Every route must infer both request input and response output types from its route schema via `@fastify/type-provider-json-schema-to-ts`; avoid manual request/response typings that duplicate schema intent
  - Canonical entity and contract JSON schemas live in `packages/shared/src/definitions/` as the single source of truth. Each definition file exports both the `as const` JSON schema object and a `FromSchema`-inferred TypeScript type. Both the API and web workspaces import schemas and types from `shared`.

- **OpenAPI contract:**
  - OpenAPI generated/exposed with `@fastify/swagger` and `@fastify/swagger-ui`
  - generated from route schemas and committed at `packages/api/openapi.json`.

- **JSON field naming:** `camelCase` in API JSON requests/responses
  - DB columns remain `snake_case` (Drizzle maps between DB and TS types)
- **Date-time field format:** all Todo date fields use JSON Schema / OpenAPI `format: date-time` (RFC 3339).

- **Success response shapes (direct resources; no `{ data: ... }` wrapper):**
  - `GET /todos` → `{ todos: Todo[] }`
  - `POST /todos` → `Todo`
  - `PATCH /todos/:id` → `Todo`
  - `DELETE /todos/:id` → `204 No Content`

- **Error response contract (stable `code` + displayable `message`):**

  ```ts
  export type ApiErrorResponse = {
    code: string;
    message: string;
  };
  ```

  - **Minimum error codes (MVP):** `VALIDATION_ERROR`, `NOT_FOUND`, `CONFLICT`, `INTERNAL_ERROR`, `BAD_REQUEST`

- **HTTP status mapping (MVP):**
  - `400` for validation or bad request payloads (`VALIDATION_ERROR` or `BAD_REQUEST`)
  - `404` when `:id` not found (`NOT_FOUND`)
  - `409` for conflicts if/when applicable (`CONFLICT`)
  - `500` for unexpected failures (`INTERNAL_ERROR`)

- **`x-request-id` propagation:**
  - API always produces a request ID per request
  - API returns it via a required `x-request-id` response header (not in the JSON body)
  - If an inbound `x-request-id` is provided, the API reuses it; otherwise generates a new UUID

- **Retry semantics (MVP):**
  - Retries are client behavior
  - UI provides explicit retry for `GET /todos` load failures
  - Mutations are not auto-retried; user retries by re-attempting the action

### Frontend Architecture

- **State management:** React built-ins only (`useState` / `useReducer`) + custom hooks (no external global state library for MVP)
- **Data fetching:** plain `fetch` wrapped by a typed client (e.g., `apiClient.ts`) with consistent mapping to `ApiErrorResponse`
- **Styling:** plain CSS + CSS Modules (no UI kit; no Tailwind for MVP), organized as a 2-tier design token system:
  - **Tier 1 — Primitives** (`tokens/primitives.css`): raw palette values (colors, spacing, typography, radii) with `--p-` prefix. Names describe the value, not its usage.
  - **Tier 2 — Semantic** (`tokens/semantic.css`): purpose-driven aliases of primitives with `--s-` prefix. Dark mode overrides live here exclusively.
  - Component styles (`*.module.css`) consume only semantic tokens (`--s-*`); never reference primitives or hard-coded values.
  - Global base styles and token imports: `index.css`
  - Rules: no `var()` fallbacks; no `prefers-color-scheme` in component modules; new primitives must extend an existing scale; new semantic tokens must have at least one consumer.
- **Error surface:** single global error banner for network/server failures (per UX), inline validation for user input errors
- **Optimistic / pending UI rules (per UX):**
  - Create: may optimistically add a temporary row with pending indicator; on failure remove temp row and preserve input
  - Toggle/edit: may optimistically update with pending indicator; on failure revert UI state and show global error
  - Delete: not optimistic; keep row visible until API confirms delete; on failure keep row and show global error

### Infrastructure & Deployment

- **Node.js baseline:** Node ≥ 22.12 (compatible with Vite requirements)
- **Package manager / monorepo:** npm workspaces (root `package.json` workspaces: `packages/*`), single root `package-lock.json`
- **Local development dependencies:**
  - Git (used for hooks and normal workflow)
  - Docker-compatible runtime (macOS: Colima; Docker Desktop also works)
  - `docker-compose` (or `docker compose`) for local services
- **Local Postgres (dev):** single root-level `docker-compose.yml` manages Postgres
  - API and migration tooling connect via `DATABASE_URL`
- **Environment variables:**
  - All env files live at the **project root** (`.env`, `.env.test`, `.env.example`) — no per-package env files
  - Commit `.env.example` and `.env.test`, never commit real `.env`
  - `.env` defines dev ports (`WEB_PORT=5173`, `API_PORT=3001`) and dev database; `.env.test` defines isolated test ports (`WEB_PORT=5174`, `API_PORT=3002`) and test database
  - API env access is centralized in `packages/api/src/config.ts` and validated via `env-schema` (loads root `.env`)
  - Vite loads root `.env` only when `WEB_PORT` is not already set (so Playwright-spawned servers inherit `.env.test` values)
  - Vitest and Playwright load root `.env.test` explicitly via `loadEnvFile`
  - The rest of the API codebase must not read `process.env` directly; it consumes the exported config object instead
- **Migrations:** Drizzle Kit runs against `DATABASE_URL` (same URL used by API runtime)
- **Deploy shape (MVP):** Docker Compose — three services: `db`, `api`, `web` (see Docker Deployment below)

### Docker Deployment (Epic 5)

**Service topology:**

```
┌─────────────────────────────────────────────────┐
│  docker-compose.prod.yml                        │
│                                                 │
│  [web: nginx:alpine]  →proxy→  [api: node:22]  │
│                                      │          │
│                               [db: postgres:16] │
└─────────────────────────────────────────────────┘
```

**API container (`packages/api/Dockerfile`):**
- Multi-stage build (monorepo root as context)
- `builder` stage: Node 22 Alpine, installs all deps, compiles `shared` + `api` to `dist/`
- `runtime` stage: Node 22 Alpine, production deps only (`npm ci --omit=dev`), copies `dist/` and `drizzle/` SQL migration files
- Entrypoint: `node dist/db/migrate.js && node dist/server.js` (migration runs on every startup; idempotent)
- Required env vars: `DATABASE_URL`, `API_PORT`, `WEB_ORIGIN`

**Web container (`packages/web/Dockerfile`):**
- Multi-stage build (monorepo root as context)
- `builder` stage: Node 22 Alpine, installs all deps, runs `npm run build -w web`
- `runtime` stage: `nginx:alpine`, serves `dist/` static files
- Nginx proxies `/todos` and `/users` to `http://api:${API_PORT}` — mirrors the Vite dev proxy; no web source changes required
- SPA fallback: all non-API paths return `index.html`
- Required build arg / env: `API_PORT` (for Nginx upstream, resolved via `envsubst` at container start)

**Production Compose (`docker-compose.prod.yml`):**
- `db`: `postgres:16-alpine`, named volume for data persistence, health check
- `api`: depends on `db` (healthy), reads from `.env.prod` (git-ignored; `.env.prod.example` committed)
- `web`: depends on `api`, exposes host port (e.g. 80)
- TLS: terminated by an upstream reverse proxy (Nginx/Caddy/load balancer) outside Docker scope for MVP

**Migration strategy:**
- `packages/api/src/db/migrate.ts` — standalone script using drizzle-orm's programmatic `migrate()` API
- Compiled to `dist/db/migrate.js` as part of `npm run build`
- Runs before server start in the container entrypoint; idempotent (safe to re-run on restart)

**Environment variables (production):**

| Variable | Service | Description |
|---|---|---|
| `DATABASE_URL` | api | Postgres connection string |
| `API_PORT` | api, web | Fastify listen port (default 3001) |
| `WEB_ORIGIN` | api | CORS allowed origin for the web container |

## Implementation Patterns & Consistency Rules

This section is the enforcement layer to prevent AI-agent divergence. The canonical decisions are the sections above:

- **API contract:** see **API & Communication Patterns**
- **Frontend UX/state rules:** see **Frontend Architecture** + UX spec
- **Repo structure:** see **Project Structure & Boundaries**
- **Tooling/tests/reset policy:** see **Development Tooling**, **Testing Strategy**, and **Test & Local Data Reset**

### Naming & Boundaries (must follow)

- **DB naming:** tables/columns are `snake_case` (`todos`, `created_at`, etc.)
- **JSON naming:** `camelCase` in API requests/responses
- **Code naming:** TS/React standard (`PascalCase` types/components, `camelCase` functions/vars, `useXxx` hooks)
- **Boundaries:** `packages/web` (SPA) never accesses DB; `packages/api` owns DB access; `packages/shared` is the single source of truth for entity JSON schemas, derived TypeScript types, and shared constants.

### API Format Invariants (must follow)

- No response envelope like `{ data: ... }`
- Error responses always include `code` + `message` (no `requestId` in body)
- `x-request-id` response header is always present (required)

### Test & Dev Determinism (must follow)

- Tests run against a dedicated DB (root `.env.test` sets `DATABASE_URL` to the test database)
- State resets are DB-level truncations; do not add a production reset endpoint

### Testing Practices (must follow)

- Vitest tests use nested `describe(...)` / `it(...)` blocks (no top-level `it`)
- Each file starts with a high-level `describe` for the unit under test (e.g. route `GET /todos`, module `config`, etc.)
- Prefer integration tests that mirror product surfaces (API: `fastify.inject()`, Web: RTL + MSW) and keep assertions scoped to observable behavior

### CSS Token System (must follow)

- All visual values (colors, spacing, typography, radii) are defined as CSS custom properties in `packages/web/src/tokens/`.
- **Primitives** (`primitives.css`): raw palette with `--p-` prefix. Names describe the value itself (e.g., `--p-gray-400`, `--p-space-4`).
- **Semantic** (`semantic.css`): purpose-driven aliases with `--s-` prefix (e.g., `--s-text`, `--s-border-focus`). Dark mode (`prefers-color-scheme: dark`) overrides live here exclusively.
- Component `.module.css` files must only reference semantic tokens (`--s-*`). Never primitives, never hard-coded color/spacing values.
- No `var()` fallback values — a missing token is a bug.
- Component modules must not contain `prefers-color-scheme` media queries.
- New primitives must extend an existing scale; no one-off values.
- New semantic tokens must have at least one consumer; no speculative tokens.

### Anti-patterns (explicitly forbidden)

- Returning error bodies without `code`/`message`
- Introducing extra state libraries (Redux/Zustand/React Query) in MVP
- Deleting a todo in UI before the API confirms delete

## Project Structure & Boundaries

### Complete Project Directory Structure

```
bmad-todo/
├── package.json
├── package-lock.json
├── docker-compose.yml
├── docker-compose.prod.yml
├── .gitignore
├── .env.example
├── .env.test
├── README.md
├── scripts/
│   ├── docker-smoke-test.ts       # builds prod stack, verifies services, tears down
├── packages/
│   ├── shared/
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── src/
│   │       ├── constants.ts                # exports MAX_TODO_TITLE_LENGTH = 100, MAX_TODO_TEXT_LENGTH = 500
│   │       ├── definitions/
│   │       │   ├── todo.ts                 # canonical Todo JSON schema + inferred type
│   │       │   ├── api-error-response.ts   # canonical ApiErrorResponse JSON schema + inferred type
│   │       │   └── index.ts               # definitions barrel
│   │       └── index.ts                    # shared exports
│   │
│   ├── api/
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   ├── openapi.json                  # committed OpenAPI (generated from route schemas)
│   │   ├── src/
│   │   │   ├── config.ts                   # validated env config (single access point)
│   │   │   ├── server.ts                   # Fastify bootstrap + listen
│   │   │   ├── app.ts                      # Fastify instance factory (used by tests)
│   │   │   ├── plugins/
│   │   │   │   ├── request-id.ts           # x-request-id generation/echo
│   │   │   │   └── error-handler.ts        # maps errors -> ApiErrorResponse
│   │   │   ├── db/
│   │   │   │   ├── client.ts               # pg pool + drizzle instance
│   │   │   │   ├── todos.ts                # db query mapping for todos
│   │   │   │   └── schema.ts               # drizzle schema (todos table)
│   │   │   ├── routes/
│   │   │   │   ├── README.md
│   │   │   │   ├── shared/
│   │   │   │   │   └── schemas.ts          # shared headers, error response, InferRouteResponses type
│   │   │   │   ├── todos/
│   │   │   │   │   ├── index.ts            # todo route handlers (GET/POST/PATCH/DELETE /todos)
│   │   │   │   │   └── schemas.ts          # todo-specific route schemas & response types
│   │   │   │   └── users/
│   │   │   │       ├── index.ts            # user route handlers (POST /users)
│   │   │   │       └── schemas.ts          # user-specific route schemas & response types
│   │   ├── drizzle.config.ts               # drizzle-kit config
│   │   ├── drizzle/
│   │   │   └── migrations/                 # generated migrations
│   │   ├── scripts/
│   │   │   ├── build-openapi.ts            # openapi artifact generation script
│   │   │   └── db-reset.ts                 # local/test utility (truncate todos via cleanupTestDatabase); NOT an API endpoint
│   │   └── test/
│   │       ├── app.test.ts
│   │       ├── todos.get.test.ts
│   │       └── test-utils/
│   │           ├── db.ts                   # db helpers + global cleanup helper
│   │           ├── todos.ts                # todos seed/drop helpers
│   │           └── index.ts                # test-utils barrel exports
│   │
│   └── web/
│       ├── package.json
│       ├── tsconfig.json
│       ├── vitest.config.ts
│       ├── vite.config.ts                  # includes dev proxy for /todos → API
│       ├── index.html
│       ├── public/
│       ├── src/
│       │   ├── main.tsx
│       │   ├── App.tsx
│       │   ├── App.module.css
│       │   ├── App.test.tsx                # integration tests: load/structure
│       │   ├── App.create-todo.test.tsx    # integration tests: create flow
│       │   ├── index.css                   # imports tokens, global resets, base typography
│       │   ├── contracts.ts                # re-exports from shared
│       │   ├── tokens/
│       │   │   ├── primitives.css          # Tier 1: raw palette (--p-* prefix)
│       │   │   └── semantic.css            # Tier 2: purpose-driven aliases (--s-* prefix) + dark mode
│       │   ├── api/
│       │   │   ├── helpers.ts              # TypeScript response-type helpers
│       │   │   └── generated/              # OpenAPI-generated types/client
│       │   ├── hooks/
│       │   │   └── useTodos.ts             # React state + load/retry + mutations
│       │   ├── test-utils/
│       │   │   └── index.ts                # shared fixtures + fetch mock helpers
│       │   ├── components/
│       │   │   ├── AddTodoForm.tsx
│       │   │   ├── AddTodoForm.module.css
│       │   │   ├── AddTodoForm.test.tsx
│       │   │   ├── GlobalErrorBanner.tsx
│       │   │   ├── GlobalErrorBanner.module.css
│       │   │   ├── TodoList.tsx
│       │   │   └── TodoList.module.css
│       └── e2e/
│           ├── todo-flows.spec.ts          # playwright flows required by PRD
│           └── playwright.config.ts
│
└── _bmad-output/
    ├── planning-artifacts/
    │   └── architecture.md
    └── implementation-artifacts/
```

### Architectural Boundaries

**API boundaries**

- Public API surface is only `/todos` endpoints.
- DB is reachable only from `packages/api/src/db/*`.
- Error contract is enforced centrally by `packages/api/src/plugins/error-handler.ts`.
- `x-request-id` is generated/echoed centrally by `packages/api/src/plugins/request-id.ts`.

**Component boundaries**

- `packages/web` never imports DB logic.
- `packages/web` talks to API only through `packages/web/packages/api/*`.
- `packages/shared` contains only pure TS exports (no Node-only or DOM-only code).

**Data boundaries**

- Drizzle schema is the single source of truth for DB shape.
- API JSON uses `camelCase`; DB columns stay `snake_case`.

### Requirements → Structure Mapping

- **FR1 list on load / retry on failure:** `packages/web/src/hooks/useTodos.ts` + `GlobalErrorBanner.tsx`; API `GET /todos` in `packages/api/src/routes/todos/index.ts`.
- **FR2 create + validation:** `AddTodoForm.tsx` + shared `MAX_TODO_TEXT_LENGTH`; API `POST /todos`.
- **FR3 edit:** `TodoItem.tsx` inline edit + API `PATCH /todos/:id`.
- **FR4 toggle:** `TodoItem.tsx` + API `PATCH /todos/:id`.
- **FR5 soft delete:** `TodoItem.tsx` delete action + API `DELETE /todos/:id` + DB `deleted_at`.
- **FR22–FR23 error contract:** `packages/shared/src/types.ts` + `packages/api/src/plugins/error-handler.ts`.

## Architecture Validation Results

### Coherence Validation ✅

**Decision Compatibility:**

- The stack is coherent: Vite + React SPA, Fastify API, Postgres persistence, Drizzle ORM/Kit, npm workspaces, Biome, and the selected test tooling do not conflict.
- The “no `{ data: ... }` wrapper” rule is consistent with the FE plan (typed `fetch` wrapper) and reduces agent divergence.
- The `x-request-id` contract is implementable without third-party plugins (a tiny Fastify plugin can generate/echo `x-request-id` via response headers).

**Pattern Consistency:**

- Naming rules are consistent across layers: DB `snake_case`, JSON `camelCase`, TS conventions.
- Failure/consistency rules align across PRD + UX + architecture: no ghost state, preserve user input, explicit global error banner, deterministic retries.

**Structure Alignment:**

- The monorepo boundaries (`packages/web`, `packages/api`, `packages/shared`) match the decisions around shared constants/types, testing placement, and API contract ownership.

### Requirements Coverage Validation ✅

**Functional Requirements Coverage:**

- FR1–FR5 (CRUD + list ordering + soft delete) are covered by the `/todos` endpoints and the Drizzle/Postgres model.
- FR6–FR8 (inline validation + preserve text) are covered by shared `MAX_TODO_TEXT_LENGTH = 200` + trim rules + UI validation patterns.
- FR10/FR13–FR15 (consistent UI on failure + global error + retry) are covered by the global error banner + explicit retry for load + non-auto-retry mutation policy.
- FR22–FR23 (stable machine code + human message + optional details) are covered by the `ApiErrorResponse` contract + `x-request-id` header propagation rule.

**Non-Functional Requirements Coverage:**

- Performance targets are supported by: Fastify + inject-based API tests (fast feedback loop), no unnecessary client caching layers, and a minimal UI/state architecture.
- Security baseline is supported by: origin-restricted CORS, baseline security headers, and safe rendering guidance (no HTML injection).
- Accessibility baseline is supported by UX rules and component responsibilities (keyboard operability, predictable focus, aria-live for errors).

### Implementation Readiness Validation ✅

**Decision Completeness:**

- Critical decisions are recorded: stack, persistence/ORM, error contract, retry semantics, monorepo boundaries, and styling approach.

**Structure Completeness:**

- Step 6 includes a concrete tree that maps requirements to specific locations.

**Pattern Completeness:**

- The most common AI-agent divergence points (naming, response shapes, errors, retries, tests, shared constants) are explicitly constrained.

### Gap Analysis Results

**Critical Gaps:** none identified.

**Important Gaps (non-blocking):**

- Consider recording verified versions for the core runtime deps (Fastify, React, Vite, TypeScript, `pg`) in the decisions section if you want fully deterministic scaffolding.
- Decide dev-time SPA↔API integration approach (CORS-only vs Vite dev proxy). Current decisions support either.
- Choose and standardize the API request/response validation mechanism (Fastify JSON Schema vs a typed schema library) and ensure it always emits `VALIDATION_ERROR` consistently.

**Nice-to-Have:**

- Add a short “performance measurement profile” for NFRs (device/network/dev env) if you want strict repeatability of perf checks.
- **Multi-user / account ownership (post-MVP):** keep MVP single-user/no-auth. Introduce accounts later with a migration (add `account_id uuid not null`, backfill existing rows, index), then update API to scope list/mutations by account once authentication exists.

### Architecture Completeness Checklist

**✅ Requirements Analysis**

- [x] Project context thoroughly analyzed
- [x] Scale and complexity assessed
- [x] Technical constraints identified
- [x] Cross-cutting concerns mapped

**✅ Architectural Decisions**

- [x] Critical decisions documented
- [x] Technology stack fully specified
- [x] Integration patterns defined
- [x] Reliability/failure-mode behaviors specified

**✅ Implementation Patterns**

- [x] Naming conventions established
- [x] Structure patterns defined
- [x] API formats and error contract specified
- [x] Process patterns documented

**✅ Project Structure**

- [x] Complete directory structure defined
- [x] Component boundaries established
- [x] Integration points mapped
- [x] Requirements to structure mapping complete

### Architecture Readiness Assessment

**Overall Status:** READY FOR IMPLEMENTATION

**Confidence Level:** high

**Key Strengths:**

- Clear failure-mode contract aligned across PRD + UX + architecture
- Strong consistency rules (response shape + errors + naming + tests)
- Simple, strict TypeScript-first workflow (Biome + TS-only + shared package)

**Areas for Future Enhancement:**

- Optional version pinning for all core deps
- Optional perf measurement profile for NFR validation

### Implementation Handoff

**AI Agent Guidelines:**

- Follow all architectural decisions exactly as documented
- Use implementation patterns consistently across all components
- Respect project structure and boundaries
- Treat this document as the single source of truth for architecture questions

**First Implementation Priority:**

- Initialize the monorepo using the recorded starter commands, then wire:
  - root `docker-compose.yml` (Postgres)
  - `packages/shared` exports (`MAX_TODO_TITLE_LENGTH`, `MAX_TODO_TEXT_LENGTH`, `Todo`, `ApiErrorResponse`)
  - API `x-request-id` plugin + error handler plugin

## Architecture Completion & Handoff

Architecture workflow is complete for `bmad-todo`. You now have:

- A fully specified TypeScript-first monorepo stack (web/api/shared)
- A stable API contract (success shapes + error shapes + `x-request-id` header)
- Consistency rules that prevent AI-agent divergence
- A concrete project tree mapping requirements to files

**Next steps (BMAD):**

- [CE] Create Epics and Stories — `bmad-create-epics-and-stories` (required next in solutioning)
- [IR] Check Implementation Readiness — `bmad-check-implementation-readiness` (ensures PRD/UX/Architecture/Epics align)
- [SP] Sprint Planning — `bmad-sprint-planning` (creates the executable implementation sequence)

Then the story cycle:

- [CS] Create Story — `bmad-create-story`
- [VS] Validate Story — `bmad-create-story:validate`
- [DS] Dev Story — `bmad-dev-story`
- [CR] Code Review — `bmad-code-review`

If you want a single “intent → code” loop instead:

- [QQ] Quick Dev — `bmad-quick-dev`
