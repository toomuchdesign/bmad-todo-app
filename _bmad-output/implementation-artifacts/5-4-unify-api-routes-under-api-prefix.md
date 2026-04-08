# Story 5.4: Unify API routes under /api prefix

Status: backlog

## Story

As a maintainer,
I want all API routes served under a single `/api` prefix so that the Nginx proxy and Vite dev proxy use one catch-all rule instead of per-route entries,
making it trivial to add new API routes without touching proxy configuration.

## Acceptance Criteria

### AC1 — API serves all routes under /api prefix

**Given** the API is running
**When** I send a request to `/api/todos` or `/api/users`
**Then** the API responds correctly
**And** the old unprefixed routes (`/todos`, `/users`) no longer respond

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

- [ ] Task 1 — Add `/api` prefix to Fastify route registration (AC1)
  - [ ] Register `todosRoutes` and `usersRoutes` under a `/api` prefix in `packages/api/src/app.ts`
  - [ ] Update Swagger config `prefix` if applicable
  - [ ] Update API integration tests in `packages/api/test/` to use `/api/todos`, `/api/users` paths

- [ ] Task 2 — Update web client API paths (AC2)
  - [ ] Update `TODOS_API_PATH` and `TODO_BY_ID_API_PATH` in `packages/web/src/contracts.ts` to `/api/todos` and `/api/todos/{id}`
  - [ ] Regenerate or update OpenAPI types in `packages/web/src/api/generated/index.ts` if paths are used as type keys
  - [ ] Update all web component/unit test mocks from `/todos` to `/api/todos` (~30+ occurrences across `App.*.test.tsx` files)

- [ ] Task 3 — Simplify Nginx proxy config (AC3)
  - [ ] Replace per-route `/todos` and `/users` location blocks with a single `/api/` location in `packages/web/nginx.conf`
  - [ ] Use `rewrite ^/api(/.*)$ $1 break;` to strip the prefix before proxying

- [ ] Task 4 — Simplify Vite dev proxy (AC4)
  - [ ] Replace per-route `/todos` and `/users` proxy entries with a single `/api` entry in `packages/web/vite.config.ts`
  - [ ] Configure `rewrite` to strip `/api` prefix when proxying to the backend

- [ ] Task 5 — Update e2e tests (AC5)
  - [ ] Update Playwright route intercepts from `**/todos` to `**/api/todos` in `packages/web/e2e/todo-flows.spec.ts`

- [ ] Task 6 — Validate all tests pass (AC5)
  - [ ] Run `npm run type:check`
  - [ ] Run `npm run biome:check`
  - [ ] Run `npm run test:ci`
  - [ ] Run `npm run test:e2e`

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

### Vite proxy config after change

```ts
proxy: {
  "/api": {
    target: `http://${apiHost}:${apiPort}`,
    rewrite: (path) => path.replace(/^\/api/, ""),
  },
},
```

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

### Debug Log References

### Completion Notes List

### File List
