# Deferred Work

## Deferred from: code review of 1-6-build-the-todo-list-screen-with-load-states-and-retry (2026-03-29)

- No `AbortController` in `useTodos` — fetch not cancelled on unmount, `setState` called on unmounted component. Will matter when routing is introduced.
- Stale todos remain visible alongside error banner if a retry fails after a prior successful load. Latent until mutations/refetch are added.
- Retry button not disabled during in-flight fetch — rapid clicks cause concurrent requests that race. Low impact for single-screen MVP.
- Dark mode error banner colors (`#fca5a5` on semi-transparent `rgba(153,27,27,0.15)`) may not meet WCAG contrast. Verify in accessibility story (3-4).

## Deferred from: code review of 1-8-set-up-playwright-e2e-infrastructure-and-cover-epic-1-flows (2026-03-30)

- Pre-commit hook missing `npm run` prefix for first command (`build:openapi:api-types:stage`) — pre-existing issue in `package.json` simple-git-hooks config.

## Deferred from: code review of 2-1-implement-patch-todos-id-for-text-and-completion-updates (2026-03-30)

- Pre-commit `source:fix` may silently modify already-staged files, leaving unstaged changes after commit. Introduced by retro-driven hook update. Consider using `lint-staged` to scope fixes to staged files only.

## Deferred from: code review of story 2.2 (2026-03-30)

- CSS hardcoded spacing/sizing values in TodoItem.module.css — pre-existing pattern moved from TodoList.module.css. Consider introducing spacing tokens when the design system matures.
- Concurrent PATCH calls for same todo ID not guarded at hook level in `useTodos.ts` — currently protected by `savingRef` in TodoItem. Planned for Story 2.6 AbortController refactor.
- Concurrent multi-item edit mode — multiple todos can enter edit mode simultaneously; clicking a second triggers blur-save on the first. Architectural choice, not a bug.

## Deferred from: code review of story 2.3 (2026-03-30)

- Concurrent mutation race conditions on same todo — if toggle and edit fire concurrently, snapshots can conflict and rollback may restore stale state. Mitigated by UI guards (`disabled={isPending}`, `pointer-events: none`). Story 2.6 addresses this at hook level with per-item AbortController.
- Replace `pendingActions` string-keyed record in `useTodos` with a more robust solution — current `Record<string, string>` approach is loosely typed and doesn't scale well for composing or querying multiple concurrent states per item. Consider a per-item state machine or enum-based status model.

## Deferred from: code review of story 2.5 (2026-03-31)

- 404 on already-deleted todo loops forever — if the same todo is deleted from another tab, this tab receives 404, shows a generic error, and the todo stays visible. Retrying always hits 404 again. No distinction between 404 (already deleted — safe to remove locally) and 500 (genuine failure).
- `pendingAction` is an untyped magic string — `"delete"`, `"edit"`, `"toggle"` are not validated against a union type. Pre-existing pattern across all mutations.
