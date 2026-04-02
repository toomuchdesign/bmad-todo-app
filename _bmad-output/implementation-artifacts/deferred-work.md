# Deferred Work

## Deferred from: code review of 1-6-build-the-todo-list-screen-with-load-states-and-retry (2026-03-29)

- ~~No `AbortController` in `useTodos` — resolved in Story 2.6~~
- Stale todos remain visible alongside error banner if a retry fails after a prior successful load. Latent until mutations/refetch are added. **→ Fix in Epic 3 prep story (3.0)**
- ~~Retry button not disabled during in-flight fetch — resolved in Story 2.1~~
- Dark mode error banner colors (`#fca5a5` on semi-transparent `rgba(153,27,27,0.15)`) may not meet WCAG contrast. **→ Fix in Story 3.4 (Accessibility)**

## Deferred from: code review of 2-1-implement-patch-todos-id-for-text-and-completion-updates (2026-03-30)

- Pre-commit `source:fix` may silently modify already-staged files, leaving unstaged changes after commit. Introduced by retro-driven hook update. Consider using `lint-staged` to scope fixes to staged files only. **→ Accepted, ignore for now**

## Deferred from: code review of story 2.2 (2026-03-30)

- CSS hardcoded spacing/sizing values in TodoItem.module.css — pre-existing pattern moved from TodoList.module.css. **→ Fix in Epic 3 prep story (3.0) — abstract spacing/font-size/border-radius into tokens**
- ~~Concurrent PATCH calls for same todo ID not guarded at hook level — resolved in Story 2.6~~
- Concurrent multi-item edit mode — multiple todos can enter edit mode simultaneously; clicking a second triggers blur-save on the first. Architectural choice, not a bug. **→ Accepted, intentional**

## Deferred from: code review of story 2.3 (2026-03-30)

- ~~Concurrent mutation race conditions on same todo — resolved in Story 2.6~~
- ~~`pendingActions` string-keyed record — removed entirely in Story 2.6 refactor~~

## Deferred from: code review of story 2.5 (2026-03-31)

- 404 on already-deleted todo loops forever — if the same todo is deleted from another tab, this tab receives 404, shows a generic error, and the todo stays visible. **→ Fix in Epic 3 prep story (3.0) — treat 404 as success**
- ~~`pendingAction` untyped magic string — removed entirely in Story 2.6 refactor~~

## Deferred from: code review of story 2.6 (2026-04-02)

- `fetchTodos` retry during in-flight updates leaves stale `pendingFields`/`snapshots`/`mutationControllers` refs. If user retries while mutations are in-flight, the fresh server data can conflict with stale rollback state. **→ Fix in Epic 3 prep story (3.0) — clear mutation refs on re-fetch success**
- `createTodo` and `updateTodo` both call `setError(null)` at entry, clearing each other's errors. A rapid sequence can hide a failed mutation's error before the user sees it. **→ Accepted, low impact for MVP**
