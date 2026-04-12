# Story 5.3: Docker Compose production orchestration

Status: done

## Story

As a maintainer,
I want a single `docker-compose.prod.yml` that brings up the full stack,
so that I can run the deployed app locally or on a server with one command.

## Pre-existing State

Most of story 5.3 was implemented ahead of schedule during stories 5.1 and 5.2 as a practical necessity for smoke-testing the Docker images. The following already exists and is working:

- `docker-compose.prod.yml` — three services (`postgres`, `api`, `web`) with named volume, health check, and correct dependency chain
- `scripts/docker-smoke-test.ts` — Node test runner suite validating both compose files
- `npm run docker:smoke` script in root `package.json`
- README `Docker` section — full documentation of both compose workflows, Dockerfiles, deployment checklist, and env var table

**What remains (the scope of this story):**

1. Create `.env.prod.example` — committed documentation file listing all required env vars with placeholder values
2. Add `.env.prod` to `.gitignore` — prevent accidental secret commits
3. Replace hardcoded env values in `docker-compose.prod.yml` with `${VAR:-default}` syntax for production overridability
4. Add convenience scripts `docker:build` and `docker:up` to root `package.json`
5. Use `postgres:16-alpine` instead of `postgres:16` in `docker-compose.prod.yml` (architecture spec says Alpine)

## Acceptance Criteria

### AC1 — docker-compose.prod.yml uses variable substitution with safe defaults

**Given** `docker-compose.prod.yml` at the project root
**When** I inspect the service configurations
**Then** all services use `environment` blocks with `${VAR:-default}` syntax
**And** defaults match the local dev values (postgres/postgres, port 3001, etc.)
**And** production values can be overridden via shell env vars or `--env-file .env.prod`

### AC2 — .env.prod.example documents all required variables

**Given** `.env.prod.example` at the project root
**When** I inspect it
**Then** it documents every required env var with a placeholder value and a comment explaining its purpose
**And** no real secrets are present

### AC3 — .env.prod is git-ignored

**Given** `.gitignore` at the project root
**When** I inspect it
**Then** `.env.prod` is listed as an ignored pattern

### AC4 — Convenience scripts exist

**Given** root `package.json`
**When** I inspect `scripts`
**Then** `docker:build` runs `docker compose -f docker-compose.prod.yml build`
**And** `docker:up` runs `docker compose -f docker-compose.prod.yml up -d --build`

### AC5 — postgres:16-alpine image used

**Given** `docker-compose.prod.yml`
**When** I inspect the `postgres` service image
**Then** it uses `postgres:16-alpine` (per architecture spec)

### AC6 — Smoke tests still pass

**Given** all changes are applied
**When** I run `npm run docker:smoke`
**Then** all smoke tests pass

## Tasks / Subtasks

- [x] Task 1 — Create `.env.prod.example` (AC2)
  - [x] List all required env vars: `DATABASE_URL`, `API_PORT`, `API_HOST`, `WEB_ORIGIN`
  - [x] Include `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB` for the `db` service
  - [x] Add a comment header explaining the file's purpose
  - [x] Use safe placeholder values (not real credentials)

- [x] Task 2 — Add `.env.prod` to `.gitignore` (AC3)
  - [x] Append `.env.prod` to `.gitignore` if not already present (note: `.dockerignore` already excludes it)

- [x] Task 3 — Update `docker-compose.prod.yml` with variable substitution and Alpine (AC1, AC5)
  - [x] Replace hardcoded `environment` values with `${VAR:-default}` syntax across all services
  - [x] Change Postgres image from `postgres:16` to `postgres:16-alpine`
  - [x] Add `API_HOST` to the `api` environment (currently missing, Dockerfile sets it but compose should be explicit)
  - [x] Keep port mappings as static values (no variable interpolation in ports)

- [x] Task 4 — Add convenience scripts to root `package.json` (AC4)
  - [x] Add `"docker:build": "docker compose -f docker-compose.prod.yml build"`
  - [x] Add `"docker:up": "docker compose -f docker-compose.prod.yml up -d --build"`

- [x] Task 5 — Update README if needed (AC1, AC2, AC4)
  - [x] Add `.env.prod.example` → `.env.prod` setup step to the production workflow section
  - [x] Add `docker:build` and `docker:up` to the commands table
  - [x] Update any references if the compose config shape changes

- [x] Task 6 — Validate (AC6)
  - [x] Create a local `.env.prod` from `.env.prod.example` with working values
  - [x] Run `npm run docker:smoke` and verify all tests pass
  - [x] Run `npm run type:check`, `npm run biome:check`, `npm run test:ci`

## Dev Notes

### Task 1 — .env.prod.example

Create at project root. This file is committed to git as documentation:

```env
# Production environment variables for docker-compose.prod.yml
# Copy this file to .env.prod and fill in real values:
#   cp .env.prod.example .env.prod

# -- Postgres --
POSTGRES_USER=postgres
POSTGRES_PASSWORD=change-me
POSTGRES_DB=bmad_todo

# -- API --
API_PORT=3001
API_HOST=0.0.0.0
DATABASE_URL=postgresql://postgres:change-me@postgres:5432/bmad_todo
WEB_ORIGIN=http://localhost:8090

# -- Web (Nginx) --
# API_PORT is also read by the web container for envsubst in nginx.conf
```

Note: `DATABASE_URL` uses `postgres` as the hostname — this is the Docker Compose service name, resolved by Docker's internal DNS. The password in `DATABASE_URL` must match `POSTGRES_PASSWORD`.

### Task 2 — .gitignore update

Add to the existing `.gitignore`:

```
.env.prod
```

### Task 3 — docker-compose.prod.yml changes

Use `environment` blocks with `${VAR:-default}` fallbacks so the compose file works out of the box for local smoke testing (using defaults) while `.env.prod` can override values for production via `--env-file .env.prod` or by sourcing it into the shell.

**Do NOT use the `env_file` directive** — Docker Compose fails if the referenced file is missing, which would break the smoke tests and zero-setup local dev experience. Instead, keep `environment` blocks with sensible defaults. The `.env.prod.example` documents what to override.

Target `docker-compose.prod.yml`:

```yaml
services:
  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: ${POSTGRES_USER:-postgres}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD:-postgres}
      POSTGRES_DB: ${POSTGRES_DB:-bmad_todo}
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 2s
      timeout: 5s
      retries: 10

  api:
    build:
      context: .
      dockerfile: packages/api/Dockerfile
    environment:
      API_PORT: ${API_PORT:-3001}
      API_HOST: ${API_HOST:-0.0.0.0}
      DATABASE_URL: ${DATABASE_URL:-postgresql://postgres:postgres@postgres:5432/bmad_todo}
      WEB_ORIGIN: ${WEB_ORIGIN:-http://localhost:8090}
    ports:
      - "3001:3001"
    depends_on:
      postgres:
        condition: service_healthy

  web:
    build:
      context: .
      dockerfile: packages/web/Dockerfile
    environment:
      API_PORT: ${API_PORT:-3001}
    ports:
      - "8090:80"
    depends_on:
      - api

volumes:
  postgres_data:
```

Port mappings are static (`"3001:3001"` and `"8090:80"`) — no need for variable interpolation in ports since they rarely change and keeping them static avoids the dual-interpolation complexity (compose-file interpolation vs container env).

### Task 4 — Convenience scripts

Add to root `package.json` scripts (alongside existing `docker:smoke`):

```json
"docker:build": "docker compose -f docker-compose.prod.yml build",
"docker:up": "docker compose -f docker-compose.prod.yml up -d --build"
```

### Task 5 — README updates

The README already documents the production workflow extensively. Add:
1. A note about creating `.env.prod` from `.env.prod.example` in the production workflow section
2. The `docker:build` and `docker:up` convenience commands in the commands table

### Smoke test compatibility

The existing smoke test (`scripts/docker-smoke-test.ts`) expects: web on `http://localhost:8090`, API on `http://localhost:3001`, Postgres on port 5432. It calls `compose("up -d --build")` with no env file flags.

Because the compose file uses `${VAR:-default}` fallbacks, the smoke test continues to work without any `.env.prod` file — the defaults match exactly what the smoke test expects. No changes to the smoke test are needed.

### Testing Strategy

- No unit/component tests — this is infrastructure configuration
- Run `npm run docker:smoke` to validate the compose file works
- Run `npm run test:ci` to confirm no regressions from package.json script additions
- Manual verification: `docker compose -f docker-compose.prod.yml up -d --build`, visit `http://localhost:8090`

### Project Structure Notes

- **New files:** `.env.prod.example` (committed)
- **Modified files:** `docker-compose.prod.yml`, `.gitignore`, `package.json` (root), `README.md`
- No changes to any source code in `packages/`
- No changes to Dockerfiles, nginx.conf, or docker-entrypoint.sh

### References

- Epic 5 story 5.3 spec: [\_bmad-output/planning-artifacts/epics.md](_bmad-output/planning-artifacts/epics.md)
- Architecture — Docker Deployment section: [\_bmad-output/planning-artifacts/architecture.md](_bmad-output/planning-artifacts/architecture.md)
- Current compose file: [docker-compose.prod.yml](docker-compose.prod.yml)
- Dev compose file (reference): [docker-compose.yml](docker-compose.yml)
- Smoke test suite: [scripts/docker-smoke-test.ts](scripts/docker-smoke-test.ts)
- Previous story (5.2) learnings: [\_bmad-output/implementation-artifacts/5-2-dockerize-the-web-nginx-spa-api-proxy.md](_bmad-output/implementation-artifacts/5-2-dockerize-the-web-nginx-spa-api-proxy.md)
- Root package.json: [package.json](package.json)
- README deployment docs: [README.md](README.md)
- .dockerignore: [.dockerignore](.dockerignore)
- .gitignore: [.gitignore](.gitignore)

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6 (1M context)

### Debug Log References

- Docker smoke test initially failed because Docker Compose auto-loads the root `.env` file, whose dev values (`DATABASE_URL=...@127.0.0.1:...`, `API_HOST=127.0.0.1`) overrode the `${VAR:-default}` fallbacks. Fixed by adding `--env-file /dev/null` to the smoke test's compose helper.

### Completion Notes List

- Created `.env.prod.example` with all required env vars and safe placeholders
- Added `!.env.prod.example` to `.gitignore` allowlist (`.env.prod` is already ignored by the `.*` pattern)
- Updated `docker-compose.prod.yml`: variable substitution with defaults, `postgres:16-alpine`, added `API_HOST`
- Added `docker:build` and `docker:up` convenience scripts to root `package.json`
- Updated README: production workflow section (env file setup, convenience commands), services table (Alpine image), env vars table (full list), env files table (`.env.prod` entries)
- Fixed smoke test to use `--env-file /dev/null` to prevent dev `.env` from interfering with prod compose defaults

### Change Log

- 2026-04-09: Implemented story 5.3 — Docker Compose production orchestration with variable substitution, Alpine image, convenience scripts, and documentation updates

### Review Findings

- [x] [Review][Decision] `docker:up` and `docker:build` missing `--env-file /dev/null` — Running these scripts from a dev workspace auto-loads the root `.env`, overriding `${VAR:-default}` fallbacks with dev values (e.g., `DATABASE_URL` pointing to `127.0.0.1`). The smoke test already uses `--env-file /dev/null` for this reason. Options: (a) add `--env-file /dev/null` to both scripts, (b) add README warning, (c) accept as-is and rely on users supplying `--env-file .env.prod` explicitly.
- [x] [Review][Patch] `.env.prod.example` lacks explicit note that `DATABASE_URL` password must stay in sync with `POSTGRES_PASSWORD` [`.env.prod.example`]
- [x] [Review][Defer] Healthcheck hardcodes `-U postgres` regardless of `POSTGRES_USER` override [`docker-compose.prod.yml`] — deferred, pre-existing
- [x] [Review][Defer] `docker-compose` v1 CLI used in smoke test vs `docker compose` v2 in npm scripts [`scripts/docker-smoke-test.ts`] — deferred, pre-existing
- [x] [Review][Defer] Postgres port 5432 exposed on host in production compose [`docker-compose.prod.yml`] — deferred, pre-existing
- [x] [Review][Defer] `web` depends on `api` with default `service_started`, not `service_healthy` [`docker-compose.prod.yml`] — deferred, pre-existing
- [x] [Review][Defer] `waitForReady` accepts any HTTP status including 5xx [`scripts/docker-smoke-test.ts`] — deferred, pre-existing
- [x] [Review][Defer] `--env-file /dev/null` not portable to Windows [`scripts/docker-smoke-test.ts`] — deferred, pre-existing

### File List

- `.env.prod.example` (new) — production env var documentation
- `.gitignore` (modified) — added `!.env.prod.example` allowlist entry
- `docker-compose.prod.yml` (modified) — variable substitution, Alpine image, API_HOST
- `package.json` (modified) — added `docker:build` and `docker:up` scripts
- `README.md` (modified) — updated production workflow docs, env var tables
- `scripts/docker-smoke-test.ts` (modified) — added `--env-file /dev/null` to prevent dev env interference
- `_bmad-output/implementation-artifacts/sprint-status.yaml` (modified) — status updates
- `_bmad-output/implementation-artifacts/5-3-docker-compose-production-orchestration.md` (modified) — task completion, dev record
