# Story 5.0: Pre-deployment cleanup — resolve deferred action points

Status: done

## Story

As a maintainer,
I want all tracked open deferred items resolved or explicitly accepted,
so that known bugs and convention violations do not ship into the first deployed build.

## Acceptance Criteria

### AC1 — UX bug: stale list on retry failure

**Given** the initial todo load succeeded and the list is showing
**When** a retry-after-error fetch fails (e.g. network flaps)
**Then** the stale todo list is cleared and only the error banner is shown
**And** the retry action is still available

### AC2 — UX bug: 404 on already-deleted todo

**Given** a todo exists in the UI
**When** delete or update returns `404` (item already removed server-side)
**Then** the UI treats the response as success and removes the item from the list
**And** no error banner is shown

### AC3 — UX bug: stale mutation refs after fetchTodos retry

**Given** a mutation (edit, toggle, delete) is in-flight
**When** `fetchTodos` is triggered (e.g. user retries) and succeeds
**Then** all in-flight mutations are aborted
**And** `pendingFields`, `snapshots`, and `mutationControllers` refs are cleared
**And** the fresh server data is the new source of truth

### AC4 — API schema gap: PATCH accepts empty body

**Given** the `PATCH /todos/:id` route schema
**When** I call `PATCH /todos/:id` with an empty body `{}`
**Then** the API returns `400` with `code = VALIDATION_ERROR`

### AC5 — Code convention: default export in todosRoutes

**Given** `packages/api/src/routes/todos/index.ts`
**When** I open the file
**Then** it uses a named export (`export { todosRoutes }`) with no `export default`

### AC6 — CSS: hardcoded values in TodoItem.module.css use tokens

**Given** `packages/web/src/components/TodoItem.module.css`
**When** I inspect spacing, font-size, and border-radius values
**Then** they reference semantic tokens (`--s-*`) rather than hardcoded pixel/rem values
**And** any required new tokens are added to `packages/web/src/tokens/semantic.css`

### AC7 — Minor UX: focusTodoId cleared after focus fires

**Given** `focusTodoId` is set in `App.tsx` to trigger focus on a todo
**When** the focus effect in `TodoItem` fires
**Then** `focusTodoId` is reset to `undefined` immediately after to prevent stale re-focus on remount

## Tasks / Subtasks

- [ ] Task 1 — API: reject PATCH empty body (AC4)
  - [ ] Add `minProperties: 1` to `patchTodosRouteSchema.body` in `packages/api/src/routes/todos/schemas.ts`
  - [ ] Add API integration test in `packages/api/test/todos.patch.test.ts`: `PATCH /todos/:id` with `{}` → `400 VALIDATION_ERROR`

- [ ] Task 2 — API: verify/fix default export in todosRoutes (AC5)
  - [ ] Open `packages/api/src/routes/todos/index.ts`; verify it uses `export { todosRoutes }` (no `export default`)
  - [ ] If a default export exists, replace with named export and fix any import sites (check `packages/api/src/app.ts` and any routes barrel)

- [ ] Task 3 — Web: clear stale list on fetch failure (AC1)
  - [ ] In `fetchTodos` catch block in `packages/web/src/hooks/useTodos.ts`, call `setTodos([])` before setting error
  - [ ] Add/update test in `packages/web/src/App.test.tsx`: after initial load success, a retry-fetch failure clears todos and shows error banner

- [ ] Task 4 — Web: treat 404 as success in deleteTodo/updateTodo (AC2)
  - [ ] In `deleteTodo` in `useTodos.ts`: catch `HttpError` with `status === 404` → remove from list, return `true` (no error set)
  - [ ] In `updateTodo` in `useTodos.ts`: catch `HttpError` with `status === 404` → remove from list, return `true` (no error set)
  - [ ] Add tests in `packages/web/src/App.delete-todo.test.tsx` and `packages/web/src/App.edit-todo.test.tsx` covering 404 → item removed, no banner

- [ ] Task 5 — Web: abort in-flight mutations on successful fetchTodos (AC3)
  - [ ] Expose `clearAll()` from `useOptimisticUpdate` in `packages/web/src/hooks/useOptimisticUpdate.ts`; it aborts all controllers, clears all three maps
  - [ ] In `useTodos.ts`, destructure `clearAll` from `useOptimisticUpdate`; call it inside the try block of `fetchTodos` after receiving server data (before `setTodos`)
  - [ ] Add `clearAll` to `fetchTodos` `useCallback` dep array only if it isn't referentially stable (it uses only refs so it is — use `useCallback([], [])` or just confirm it's stable)
  - [ ] Add test (or update `App.mutation-concurrency.test.tsx`): pending mutation is aborted when fetchTodos succeeds

- [ ] Task 6 — Web: replace hardcoded values in TodoItem.module.css with tokens (AC6)
  - [ ] Add new spacing/sizing tokens to `packages/web/src/tokens/semantic.css` (only tokens required by this file — keep minimal)
  - [ ] Replace hardcoded px/rem values in `packages/web/src/components/TodoItem.module.css` with `var(--s-*)` references
  - [ ] No test change required (visual/CSS only); run `biome:check` to ensure no formatting issues

- [ ] Task 7 — Web: clear focusTodoId after focus is applied (AC7)
  - [ ] Add `onFocusApplied?: () => void` prop to `TodoItem` in `packages/web/src/components/TodoItem.tsx`
  - [ ] Inside the focus `useEffect` (the one that calls `checkboxRef.current?.focus()`), call `onFocusApplied?.()` after focusing
  - [ ] Thread `onFocusApplied` through `TodoList` in `packages/web/src/components/TodoList.tsx` as a new optional prop
  - [ ] In `App.tsx`, pass `() => setFocusTodoId(undefined)` as `onFocusApplied` to `TodoList`
  - [ ] Update `packages/web/src/App.delete-todo.test.tsx` if it asserts on focus behavior

## Dev Notes

### Overview

Pure cleanup — no new features. Seven discrete fixes across API schema, code conventions, and web UX/state management. Each fix is independent; implement and test them one at a time.

### Task 1 detail — PATCH minProperties

The `patchTodosRouteSchema` body in [packages/api/src/routes/todos/schemas.ts](packages/api/src/routes/todos/schemas.ts) currently has no `minProperties` constraint, so `PATCH /todos/:id` with `{}` silently bumps `updatedAt`. Add `minProperties: 1` directly to the body object:

```ts
body: {
  type: "object",
  additionalProperties: false,
  minProperties: 1,   // ← add this
  properties: { ... }
}
```

Fastify's JSON schema validation will reject `{}` with a 400 before the handler runs.

The existing test file is [packages/api/test/todos.patch.test.ts](packages/api/test/todos.patch.test.ts). Follow the existing `fastify.inject()` style. The error response shape is `{ code: "VALIDATION_ERROR", message: string }` — check [packages/api/src/routes/shared/schemas.ts](packages/api/src/routes/shared/schemas.ts) for the exact `errorResponseSchema`.

### Task 2 detail — Default export verification

The current code in [packages/api/src/routes/todos/index.ts](packages/api/src/routes/todos/index.ts) shows `export { todosRoutes }` (named export) at the bottom. This may already be correct. Verify before changing. If a `export default` is found anywhere in that file, replace with named export and fix the import in [packages/api/src/app.ts](packages/api/src/app.ts).

### Task 3 detail — Stale list on fetch failure

In [packages/web/src/hooks/useTodos.ts](packages/web/src/hooks/useTodos.ts), `fetchTodos` currently only updates `todos` on success. The catch block should clear stale data:

```ts
} catch (err) {
  setTodos([]);   // ← add this
  setError(extractErrorMessage(err, GENERIC_ERROR_MESSAGE));
}
```

The affected test is `App.test.tsx` (load/structure tests). Use the existing fetch mock helpers from [packages/web/src/test-utils/index.ts](packages/web/src/test-utils/index.ts).

### Task 4 detail — 404 as success

`HttpError` (from [packages/web/src/utils/http-client.ts](packages/web/src/utils/http-client.ts)) has a `status: number` field. Pattern for `deleteTodo`:

```ts
} catch (err) {
  if (err instanceof HttpError && err.status === 404) {
    setTodos((prev) => prev.filter((t) => t.id !== id));
    return true;
  }
  setError(extractErrorMessage(err, GENERIC_MUTATION_ERROR_MESSAGE));
  return false;
}
```

Apply the same pattern in `updateTodo` (which goes through `mutate` from `useOptimisticUpdate` — the thrown `HttpError` surfaces from there). In `updateTodo` the catch will fire after the optimistic update has already been applied (and rolled back by `useOptimisticUpdate` on failure). On 404, you want to:

1. Remove the item from the list (it's gone server-side)
2. Return `true` (not an error)

Since `mutate` rollbacks the optimistic state on throw, you need to `setTodos((prev) => prev.filter(...))` after the catch to remove the item.

### Task 5 detail — clearAll in useOptimisticUpdate

In [packages/web/src/hooks/useOptimisticUpdate.ts](packages/web/src/hooks/useOptimisticUpdate.ts), add a `clearAll` function:

```ts
function clearAll(): void {
  for (const controller of controllers.current.values()) {
    controller.abort();
  }
  controllers.current.clear();
  pendingFields.current.clear();
  snapshots.current.clear();
}

return { mutate, clearAll };
```

Because `clearAll` only touches `useRef` values, it has a stable identity across renders and is safe to include in `fetchTodos`'s `useCallback` dependency array. Call it in `useTodos.ts` after successful fetch:

```ts
const data = await httpClient.get<...>(...);
clearAll(); // abort in-flight mutations; fresh server data takes over
setTodos(data.todos);
setError(null);
```

Update the `fetchTodos` `useCallback` dep array: `[userId, clearAll]`. Since `clearAll` is stable, this won't cause re-renders.

### Task 6 detail — CSS tokens

The project's token files are:

- Primitives: [packages/web/src/tokens/primitives.css](packages/web/src/tokens/primitives.css) — raw values (`--p-*`)
- Semantic: [packages/web/src/tokens/semantic.css](packages/web/src/tokens/semantic.css) — contextual aliases (`--s-*`)

The current semantic.css has no spacing or sizing tokens. Add only what TodoItem.module.css needs (keep tokens minimal per project convention). Suggested additions to `semantic.css`:

```css
/* Spacing */
--s-space-1: 4px;
--s-space-2: 8px;
--s-space-3: 12px;
--s-space-4: 16px;
--s-space-1-5: 6px;

/* Radii */
--s-radius-sm: 4px;

/* Font sizes */
--s-font-size-xs: 12px;
--s-font-size-sm: 13px;
--s-font-size-base: 14px;
--s-font-size-md: 16px;
```

Note: `--s-font-size-sm: 13px` and `--s-font-size-base: 14px` naming is flexible — use naming that makes semantic sense. Check other CSS modules in `packages/web/src/components/` to see if any hardcoded values exist that could use the same token so naming is consistent.

Check `packages/web/src/components/AddTodoForm.module.css` for existing hardcoded values — if they share patterns, add tokens that cover both rather than duplicating.

**Do not** tokenize values from other CSS modules in this story (scope is `TodoItem.module.css` only). If other modules have hardcoded values, leave them for a separate story.

### Task 7 detail — Clear focusTodoId

In [packages/web/src/components/TodoItem.tsx](packages/web/src/components/TodoItem.tsx), the focus effect at line ~59:

```ts
useEffect(() => {
  if (focusCheckbox) {
    checkboxRef.current?.focus();
    onFocusApplied?.(); // ← add this
  }
}, [focusCheckbox, onFocusApplied]);
```

Thread the prop through `TodoList`:

```ts
type TodoListProps = {
  // ...existing props...
  onFocusApplied?: () => void;
};
// pass down to each TodoItem: onFocusApplied={onFocusApplied}
```

In `App.tsx`:

```tsx
<TodoList
  ...
  focusTodoId={focusTodoId}
  onFocusApplied={() => setFocusTodoId(undefined)}
/>
```

### Testing strategy

- API tests: `fastify.inject()` integration style, file [packages/api/test/todos.patch.test.ts](packages/api/test/todos.patch.test.ts)
- Web tests: React Testing Library with fetch mocks from [packages/web/src/test-utils/index.ts](packages/web/src/test-utils/index.ts)
- Test file convention: changes to `deleteTodo` → `App.delete-todo.test.tsx`, `updateTodo` 404 → `App.edit-todo.test.tsx`, fetch failure stale list → `App.test.tsx`, focusTodoId → `App.delete-todo.test.tsx`
- Do NOT add tests for the CSS token change (visual-only)
- Do NOT add tests for the default export fix (no behavioral change)
- Run `npm run test:ci` and `npm run test:e2e` before marking done

### Accepted/deferred items (do NOT fix in this story)

Per epics.md story 5.0 technical notes — these are explicitly accepted for MVP:

- `createTodo`/`updateTodo` clearing each other's errors (low impact)
- Pre-commit `source:fix` staged file mutation (accepted)
- Concurrent multi-item edit (intentional architectural choice)
- `validateUserPlugin` caching (deferred to future auth story)
- 401 web client handling (deferred to future auth story)

### Project Structure Notes

- No new files expected — all changes are edits to existing files
- API route schemas live in `packages/api/src/routes/todos/schemas.ts` (separate from handler)
- CSS tokens are in `packages/web/src/tokens/` — edit `semantic.css` only (do not touch `primitives.css` for this story)
- `useOptimisticUpdate` is consumed only by `useTodos` — adding `clearAll` to its return type is a non-breaking change

### References

- Deferred items source: [\_bmad-output/implementation-artifacts/deferred-work.md](_bmad-output/implementation-artifacts/deferred-work.md)
- Epic 5 story 5.0 spec: [\_bmad-output/planning-artifacts/epics.md](_bmad-output/planning-artifacts/epics.md) line 712
- Architecture: [\_bmad-output/planning-artifacts/architecture.md](_bmad-output/planning-artifacts/architecture.md) — CSS token system section, API patterns section
- Project conventions: [project-context.md](project-context.md) — named exports rule, CSS token guidelines

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6[1m]

### Debug Log References

### Completion Notes List

### File List
