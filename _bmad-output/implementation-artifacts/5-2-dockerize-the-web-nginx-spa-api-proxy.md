# Story 5.2: Dockerize the Web (Nginx SPA + API proxy)

Status: done

## Story

As a maintainer,
I want the Vite SPA to be served via an Nginx container that also proxies API requests,
so that the web app works in production without any source code changes.

## Acceptance Criteria

### AC1 — Dockerfile exists and builds successfully

**Given** a `packages/web/Dockerfile` exists
**When** I build the image from the monorepo root
**Then** the build succeeds via a multi-stage build (builder → nginx runtime)
**And** the runtime image is based on `nginx:alpine` serving the Vite `dist/` output

### AC2 — Nginx proxies API routes

**Given** the Nginx container is running
**When** a request arrives at `/todos` or `/users`
**Then** Nginx proxies the request to the `api` service

### AC3 — SPA fallback routing

**Given** the Nginx container is running
**When** a request arrives for any non-API path (including SPA deep links)
**Then** Nginx falls back to `index.html` (SPA routing)

### AC4 — nginx.conf proxies to configurable API upstream

**Given** a `packages/web/nginx.conf` exists
**When** I inspect its contents
**Then** it proxies `/todos` and `/users` to `http://api:${API_PORT}` and serves the SPA for all other routes

## Tasks / Subtasks

- [x] Task 1 — Create `packages/web/nginx.conf` template (AC2, AC3, AC4)
  - [x] Nginx listens on port 80
  - [x] Proxy `/todos` and `/users` to `http://api:${API_PORT}` (note: `$API_PORT` is a shell variable resolved via `envsubst` at container startup)
  - [x] SPA fallback: `try_files $uri $uri/ /index.html`
  - [x] Serve static files from `/usr/share/nginx/html`

- [x] Task 2 — Create `packages/web/Dockerfile` (AC1, AC2, AC3, AC4)
  - [x] `builder` stage: Node 22 Alpine, install all monorepo deps, run `npm run build -w web`
  - [x] Copy workspace manifests (`package.json`, `package-lock.json`, `packages/web/package.json`, `packages/shared/package.json`) before `npm ci` (layer-cache friendly)
  - [x] Copy source files for shared and web packages, then run builds
  - [x] `runtime` stage: `nginx:alpine`, copy built `dist/` from builder to `/usr/share/nginx/html`
  - [x] Copy `nginx.conf` into image as a template for `envsubst`
  - [x] Add an entrypoint that runs `envsubst` on `nginx.conf` to resolve `$API_PORT`, then starts Nginx

- [x] Task 3 — Update `vite.config.ts` to also proxy `/users` (consistency with Nginx) 
  - [x] Add `/users` proxy entry alongside `/todos` in `packages/web/vite.config.ts`

## Dev Notes

### Task 1 — nginx.conf

Create `packages/web/nginx.conf`. This file is a template — `$API_PORT` is replaced at container start via `envsubst`:

```nginx
server {
    listen 80;

    root /usr/share/nginx/html;
    index index.html;

    # Proxy API routes to the API service
    location /todos {
        proxy_pass http://api:${API_PORT};
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    location /users {
        proxy_pass http://api:${API_PORT};
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    # SPA fallback — all other paths serve index.html
    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

**Important:** In Nginx config, `$host`, `$remote_addr`, and `$uri` are Nginx variables, NOT shell variables. `envsubst` would replace them too unless you restrict substitution to `$API_PORT` only. Use the selective `envsubst` form: `envsubst '$API_PORT'` (only substitutes `$API_PORT`, leaves Nginx variables intact).

### Task 2 — Dockerfile

Build context is the **monorepo root** (needed for `packages/shared` workspace dependency, same as API Dockerfile).

The web build (`npm run build -w web`) runs Vite, which calls `loadEnvFile` on the root `.env`. In the Docker build context, there is no `.env` file (it is git-ignored and excluded by `.dockerignore`). The build will fail if `WEB_PORT` / `API_PORT` / `API_HOST` are required at build time.

**Solution:** Pass them as `ARG` build arguments (they set the Vite config at build time, i.e. the dev server port — but the production build does not embed these). Check `vite.config.ts`: it only uses `WEB_PORT`, `API_HOST`, `API_PORT` for the **dev server** config (not embedded in the built assets). So the Vite production build should succeed even if those env vars are absent.

However, `vite.config.ts` calls `loadEnvFile(resolve(import.meta.dirname, "../../.env"))` — if the file doesn't exist, this throws. Wrap with a try-catch or check existence before loading. **The cleanest fix is to make `loadEnvFile` conditional on file existence**, or use `dotenv`'s `{ silent: true }` approach. Since the task says "No changes to `packages/web/src/`", we can fix `vite.config.ts` (it is not in `src/`).

**Recommended fix for `vite.config.ts`:** Make the `.env` load conditional on file existence:
```ts
import { existsSync } from "node:fs";
// ...
const envPath = resolve(import.meta.dirname, "../../.env");
if (!process.env.WEB_PORT && existsSync(envPath)) {
  loadEnvFile(envPath);
}
```

This allows Docker build to succeed without a `.env` file, while preserving local dev behavior.

The runtime image does not need Node.js — only `nginx:alpine`. The `dist/` output is pure static HTML/CSS/JS:

```dockerfile
# ---- builder ----
FROM node:22-alpine AS builder
WORKDIR /app

# Copy workspace manifests for layer-cache-friendly install
COPY package.json package-lock.json ./
COPY packages/shared/package.json ./packages/shared/
COPY packages/web/package.json ./packages/web/

RUN npm ci

# Copy source
COPY packages/shared/ ./packages/shared/
COPY packages/web/ ./packages/web/

# Build shared (web imports from it via workspace resolution)
RUN npm run build -w shared

# Build the Vite SPA
RUN npm run build -w web

# ---- runtime ----
FROM nginx:alpine AS runtime

# Copy built SPA assets
COPY --from=builder /app/packages/web/dist /usr/share/nginx/html

# Copy Nginx config template
COPY packages/web/nginx.conf /etc/nginx/templates/default.conf.template

# Nginx official image automatically runs envsubst on *.template files in
# /etc/nginx/templates/ — no custom entrypoint needed
```

**Key insight:** The official `nginx:alpine` image ships with a `/docker-entrypoint.sh` that automatically processes all files in `/etc/nginx/templates/` using `envsubst` and outputs them to `/etc/nginx/conf.d/` before starting Nginx. You can use this built-in mechanism instead of a custom entrypoint script.

- Place the template at `/etc/nginx/templates/default.conf.template`
- At startup, Nginx entrypoint runs `envsubst` and writes `/etc/nginx/conf.d/default.conf`
- The default Nginx config includes `/etc/nginx/conf.d/*.conf`, so the generated file is picked up automatically

However, the default `envsubst` replaces ALL `$VAR` patterns, which would break Nginx variables like `$host`, `$uri`, `$remote_addr`. The official image passes `NGINX_ENVSUBST_TEMPLATE_SUFFIXES` and `NGINX_ENVSUBST_OUTPUT_DIR` env vars, but for selective substitution you need to set `NGINX_ENVSUBST_OUTPUT_DIR` OR write a custom entrypoint that calls `envsubst '$API_PORT'` explicitly.

**Recommended: use a custom entrypoint script** (`packages/web/docker-entrypoint.sh`) to keep it explicit:

```sh
#!/bin/sh
set -e
# Substitute only $API_PORT in the nginx template; leave Nginx variables intact
envsubst '$API_PORT' < /etc/nginx/conf.d/nginx.conf.template > /etc/nginx/conf.d/default.conf
exec nginx -g 'daemon off;'
```

And in the Dockerfile runtime stage:
```dockerfile
FROM nginx:alpine AS runtime

COPY --from=builder /app/packages/web/dist /usr/share/nginx/html

# Template and entrypoint
COPY packages/web/nginx.conf /etc/nginx/conf.d/nginx.conf.template
COPY packages/web/docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh

ENTRYPOINT ["/docker-entrypoint.sh"]
```

### Task 3 — vite.config.ts proxy consistency

The current `vite.config.ts` only proxies `/todos` but not `/users`. The Nginx config proxies both. Add `/users` to the dev proxy to keep local dev and production consistent:

```ts
proxy: {
  "/todos": `http://${apiHost}:${apiPort}`,
  "/users": `http://${apiHost}:${apiPort}`,
},
```

Also apply the `.env` existence check fix described in Task 2.

### Testing Strategy

- **No unit/component tests** for Dockerfile, `nginx.conf`, or the entrypoint script — these are infrastructure artifacts verified by building the image.
- **`vite.config.ts` change** (adding `/users` proxy): no test needed, this is a dev server config change.
- Run `npm run test:ci` before marking done to confirm no regressions from `vite.config.ts` edits.
- Smoke-test the built image locally (optional but recommended): `docker build -f packages/web/Dockerfile -t bmad-web .` from the monorepo root, then `docker run -e API_PORT=3001 -p 8080:80 bmad-web` and verify it serves `index.html` at `localhost:8080`.

### Project Structure Notes

- **New files:**
  - `packages/web/Dockerfile`
  - `packages/web/nginx.conf`
  - `packages/web/docker-entrypoint.sh`
- **Modified files:**
  - `packages/web/vite.config.ts` — add `/users` proxy + guard `.env` load with `existsSync`
- **`.dockerignore`** is already at the project root from story 5.1 — no changes needed
- **No changes to `packages/web/src/`** — relative paths (`/todos`, `/users`) in API calls already align with the Nginx proxy config
- The architecture file documents the Docker topology — no update needed, this story implements what is already specified there

### References

- Epic 5 story 5.2 spec: [\_bmad-output/planning-artifacts/epics.md](_bmad-output/planning-artifacts/epics.md)
- Architecture — Docker Deployment section: [\_bmad-output/planning-artifacts/architecture.md](_bmad-output/planning-artifacts/architecture.md)
- Previous story (5.1) Dockerfile pattern: [packages/api/Dockerfile](packages/api/Dockerfile)
- Previous story file (learnings): [\_bmad-output/implementation-artifacts/5-1-dockerize-the-api.md](_bmad-output/implementation-artifacts/5-1-dockerize-the-api.md)
- Web vite config to modify: [packages/web/vite.config.ts](packages/web/vite.config.ts)
- Root `.dockerignore` (already exists): [.dockerignore](.dockerignore)

## Dev Agent Record

### Agent Model Used

claude-opus-4-6[1m]

### Debug Log References

### Completion Notes List

- Task 1: Created `packages/web/nginx.conf` — Nginx template with port 80 listener, `/todos` and `/users` proxy to `http://api:${API_PORT}`, and SPA fallback via `try_files`
- Task 2: Created `packages/web/Dockerfile` — multi-stage build (node:22-alpine builder → nginx:alpine runtime). Created `packages/web/docker-entrypoint.sh` — selective `envsubst '$API_PORT'` to preserve Nginx variables (`$host`, `$uri`, `$remote_addr`)
- Task 3: Updated `packages/web/vite.config.ts` — added `/users` proxy for dev consistency with Nginx config, guarded `.env` load with `existsSync` so Docker builds succeed without `.env` file
- All validations pass: type:check, biome:check, test:ci (140 tests), test:e2e (26 tests)

### Review Findings

- [x] [Review][Patch] `API_PORT` unset at container start → `envsubst` writes empty string → `proxy_pass http://api:;` nginx syntax error; container crashes with no actionable error message [packages/web/docker-entrypoint.sh]
- [x] [Review][Defer] `X-Forwarded-For` not set in proxy headers — API sees nginx container IP instead of real client IP [packages/web/nginx.conf] — deferred, pre-existing infra pattern
- [x] [Review][Defer] Host header injection via `proxy_set_header Host $host` — internal proxy forwards client-supplied Host value [packages/web/nginx.conf] — deferred, acceptable for internal service proxy
- [x] [Review][Defer] Missing `X-Forwarded-Proto` header — API cannot distinguish HTTP from HTTPS origin [packages/web/nginx.conf] — deferred, API does not currently use it
- [x] [Review][Defer] Nginx prefix `location /todos` and `location /users` capture any path starting with those strings (e.g. `/todosExtra`) [packages/web/nginx.conf] — deferred, no conflicting routes currently exist
- [x] [Review][Defer] `apiHost`/`apiPort` undefined when `.env` absent → Vite proxy target becomes `http://undefined:undefined` [packages/web/vite.config.ts] — deferred, pre-existing; only affects dev server, not production build
- [x] [Review][Defer] No `EXPOSE 80` instruction in web Dockerfile — missing self-documenting port declaration [packages/web/Dockerfile] — deferred, cosmetic omission
- [x] [Review][Defer] No `CMD` in web Dockerfile — extra `docker run` args silently ignored by hardcoded entrypoint [packages/web/Dockerfile] — deferred, low operational impact

### Change Log

- 2026-04-08: Implemented story 5.2 — Dockerized web with Nginx SPA + API proxy (3 tasks)
- 2026-04-08: Code review completed — 1 patch finding, 7 deferred

### File List

- `packages/web/nginx.conf` (new)
- `packages/web/Dockerfile` (new)
- `packages/web/docker-entrypoint.sh` (new)
- `packages/web/vite.config.ts` (modified)
