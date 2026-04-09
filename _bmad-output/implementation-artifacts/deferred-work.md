# Deferred Work

## Deferred from: code review of 1-6-build-the-todo-list-screen-with-load-states-and-retry (2026-03-29)

- ~~No `AbortController` in `useTodos` — resolved in Story 2.6~~
- Stale todos remain visible alongside error banner if a retry fails after a prior successful load. **→ Not addressed in 3.0, still open**
- ~~Retry button not disabled during in-flight fetch — resolved in Story 2.1~~
- Dark mode error banner colors (`#fca5a5` on semi-transparent `rgba(153,27,27,0.15)`) may not meet WCAG contrast. **→ Fix in Story 3.4 (Accessibility)**

## Deferred from: code review of 2-1-implement-patch-todos-id-for-text-and-completion-updates (2026-03-30)

- Pre-commit `source:fix` may silently modify already-staged files, leaving unstaged changes after commit. Introduced by retro-driven hook update. Consider using `lint-staged` to scope fixes to staged files only. **→ Accepted, ignore for now**

## Deferred from: code review of story 2.2 (2026-03-30)

- CSS hardcoded spacing/sizing values in TodoItem.module.css — pre-existing pattern moved from TodoList.module.css. **→ Not addressed in 3.0, still open**
- ~~Concurrent PATCH calls for same todo ID not guarded at hook level — resolved in Story 2.6~~
- Concurrent multi-item edit mode — multiple todos can enter edit mode simultaneously; clicking a second triggers blur-save on the first. Architectural choice, not a bug. **→ Accepted, intentional**

## Deferred from: code review of story 2.3 (2026-03-30)

- ~~Concurrent mutation race conditions on same todo — resolved in Story 2.6~~
- ~~`pendingActions` string-keyed record — removed entirely in Story 2.6 refactor~~

## Deferred from: code review of story 2.5 (2026-03-31)

- 404 on already-deleted todo loops forever — if the same todo is deleted from another tab, this tab receives 404, shows a generic error, and the todo stays visible. **→ Not addressed in 3.0, still open**
- ~~`pendingAction` untyped magic string — removed entirely in Story 2.6 refactor~~

## Deferred from: code review of story 2.6 (2026-04-02)

- `fetchTodos` retry during in-flight updates leaves stale `pendingFields`/`snapshots`/`mutationControllers` refs. If user retries while mutations are in-flight, the fresh server data can conflict with stale rollback state. **→ Not addressed in 3.0, still open**
- `createTodo` and `updateTodo` both call `setError(null)` at entry, clearing each other's errors. A rapid sequence can hide a failed mutation's error before the user sees it. **→ Accepted, low impact for MVP**

## Deferred from: code review of story 3.0 (2026-04-04)

- PATCH with empty body bumps `updatedAt` — no `minProperties` constraint on PATCH schema, so `{}` passes and writes only `updatedAt`. Pre-existing pattern.
- No DB-level CHECK constraint on `title` — route schema is the only guard against empty strings. Pre-existing pattern.
- `export default` in todosRoutes — violates "named exports only" rule from project-context.md. Pre-existing.
- cancelEdit doesn't abort in-flight save — if user presses Escape during a slow save, `onUpdate` still completes server-side. Pre-existing concurrency pattern.
- Duplicate validation logic between AddTodoForm and TodoItem — identical trim+validate code. No shared validator. Pre-existing.
- Ctrl+Enter newline uses stale closure state — rapid typing + Ctrl+Enter could read stale `editText`. Low probability, pre-existing React pattern.
- handleBlur during in-flight save exits early silently — `savingRef` guard returns without retry. Benign, pre-existing.

## Deferred from: code review of story 3.1 (2026-04-04)

- PATCH with empty body `{}` silently bumps `updatedAt` — no test for this edge case. Pre-existing (also noted in Story 3.0 review).
- `mapTodoRowToApiTodo` conditionally includes `deletedAt` when present on a row — no test verifies Fastify response serialization strips it. Pre-existing mapper behavior.

## Deferred from: code review of story 3.3 (2026-04-04)

- Keyboard E2E tests assume specific Tab order (title → description → Add button). If any DOM element is inserted between them, tests break with confusing assertions. Pre-existing pattern risk, not introduced by this diff.
- E2E test suite has repeated action patterns (create todo, enter edit mode, intercept route with failure). Extract `createTodo(page, title, description?)` and `interceptWithFailure(page, method, urlPattern)` helpers into `e2e/test-utils/` when the suite grows or locators need updating in multiple places.

## Deferred from: code review of story 3-4 (2026-04-06)

- `focusTodoId` state in App.tsx is never cleared after focus is applied — stale value persists across re-renders. Could cause unexpected refocus if TodoList unmounts/remounts. Accepted as best-effort MVP a11y.
- `handleDelete` in App.tsx captures `todos` via closure before async `deleteTodo` — rapid sequential deletes can compute focus targets from a stale snapshot, pointing at a removed DOM element. Accepted as best-effort MVP a11y.
- `AddTodoForm.module.css` `.input:focus-visible` and `.textarea:focus-visible` use `box-shadow` with `--s-focus-ring` while other elements use `outline` with `--s-border-focus`. Visually acceptable, cosmetic inconsistency.

## Deferred from: code review of 4-3-enable-parallel-api-test-execution-with-per-user-isolation (2026-04-08)

- Pre-existing: `users.post.test.ts` seed test ("exists in the database after migration") lacks AAA structure. Not introduced by this story.
- `runUserScopingTests` "valid user" test assumes `injectInput` always carries valid `x-user-id` headers — intentional design, no code guard needed.
- `app.test.ts` has no `beforeEach` cleanup — acceptable because the file writes no DB state.
- `cleanupUserTodos` surfaces hook failures with no `userId` context — minor observability gap under parallel execution.
- `runUserScopingTests` "valid user" test conflates Arrange context into an Act-line comment — minor AAA style issue.

## Deferred from: code review of 5-1-dockerize-the-api (2026-04-08)

- `db:migrate` convenience npm script removed — the replacement scripts (`db:migrate:local`, `db:migrate:test`) both start Docker Compose, which may not be suitable for CI pipelines without Docker Compose access. Any CI step calling `npm run db:migrate` would break.
- No DB connection retry in migration script (`packages/api/src/db/migrate.ts`) — if the database container is not ready at container startup, migration fails immediately. Retry logic or orchestration healthchecks (e.g. `depends_on: condition: service_healthy`) should be added at the Docker Compose / Kubernetes level in Story 5.3.

## Deferred from: code review of 5-2-dockerize-the-web-nginx-spa-api-proxy (2026-04-08)

- `X-Forwarded-For` not forwarded in nginx proxy — API sees nginx container IP for all requests. Add `proxy_set_header X-Forwarded-For $remote_addr;` in location blocks when API adds IP-based logic.
- Host header injection via `proxy_set_header Host $host` — acceptable for internal proxy but could be hardened to `$proxy_host`.
- Missing `X-Forwarded-Proto` header in proxy config — add if API ever needs to distinguish HTTP/HTTPS origin.
- Nginx prefix `location /todos` and `location /users` capture any path starting with those strings — latent routing trap if future routes share the prefix.
- `apiHost`/`apiPort` undefined in `vite.config.ts` when `.env` absent → Vite proxy target `http://undefined:undefined` — pre-existing issue, only affects dev server not production build.
- No `EXPOSE 80` in `packages/web/Dockerfile` — add for self-documenting port declaration.
- No `CMD` in `packages/web/Dockerfile` — consider `CMD ["nginx", "-g", "daemon off;"]` passed as `$@` for operator flexibility.

## Deferred from: code review of 4-2-scope-todos-by-user-across-api-web-and-tests (2026-04-08)

- Migration backfill in `0003_odd_joystick.sql` assumes `DEFAULT_USER_ID` user row exists in `users` before the FK constraint is added — could fail in non-standard deployments without prior seeding. Acceptable for dev-only destructive migration.
- `validateUserPlugin` issues a DB lookup on every request (no caching) — N+1 DB round-trips under load. Future auth story should consider caching or session tokens.
- `PATCH /todos/:id` with empty body `{}` silently bumps `updatedAt` without changing data — no `minProperties` constraint. Pre-existing, also noted in Story 3.0/3.1 reviews.
- No 401-specific handling in web client — auth failure shows same generic "Couldn't load todos" message as a network error. Future auth story should differentiate error types.

## Deferred from: code review of 5-3-docker-compose-production-orchestration (2026-04-09)

- Healthcheck hardcodes `-U postgres` regardless of `POSTGRES_USER` override — if `POSTGRES_USER` is changed, the healthcheck may fail on strict Postgres `pg_hba.conf` configs, blocking `api` service start.
- `docker-compose` v1 CLI used in smoke test (`scripts/docker-smoke-test.ts`) vs `docker compose` v2 in npm scripts — modern Docker installations may only have v2; smoke test would fail with "command not found".
- Postgres port 5432 exposed on host in production compose — `"5432:5432"` binding exposes the database to the host network; API communicates over the internal Docker network and does not need this.
- `web` service depends on `api` with default `service_started` rather than `service_healthy` — Nginx may start proxying to the API before it finishes running migrations and accepting connections.
- `waitForReady` in smoke test accepts any HTTP status including 5xx — a misconfigured but responding container would pass the readiness check.
- `--env-file /dev/null` in smoke test is not portable to Windows — would fail on Windows CI runners.
