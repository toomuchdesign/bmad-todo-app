# bmad-todo

Monorepo scaffold for a Todo app:

- `packages/web`: React SPA (Vite + TypeScript)
- `packages/api`: Fastify API (TypeScript)
- `packages/shared`: shared TypeScript-only exports used by both web and api

## Prerequisites

- Node.js `>= 22.12` (see `.nvmrc`)
- npm (uses npm workspaces)
- Git (used by `simple-git-hooks`)
- Docker runtime for local Postgres
  - macOS: we use Colima (Docker Desktop also works)
- `docker-compose` (or `docker compose`) to run local Postgres

macOS install hint (if you don't already have these):

```bash
brew install colima docker docker-compose
```

## Install

```bash
npm install
```

This creates a single root `package-lock.json` and installs all workspace dependencies.

## Develop

Start local Postgres (required for API DB tasks; will be required by the API at runtime once DB integration lands):

```bash
# macOS (Colima)
colima start

# from the repo root
docker-compose up -d
```

To stop and remove volumes:

```bash
docker-compose down -v
```

Run both workspaces together:

```bash
npm run dev
```

Or run these in separate terminals:

```bash
npm run dev:web
npm run dev:api
```

Defaults:

- Web: http://localhost:5173
- API: http://127.0.0.1:3001

Environment variables:

All environment variables live in **root-level** `.env` files (no per-package env files):

- `.env` — development settings (`DATABASE_URL` pointing to the dev database, `API_PORT`, `API_HOST`). Copy from `.env.example` and adjust as needed. Git-ignored.
- `.env.test` — test settings (`DATABASE_URL` pointing to the test database). Committed to the repo so CI and all contributors share the same test config.

The API dev server and DB scripts auto-load `.env`; Vitest and Playwright auto-load `.env.test`.

## Tests (recommended)

Run non-interactive tests across workspaces:

```bash
npm run test:ci
```

## Typecheck & formatting

```bash
npm run type:check
npm run biome:check
npm run biome:fix
npm run source:check
```

## API contract artifacts (OpenAPI → frontend types)

The committed contract artifacts are:

- `packages/api/openapi.json` — OpenAPI spec generated from Fastify route schemas
- `packages/web/packages/api/generated/index.ts` — TypeScript interfaces generated from the OpenAPI spec via `openapi-typescript`

Regenerate them with:

```bash
npm run build:openapi        # updates packages/api/openapi.json from route schemas
npm run build:api-types      # updates packages/web/packages/api/generated/index.ts from openapi.json
```

A `pre-commit` hook (via `simple-git-hooks`) runs both and stages updates.

## Useful workspace commands

Run a script in a specific workspace:

```bash
npm -w web run <script>
npm -w api run <script>
npm -w shared run <script>
```
