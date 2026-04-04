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
