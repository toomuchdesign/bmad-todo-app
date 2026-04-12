# Story 5.4: Unify API routes under /api prefix

Status: done

## Story

As a maintainer,
I want all API routes served under a single `/api` prefix so that the Nginx proxy and Vite dev proxy use one catch-all rule instead of per-route entries,
making it trivial to add new API routes without touching proxy configuration.

## Acceptance Criteria

### AC1 — All API routes reachable under /api prefix via proxy

**Given** the web stack is running (Nginx in production, Vite in dev)
**When** I send a request to `/api/todos` or `/api/users` through the proxy
**Then** the request is forwarded to the API and responds correctly
**Note** The API container itself continues to serve routes at `/todos` and `/users` — the `/api` prefix is enforced at the proxy layer (Nginx rewrite / Vite rewrite). The API port is not publicly exposed, so unprefixed access is not possible from outside the Docker network.

### AC2 — Web client uses /api-prefixed paths

**Given** the web app is running
**When** it fetches todos or users
**Then** all requests go to `/api/todos`, `/api/users`, `/api/todos/{id}` etc.

### AC3 — Nginx proxies /api/ to the API service

**Given** the Nginx container is running
**When** a request arrives at any `/api/` path
**Then** Nginx proxies the request to the `api` service with the `/api` prefix stripped
**And** no per-route proxy entries are needed

### AC4 — Vite dev proxy uses a single /api entry

**Given** the Vite dev server is running locally
**When** a request arrives at any `/api/` path
**Then** it is proxied to the API with the prefix rewritten
**And** the proxy config contains a single `/api` entry instead of per-route entries

### AC5 — All existing tests pass

**Given** all path changes are applied
**When** I run `test:ci` and `test:e2e`
**Then** all tests pass with no regressions

## Tasks / Subtasks

- [x] Task 1 — API remains untouched (AC1)
  - [x] API routes unchanged — `/todos` and `/users` served as before
  - [x] API integration tests unchanged — no path updates needed

- [x] Task 2 — Update web client API paths (AC2)
  - [x] Add `TODOS_SPEC_PATH` / `TODO_BY_ID_SPEC_PATH` for OpenAPI type extraction, separate from runtime paths
  - [x] Update `TODOS_API_PATH` and `TODO_BY_ID_API_PATH` in `packages/web/src/contracts.ts` to `/api/todos` and `/api/todos/{id}`
  - [x] Update `useTodos.ts` to use spec paths for types and runtime paths for fetch calls
  - [x] Update all web component/unit test mocks from `/todos` to `/api/todos` (~40+ occurrences across `App.*.test.tsx` files)

- [x] Task 3 — Simplify Nginx proxy config (AC3)
  - [x] Replace per-route `/todos` and `/users` location blocks with a single `/api/` location in `packages/web/nginx.conf`
  - [x] Use `rewrite ^/api(/.*)$ $1 break;` to strip the prefix before proxying to the API

- [x] Task 4 — Simplify Vite dev proxy (AC4)
  - [x] Replace per-route `/todos` and `/users` proxy entries with a single `/api` entry in `packages/web/vite.config.ts`
  - [x] Configure `rewrite` to strip `/api` prefix when proxying to the backend

- [x] Task 5 — Update e2e tests (AC5)
  - [x] Update Playwright route intercepts from `**/todos` to `**/api/todos` in `packages/web/e2e/todo-flows.spec.ts`

- [x] Task 6 — Validate all tests pass (AC5)
  - [x] Run `npm run type:check`
  - [x] Run `npm run biome:check`
  - [x] Run `npm run test:ci`
  - [x] Run `npm run test:e2e`

## Dev Notes

### Scope

This is a cross-cutting refactor that touches API routing, web client paths, proxy config (Nginx + Vite), and all test layers. The API itself continues to handle the same routes — the prefix is added at the registration level in Fastify.

### API prefix approach

Fastify supports route prefixing via `app.register(routes, { prefix: '/api' })`. This is the cleanest approach — individual route handlers keep their relative paths (`/todos`, `/users`) but are mounted under `/api`.

### Web path constants

All API paths in the web app flow through `contracts.ts` constants (`TODOS_API_PATH`, `TODO_BY_ID_API_PATH`). Updating these constants propagates to all runtime fetch calls. Test mocks, however, use hardcoded string paths and must be updated individually.

### Nginx config after change

```nginx
location /api/ {
    rewrite ^/api(/.*)$ $1 break;
    proxy_pass http://api:${API_PORT};
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
}
```

The rewrite strips the `/api` prefix before forwarding to the API, which continues to serve routes at `/todos` and `/users` unchanged.

### Vite proxy config after change

```ts
proxy: {
  "/api": {
    target: `http://${apiHost}:${apiPort}`,
    rewrite: (path) => path.replace(/^\/api/, ""),
  },
},
```

Same approach — prefix stripped by the proxy, not the API.

### Files affected (estimated)

- `packages/api/src/app.ts` — add prefix to route registration
- `packages/api/test/**/*.test.ts` — update API test paths
- `packages/web/src/contracts.ts` — update path constants
- `packages/web/src/api/generated/index.ts` — may need path key updates
- `packages/web/src/App.*.test.tsx` — update ~30+ mock paths
- `packages/web/src/utils/http-client.test.ts` — already uses `/api/` prefix (no change needed)
- `packages/web/nginx.conf` — simplify to single `/api/` location
- `packages/web/vite.config.ts` — simplify to single `/api` proxy entry
- `packages/web/e2e/todo-flows.spec.ts` — update route intercepts

### Testing Strategy

- API integration tests validate that `/api/todos` and `/api/users` respond correctly
- Web unit tests validate that the client sends requests to `/api/`-prefixed paths
- E2e tests validate the full flow end-to-end
- No new test files needed — existing tests are updated in place

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6 (1M context)

### Debug Log References

None — clean implementation, no debugging needed.

### Completion Notes List

- API left untouched — routes remain at `/todos` and `/users`, no API test changes
- Updated contracts.ts: added `TODOS_SPEC_PATH` / `TODO_BY_ID_SPEC_PATH` for OpenAPI type extraction, runtime paths now `/api/todos` and `/api/todos/{id}`
- Updated `useTodos.ts` to use spec paths for type positions and runtime paths for fetch calls
- Updated all web component/unit test mocks (~40+ occurrences across 6 App.*.test.tsx files)
- Simplified Nginx config: replaced 2 per-route location blocks with single `/api/` location + rewrite to strip prefix
- Simplified Vite proxy: replaced 2 per-route entries with single `/api` entry + rewrite to strip prefix
- Updated e2e Playwright route intercepts to `**/api/todos` patterns
- All validation gates pass: type:check, biome:check, test:ci (140 tests), test:e2e (26 tests)

### Change Log

- 2026-04-09: Implemented story 5.4 — unified all API routes under /api prefix

### File List

- `packages/web/src/contracts.ts` — added spec path constants, updated runtime API paths
- `packages/web/src/hooks/useTodos.ts` — use spec paths for types, runtime paths for fetches
- `packages/web/src/App.test.tsx` — updated mock paths
- `packages/web/src/App.create-todo.test.tsx` — updated mock paths
- `packages/web/src/App.delete-todo.test.tsx` — updated mock and express paths
- `packages/web/src/App.edit-todo.test.tsx` — updated mock and express paths
- `packages/web/src/App.toggle-todo.test.tsx` — updated mock and express paths
- `packages/web/src/App.mutation-concurrency.test.tsx` — updated mock and express paths
- `packages/web/nginx.conf` — simplified to single /api/ location block with rewrite
- `packages/web/vite.config.ts` — simplified to single /api proxy entry with rewrite
- `packages/web/e2e/todo-flows.spec.ts` — updated route intercept patterns

### Review Findings

- [x] [Review][Decision] AC1 — accepted proxy-level approach: AC1 updated to reflect that the `/api` prefix is enforced at the proxy layer; API routes unchanged, API port not publicly exposed.
- [x] [Review][Decision] OpenAPI spec paths — accepted: spec reflects API-internal paths (the trailing part after proxy strips `/api`); SPEC_PATH vs API_PATH split in contracts.ts is the intentional design.
- [x] [Review][Patch] Dev notes contradict actual implementation — story file says "No rewrite needed — the API handles the `/api` prefix at the Fastify registration level" but both `nginx.conf` and `vite.config.ts` use explicit rewrites to strip the prefix [`_bmad-output/implementation-artifacts/5-4-unify-api-routes-under-api-prefix.md` Dev Notes section]
- [x] [Review][Patch] Hardcoded `/api/todos/${id}` in useTodos.ts — PATCH mutation and DELETE call construct the path as a template literal instead of using `TODOS_API_PATH`. Future `API_PREFIX` changes would silently miss these two call sites. Additionally, `TODO_BY_ID_API_PATH` is exported but never used — dead code since dynamic ID paths must be constructed at call sites anyway. [`packages/web/src/hooks/useTodos.ts`]
- [x] [Review][Defer] OpenAPI/generated types manually kept in sync — `openapi.json` and `generated/index.ts` have no regeneration guard; sync relies on manual discipline — deferred, pre-existing
- [x] [Review][Defer] HTTP client has no base URL management — developer forgetting the `/api` prefix would work in dev (Vite rewrite) but fail in production (nginx only matches `/api/`); no lint/type guard exists — deferred, pre-existing
