# bmad-todo API (`packages/api`)

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

API expects `DATABASE_URL`, `API_PORT`, and `API_HOST` (see root `.env.example` for the required keys).

- All env files live at the **project root** (`.env`, `.env.test`, `.env.example`).
- The API server and DB scripts auto-load the root `.env` via `env-schema`.

## Tests (env vars)

- Vitest auto-loads the root `.env.test` (see `vitest.config.ts`).
- Put test-only values there (for example, point `DATABASE_URL` at a dedicated test database).
- Reuse shared API test helpers from `packages/api/test/test-utils/index.ts` in all API tests.

## Timestamp contract

- DB columns use Postgres `timestamptz` (`created_at`, `updated_at`, `deleted_at`).
- API JSON always exposes these fields as ISO RFC 3339 date-time strings in UTC.
  - Example: `2026-03-28T15:42:11.123Z`
- OpenAPI schemas mark these fields with `format: date-time`.

## API entity definitions

- Canonical API building-block definitions live in `packages/api/src/definitions`.
- Each definition exports:
  - JSON Schema source of truth (runtime/OpenAPI contract)
  - TypeScript type inferred via `json-schema-to-ts` (`FromSchema`)
- Reuse these definitions in routes, DB mapping boundaries, and API integration test setup helpers.

## Scripts

Run these from the repo root:

```bash
npm -w api run dev
npm -w api run test
npm -w api run test:ci
npm -w api run type:check
```

Contract artifacts:

```bash
npm -w api run build:openapi
```

DB tasks:

```bash
npm -w api run db:generate
npm -w api run db:migrate
npm -w api run db:reset
```
