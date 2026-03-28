# bmad-todo API (`src/api`)

Fastify API workspace (TypeScript).

## Local prerequisites

- Node.js `>= 22.12` (see repo root `.nvmrc`)
- npm (npm workspaces)
- Docker runtime for local Postgres
  - macOS: we use Colima (Docker Desktop also works)
- `docker-compose` (or `docker compose`) to run local Postgres

macOS install hint (if you don't already have these):

```bash
brew install colima docker docker-compose
```

## Database (local dev)

From the repo root:

```bash
colima start # macOS only
docker-compose up -d
```

API expects `DATABASE_URL` (see `.env.example`).

- DB scripts (`db:*`) auto-load `src/api/.env` (copy from `.env.example`) so you don't need to export `DATABASE_URL`.
- The API dev server command does not auto-load a `.env` file; use your preferred env loader when running `dev`.

## Tests (env vars)

- Vitest auto-loads environment variables from `src/api/.env.test` (see `vitest.config.ts`).
- Put test-only values there (for example, point `DATABASE_URL` at a dedicated test database).
- Reuse shared API test helpers from `src/api/test/test-utils/index.ts` in all API tests.

## Timestamp contract

- DB columns use Postgres `timestamptz` (`created_at`, `updated_at`, `deleted_at`).
- API JSON always exposes these fields as ISO RFC 3339 date-time strings in UTC.
  - Example: `2026-03-28T15:42:11.123Z`
- OpenAPI schemas mark these fields with `format: date-time`.

## API entity definitions

- Canonical API building-block definitions live in `src/api/src/definitions`.
- Each definition exports:
  - JSON Schema source of truth (runtime/OpenAPI contract)
  - TypeScript type inferred via `json-schema-to-ts` (`FromSchema`)
- Reuse these definitions in routes, DB mapping boundaries, and API integration test setup helpers.

## Scripts

Run these from the repo root:

```bash
npm -w src/api run dev
npm -w src/api run test
npm -w src/api run test:ci
npm -w src/api run type:check
```

Contract artifacts:

```bash
npm -w src/api run build:openapi
```

DB tasks:

```bash
npm -w src/api run db:generate
npm -w src/api run db:migrate
npm -w src/api run db:reset
```
