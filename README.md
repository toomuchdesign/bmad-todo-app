# bmad-todo

Monorepo for a full-stack Todo app built with:

| Package           | Role                       | Tech                |
| ----------------- | -------------------------- | ------------------- |
| `packages/web`    | React SPA                  | Vite, TypeScript    |
| `packages/api`    | REST API                   | Fastify, TypeScript |
| `packages/shared` | Shared types and constants | TypeScript          |

## Prerequisites

- Node.js `>= 22.12` (see `.nvmrc`)
- npm (uses npm workspaces)
- Git (used by `simple-git-hooks`)
- A Docker runtime and `docker-compose`

macOS install hint:

```bash
brew install colima docker docker-compose
colima start
```

## Getting started

```bash
colima start                    # macOS only -- start the Docker runtime
npm install
cp .env.example .env            # create local env config
docker-compose up -d            # start Postgres
npm -w api run db:migrate:local # apply database migrations
npm run dev                     # start web + API in watch mode
```

The app is now running at http://localhost:5173.

## Docker

This project uses Docker in two distinct ways, served by two separate compose files.

### Compose files

| File                      | Purpose                   | What it starts             |
| ------------------------- | ------------------------- | -------------------------- |
| `docker-compose.yml`      | Local development         | Postgres only              |
| `docker-compose.prod.yml` | Production-like local run | Postgres, API, Web (Nginx) |

### Development workflow (`docker-compose.yml`)

During development, only Postgres runs in Docker. The API and web servers run natively via Node.js for fast iteration with hot-reload.

| Command                  | Effect                               |
| ------------------------ | ------------------------------------ |
| `docker-compose up -d`   | Start Postgres in the background     |
| `docker-compose down`    | Stop Postgres                        |
| `docker-compose down -v` | Stop Postgres and delete stored data |

Once Postgres is running, use `npm run dev` to start both the API and web dev servers.

### Production-like workflow (`docker-compose.prod.yml`)

This compose file builds and runs the full application stack using the production Dockerfiles. Use it to verify that containers build, migrations run, and the app works end-to-end before deploying.

| Command                                                   | Effect                                   |
| --------------------------------------------------------- | ---------------------------------------- |
| `docker-compose -f docker-compose.prod.yml up -d --build` | Build images and start the full stack    |
| `docker-compose -f docker-compose.prod.yml down`          | Stop all services                        |
| `docker-compose -f docker-compose.prod.yml down -v`       | Stop all services and delete stored data |

Once running, open http://localhost:8090 to use the app.

**Services started by `docker-compose.prod.yml`:**

| Service    | Image                                | Host port | Notes                                                          |
| ---------- | ------------------------------------ | --------- | -------------------------------------------------------------- |
| `postgres` | `postgres:16`                        | 5432      | Healthcheck ensures readiness before API starts                |
| `api`      | Built from `packages/api/Dockerfile` | 3001      | Runs DB migrations on startup, then starts Fastify             |
| `web`      | Built from `packages/web/Dockerfile` | 8090      | Nginx serves the SPA and proxies `/todos`, `/users` to the API |

**Important:** Both compose files bind to port 5432. Stop one before starting the other to avoid port conflicts.

### Dockerfiles

Both Dockerfiles use multi-stage builds with the monorepo root as the build context.

**API (`packages/api/Dockerfile`):**

1. **Builder stage** (node:22-alpine) -- installs all deps, compiles `shared` and `api` to JavaScript
2. **Runtime stage** (node:22-alpine) -- installs production deps only, copies compiled output and migration SQL files
3. **Entrypoint:** runs migrations then starts the server (`node dist/db/migrate.js && node dist/server.js`)

**Web (`packages/web/Dockerfile`):**

1. **Builder stage** (node:22-alpine) -- installs deps, builds `shared`, runs `vite build` to produce static assets
2. **Runtime stage** (nginx:alpine) -- serves the SPA, proxies API routes via an Nginx config template
3. **Entrypoint:** substitutes `API_PORT` into the Nginx config, then starts Nginx

### Deployment

The `docker-compose.prod.yml` file mirrors the intended deployment topology. It is meant for local verification -- in a real deployment, each service would be managed by your orchestrator (ECS, Kubernetes, etc.) with proper secrets, networking, and TLS.

```
  Browser
    |
  [web: Nginx]  -- serves static SPA assets
    |               proxies /todos, /users
  [api: Node]   -- Fastify REST API
    |               runs migrations on startup
  [postgres]    -- data persistence
```

**Deployment checklist:**

1. Build the Docker images (or push to a container registry)
2. Provide each service with its required environment variables (see table below)
3. Ensure Postgres is healthy before the API starts (use healthchecks or orchestrator readiness probes)
4. The API runs migrations automatically on every startup -- this is idempotent and safe for rolling deploys
5. TLS termination is expected to happen upstream (e.g. a load balancer or reverse proxy) -- it is not handled by the containers

**Required environment variables:**

| Variable       | Service  | Description                                           |
| -------------- | -------- | ----------------------------------------------------- |
| `DATABASE_URL` | api      | Postgres connection string                            |
| `API_PORT`     | api, web | Port the API listens on (default: 3001)               |
| `WEB_ORIGIN`   | api      | Allowed CORS origin (e.g. `https://todo.example.com`) |

## Development reference

### Dev servers

| Command           | Effect                                                   |
| ----------------- | -------------------------------------------------------- |
| `npm run dev`     | Start web + API concurrently (requires Postgres running) |
| `npm run dev:web` | Start only the web dev server                            |
| `npm run dev:api` | Start only the API dev server                            |

Default ports:

| Service | Dev port | Test port |
| ------- | -------- | --------- |
| Web     | 5173     | 5174      |
| API     | 3001     | 3002      |

Dev and test use separate ports so they can run simultaneously.

### Environment variables

All environment variables live in **root-level** `.env` files (no per-package env files):

| File        | Purpose                                    | Git status                         |
| ----------- | ------------------------------------------ | ---------------------------------- |
| `.env`      | Development settings                       | Ignored (copy from `.env.example`) |
| `.env.test` | Test settings (shared by all contributors) | Committed                          |

The API dev server and Vite auto-load `.env`. Vitest and Playwright auto-load `.env.test`.

### Tests

| Command            | Effect                                               |
| ------------------ | ---------------------------------------------------- |
| `npm run test:ci`  | Run all unit and integration tests (non-interactive) |
| `npm run test:e2e` | Run Playwright end-to-end tests                      |
| `npm run test`     | Run tests in watch mode                              |

### Type checking and linting

| Command                | Effect                                       |
| ---------------------- | -------------------------------------------- |
| `npm run type:check`   | TypeScript type checking across all packages |
| `npm run biome:check`  | Lint and format check                        |
| `npm run biome:fix`    | Auto-fix lint and format issues              |
| `npm run source:check` | Run both `biome:check` and `type:check`      |

### Database

This project uses [Drizzle ORM](https://orm.drizzle.team/) with Postgres. Schema changes are managed through migration files generated by `drizzle-kit`.

**Setting up from scratch:**

```bash
npm -w api run db:migrate:local    # dev DB (uses .env)
npm -w api run db:migrate:test     # test DB (uses .env.test)
```

**Making schema changes:**

1. Edit the schema in `packages/api/src/db/schema.ts`
2. Generate a migration: `npm -w api run db:generate`
3. Apply it: `npm -w api run db:migrate:local` and `npm -w api run db:migrate:test`
4. Commit the generated files in `packages/api/drizzle/`

**Database scripts** (run via `npm -w api run <script>` from the repo root):

| Script             | Purpose                                         |
| ------------------ | ----------------------------------------------- |
| `db:generate`      | Generate a migration from schema changes        |
| `db:migrate:local` | Apply migrations to dev DB (loads `.env`)       |
| `db:migrate:test`  | Apply migrations to test DB (loads `.env.test`) |
| `db:reset`         | Truncate all tables                             |
| `db:studio:local`  | Open Drizzle Studio for dev DB                  |
| `db:studio:test`   | Open Drizzle Studio for test DB                 |

### API contract (OpenAPI)

The API contract is generated from Fastify route schemas and committed as artifacts:

- `packages/api/openapi.json` -- OpenAPI spec
- `packages/web/src/api/generated/index.ts` -- TypeScript types generated from the spec

| Command                   | Effect                                            |
| ------------------------- | ------------------------------------------------- |
| `npm run build:openapi`   | Regenerate the OpenAPI spec from route schemas    |
| `npm run build:api-types` | Regenerate TypeScript types from the OpenAPI spec |

A `pre-commit` hook runs both automatically and stages any changes.

### Workspace commands

Run a script in a specific workspace:

```bash
npm -w web run <script>
npm -w api run <script>
npm -w shared run <script>
```
