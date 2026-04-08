# Sprint Change Proposal — 2026-04-08

## Issue Summary

With Epic 4 (Story 4.3) in review, the full MVP CRUD stack is functionally complete. However, the project has no containerized deployment configuration: no Dockerfiles, no production Compose file, no migration-on-startup mechanism. The app runs only via `npm run dev` and cannot currently be deployed anywhere.

Additionally, a body of deferred action points has accumulated across code reviews from Epics 1–4 — tracked in `deferred-work.md` — that should be resolved before first deployment rather than carried into production.

**Change type:** New requirement at natural project boundary — deployment readiness.
**Discovery context:** End of Epic 4 sprint; delivery window target per PRD is 2026-04-09 to 2026-04-16.

## Impact Analysis

### Epic Impact

| Epic | Status | Change required |
|------|--------|-----------------|
| Epic 1 (Load + Create) | done | None |
| Epic 2 (Manage Todos) | done | None |
| Epic 3 (Quality Bar) | done | None |
| Epic 4 (User Ownership) | in-progress (4.3 in review) | None |
| Epic 5 (Deployment) | — | **New epic to add** |

### Story Impact

No existing stories are modified. Epic 5 is purely additive.

### Artifact Conflicts

| Artifact | Impact | Severity |
|----------|--------|----------|
| PRD | NFR7 (TLS in deployed env) is already present. No new FRs required. Epic 5 fulfills the deployment readiness implied by the project delivery goal. | None |
| Architecture | **Needs a new "Deployment" section** covering Docker strategy, service topology, env vars per service, Nginx proxy pattern, and migration-on-startup approach | Moderate |
| Epics | Add Epic 5 with 3 stories | Additive only |
| UX Design | None | None |
| Sprint Status | Add epic-5 and its stories | Additive only |

### Technical Impact

- New files: `Dockerfile` at `packages/api/` and `packages/web/`, `nginx.conf` at `packages/web/`, `docker-compose.prod.yml` at project root
- The existing `docker-compose.yml` (dev Postgres only) remains unchanged
- No changes to application source code (the Nginx proxy pattern replicates the existing Vite dev proxy, requiring zero web app changes)
- Migrations: add a lightweight `packages/api/src/db/migrate.ts` entry point using drizzle-orm's programmatic `migrate()` function, compiled to `dist/`, and called by the API container entrypoint before the server starts

## Recommended Approach

**Direct Adjustment** — Add Epic 5 as three focused, sequenced stories. No rollback needed. No MVP scope change.

**Effort:** Low–Medium | **Risk:** Low | **Timeline impact:** Fits within the delivery window (2026-04-09 to 2026-04-16)

**Rationale:** The tech stack (Node/Fastify, Vite/Nginx, Postgres) has well-established Docker patterns. The Nginx reverse-proxy approach for the web container mirrors the existing Vite dev proxy exactly — no client code changes needed. Splitting into four stories (cleanup + 3 Docker stories) keeps each one independently deployable and reviewable.

## Detailed Change Proposals

### Epic 5: Deployment — Dockerize API and Web

**Goal:** Resolve tracked deferred action points, then package the API and web as production-ready Docker images with a Docker Compose configuration bringing up the full stack with zero local Node.js required.

---

#### Story 5.0: Pre-deployment cleanup — resolve deferred action points

Resolve all open items from `deferred-work.md` before first deployment:

| # | Item | Source |
|---|------|--------|
| 1 | Stale todo list visible alongside error banner when retry-after-success fails | Story 1.6 review |
| 2 | 404 on already-deleted todo causes infinite error loop — treat as success, remove locally | Story 2.5 review |
| 3 | `fetchTodos` retry with in-flight mutations leaves stale rollback refs — abort and clear on fresh fetch | Story 2.6 review |
| 4 | `PATCH /todos/:id` with `{}` silently bumps `updatedAt` — add `minProperties: 1` | Stories 3.0/3.1/4.2 reviews |
| 5 | `export default` in todosRoutes — refactor to named export | Story 3.0 review |
| 6 | CSS hardcoded spacing/sizing values in `TodoItem.module.css` — migrate to token references | Story 2.2 review |
| 7 | `focusTodoId` in App.tsx never cleared after effect fires — reset to `null` post-focus | Story 3.4 review |

Items explicitly accepted as-is (do NOT fix): error state collision between `createTodo`/`updateTodo`, pre-commit staged file mutation, concurrent multi-item edit mode, `validateUserPlugin` caching, 401 web client differentiation.

---

#### Story 5.1: Dockerize the API

As a maintainer,
I want the Fastify API to run as a Docker container,
So that it can be deployed without a local Node.js installation.

**Acceptance Criteria:**

**Given** a `packages/api/Dockerfile` exists
**When** I build the image from the monorepo root
**Then** the build succeeds via a multi-stage build (builder → runtime)
**And** the runtime image is based on `node:22-alpine` with only production dependencies
**And** the image runs `node dist/server.js` as its entrypoint

**Given** the container starts
**When** `DATABASE_URL`, `API_PORT`, and `WEB_ORIGIN` are provided as env vars
**Then** the API reads config from those env vars (no hardcoded values)

**Given** the migrations have not been applied
**When** the container starts
**Then** it runs `node dist/db/migrate.js` (programmatic drizzle `migrate()`) before starting the server
**And** the `drizzle/` folder with migration SQL files is included in the image

**Given** a `.dockerignore` at project root
**When** the Docker build context is sent
**Then** `node_modules/`, `*.test.ts`, `.debug/`, and other non-production files are excluded

**Technical notes:**
- Multi-stage: `builder` stage installs all deps + compiles; `runtime` stage copies `dist/`, `drizzle/`, and `node_modules` (pruned to prod-only via `npm ci --omit=dev`)
- The monorepo root is the build context (needed for `packages/shared` dependency)
- `packages/api/src/db/migrate.ts` — add a standalone script that calls drizzle-orm's `migrate(db, { migrationsFolder: './drizzle' })`
- New root script `build:docker:api` is optional convenience

---

#### Story 5.2: Dockerize the Web (Nginx SPA + API proxy)

As a maintainer,
I want the Vite SPA to be served via an Nginx container that also proxies API requests,
So that the web app works in production without any source code changes.

**Acceptance Criteria:**

**Given** a `packages/web/Dockerfile` exists
**When** I build the image from the monorepo root
**Then** the build succeeds via a multi-stage build (builder → nginx runtime)
**And** the runtime image is based on `nginx:alpine` serving the Vite `dist/` output

**Given** the Nginx container is running
**When** a request arrives at `/todos` or `/users`
**Then** Nginx proxies the request to the `api` service (configurable via `API_URL` env var or compose network alias)

**Given** the Nginx container is running
**When** a request arrives for any non-API path (including deep links like `/about`)
**Then** Nginx falls back to `index.html` (SPA routing)

**Given** a `packages/web/nginx.conf` exists
**When** I inspect its contents
**Then** it proxies `/todos` and `/users` to `http://api:${API_PORT}` and serves the SPA for all other routes

**Technical notes:**
- Nginx listens on port 80 inside the container (host port mapped in Compose)
- The `API_URL` for the proxy directive can be baked in via `envsubst` in the Nginx entrypoint, or hardcoded to use the Docker Compose service name `api` (simpler for MVP)
- No changes to `packages/web/src/` — relative paths (`/todos`, `/users`) already work with the proxy

---

#### Story 5.3: Docker Compose production orchestration

As a maintainer,
I want a single `docker-compose.prod.yml` that brings up the full stack,
So that I can run the deployed app locally or on a server with one command.

**Acceptance Criteria:**

**Given** `docker-compose.prod.yml` at the project root
**When** I run `docker compose -f docker-compose.prod.yml up`
**Then** three services start: `db` (Postgres 16), `api` (Fastify), `web` (Nginx)

**Given** the `db` service
**When** it starts
**Then** a named volume provides data persistence across container restarts

**Given** the `api` service
**When** it starts
**Then** it depends on `db` and waits for it to be healthy (health check on db service)
**And** it reads `DATABASE_URL`, `API_PORT`, and `WEB_ORIGIN` from an `.env.prod` file (git-ignored, documented in README)

**Given** the `web` service
**When** it starts
**Then** it depends on `api` being up and proxies API requests to it via the Docker Compose internal network

**Given** an `.env.prod.example` at project root
**When** I inspect it
**Then** it documents all required environment variables with placeholder values (no real secrets committed)

**Technical notes:**
- `.env.prod` is git-ignored; `.env.prod.example` is committed as documentation
- `docker-compose.yml` (existing dev Postgres setup) remains unchanged
- Add convenience root scripts: `docker:build` and `docker:up:prod` (optional)
- Update `README.md` with a "Deployment" section covering the `docker-compose.prod.yml` workflow and required env vars

## Implementation Handoff

**Scope: Minor** — Direct implementation by development team. No PM/Architect escalation needed.

| Role | Responsibility |
|------|----------------|
| Developer | Implement all 3 stories in sequence (5.1 → 5.2 → 5.3) |
| Maintainer | Verify full stack comes up clean with `docker compose -f docker-compose.prod.yml up` |

**Success criteria:**
- `docker compose -f docker-compose.prod.yml up` starts all three services cleanly
- Web app is accessible in browser and CRUD operations work end-to-end through Docker
- `docker compose down -v` + `docker compose up` applies migrations and restores a clean state
- No application source code changes required
- Existing tests continue to pass unchanged
