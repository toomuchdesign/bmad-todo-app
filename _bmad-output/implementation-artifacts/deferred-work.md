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
