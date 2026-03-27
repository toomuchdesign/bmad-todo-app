# bmad-todo

Monorepo scaffold for a Todo app:

- `src/web`: React SPA (Vite + TypeScript)
- `src/api`: Fastify API (TypeScript)
- `src/shared`: shared TypeScript-only exports used by both web and api

## Prerequisites

- Node.js `>= 22.12` (see `.nvmrc`)
- npm (uses npm workspaces)

## Install

```bash
npm install
```

This creates a single root `package-lock.json` and installs all workspace dependencies.

## Develop

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

- `src/api/openapi.json`
- `src/web/src/api/generated/`

Regenerate them with:

```bash
npm run build:openapi
npm run build:api-types
```

A `pre-commit` hook (via `simple-git-hooks`) runs both and stages updates.

## Useful workspace commands

Run a script in a specific workspace:

```bash
npm -w src/web run <script>
npm -w src/api run <script>
npm -w src/shared run <script>
```
