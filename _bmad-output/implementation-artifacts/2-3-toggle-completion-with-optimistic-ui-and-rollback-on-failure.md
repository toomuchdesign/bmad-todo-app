# Story 2.3: Toggle completion with optimistic UI and rollback on failure

Status: done

## Story

As a user,
I want to mark todos complete and incomplete,
So that I can track progress.

## Acceptance Criteria

1. **Optimistic toggle on checkbox click**
   - Given a todo item is visible
   - When I toggle its checkbox
   - Then the UI immediately reflects the new completion state with a per-row pending indicator

2. **Confirm on API success**
   - Given the API update succeeds
   - When the response returns
   - Then the UI shows the final saved state and clears the pending indicator

3. **Rollback on API failure**
   - Given the API update fails
   - When the response returns
   - Then the UI reverts the checkbox to the previous state
   - And a global error banner is shown

## Tasks / Subtasks

- [x] Task 1: Add `toggleTodoCompletion` to `useTodos` hook (AC: #1, #2, #3)
  - [x]Add function `toggleTodoCompletion(id: string): Promise<boolean>` to `useTodos`
  - [x]Follow the `updateTodoText` mutation pattern: `setError(null)` -> set pending -> API call -> update/rollback state -> clear pending
  - [x]**Optimistic update:** immediately flip `completed` on the target todo in state *before* the API call
  - [x]Set `pendingActions[id] = "toggle"` before request, clear on completion (success or failure)
  - [x]PATCH URL: `` `/todos/${id}` `` — send `{ completed: !currentCompleted }` as JSON body
  - [x]On success: replace the todo in state with the server-returned todo (authoritative)
  - [x]On failure: revert the optimistic flip (restore `completed` to its pre-toggle value), set `error` to `GENERIC_MUTATION_ERROR_MESSAGE`
  - [x]Return `true` on success, `false` on failure
  - [x]Expose `toggleTodoCompletion` from hook return value

- [x] Task 2: Wire toggle through App and TodoList (AC: #1)
  - [x]Extract `toggleTodoCompletion` from `useTodos()` in `App.tsx`
  - [x]Pass `onToggleCompletion={toggleTodoCompletion}` to `<TodoList>`
  - [x]Add `onToggleCompletion: (id: string) => Promise<boolean>` to `TodoListProps` in `TodoList.tsx`
  - [x]Pass `onToggleCompletion` from `TodoList` to each `<TodoItem>`

- [x] Task 3: Make checkbox interactive in TodoItem (AC: #1, #2, #3)
  - [x]Add `onToggleCompletion: (id: string) => Promise<boolean>` to `TodoItemProps`
  - [x]Remove `disabled` from the checkbox input
  - [x]Add `onChange` handler: call `onToggleCompletion(todo.id)` (fire-and-forget; the hook handles state)
  - [x]Disable checkbox when `pendingAction !== null` (row is busy with any mutation)
  - [x]Keep `aria-label` pattern: `` `${todo.text} – ${todo.completed ? "completed" : "not completed"}` ``
  - [x]Completed todo text should now be clickable for edit mode (remove the `todo.completed` guard from Story 2.2) — **NO, keep the guard**: per UX, completed todos are not editable inline; un-complete first via toggle

- [x] Task 4: Write TodoItem unit tests for toggle behavior (AC: #1, #2, #3)
  - [x]Add tests in `packages/web/src/components/TodoItem.test.tsx`
  - [x]Test: checkbox calls `onToggleCompletion` with todo ID on change
  - [x]Test: checkbox is disabled when `pendingAction` is set
  - [x]Test: completed todo renders with checked checkbox and completed visual style

- [x] Task 5: Write App integration test for toggle flow (AC: #1, #2, #3)
  - [x]Create `packages/web/src/App.toggle-todo.test.tsx` (per project convention: split by feature)
  - [x]Test: user clicks checkbox on incomplete todo -> todo appears completed in list (optimistic)
  - [x]Test: toggle API fails -> checkbox reverts to previous state, global error banner shown
  - [x]Mock fetch: GET success -> PATCH success/failure sequences
  - [x]Import fixtures and mock helpers from `packages/web/src/test-utils/index.ts`

- [x] Task 6: Add E2E test cases for toggle completion (AC: #1, #2, #3)
  - [x]Add toggle E2E tests to `packages/web/e2e/todo-flows.spec.ts`
  - [x]E2E: click checkbox on incomplete todo -> verify todo appears completed (strikethrough/visual change)
  - [x]E2E: click checkbox on completed todo -> verify todo appears incomplete
  - [x]E2E: toggle fails (intercept PATCH) -> verify checkbox reverts and error banner shown

- [x] Task 7: Run all validation gates
  - [x]`npm run type:check` passes
  - [x]`npm run biome:check` passes
  - [x]`npm run test:ci` passes (all existing + new tests)
  - [x]`npm run test:e2e` passes

### Review Findings

- [x] [Review][Decision] Tests don't assert optimistic intermediate state — fixed: added deferred PATCH response in integration test and delayed route intercept in E2E to assert optimistic checked state before rollback
- [x] [Review][Patch] Redundant `todos.find()` in `toggleTodoCompletion` — fixed by user
- [x] [Review][Defer] Concurrent mutation race conditions on same todo [`packages/web/src/hooks/useTodos.ts:122`] — deferred, mitigated by UI guards; story 2.6 addresses concurrency at hook level

## Dev Notes

### Architecture Compliance

- **No new state libraries** — use React built-ins only (useState, useEffect, useRef, useCallback)
- **CSS Modules only** — use semantic tokens (`--s-*`), never primitives or hard-coded values
- **Follow existing fetch pattern** — plain `fetch` for PATCH call, same error handling as `updateTodoText`
- **PATCH endpoint** is already implemented (Story 2.1): `PATCH /todos/:id` with body `{ text?: string, completed?: boolean }`, returns 200 with updated Todo

### Optimistic Update Pattern (Key Difference from Edit)

This story uses **optimistic UI** — different from Story 2.2 (edit) which waits for server confirmation. The pattern:

1. **Before API call:** flip `completed` in local state immediately
2. **Set pending:** `pendingActions[id] = "toggle"`
3. **On success:** replace todo with server-returned authoritative version
4. **On failure:** revert `completed` to the pre-toggle value and show global error

Implementation approach in `useTodos`:
```
// Capture previous state for rollback
const previousCompleted = currentTodo.completed;

// Optimistic update
setTodos(prev => prev.map(t => t.id === id ? { ...t, completed: !t.completed } : t));

// Set pending
setPendingActions(prev => ({ ...prev, [id]: "toggle" }));

// API call
try {
  const response = await fetch(`/todos/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ completed: !previousCompleted }),
  });
  // On success: update with server todo
  // On failure: revert to previousCompleted
} finally {
  // Clear pending
}
```

### Existing Patterns to Follow

**Mutation pattern** — Follow `updateTodoText` in [useTodos.ts](packages/web/src/hooks/useTodos.ts): clear error, set pending, API call, update/revert state, clear pending, return boolean.

**Pending actions** — Reuses the same `pendingActions: Record<string, string>` map. Set `"toggle"` as the action name. The `.pending` CSS class in [TodoItem.module.css](packages/web/src/components/TodoItem.module.css) already handles visual feedback (opacity + pointer-events: none).

**Completed styling** — Already exists in [TodoItem.module.css](packages/web/src/components/TodoItem.module.css) as `.completed` class: `text-decoration: line-through; opacity: 0.6;`. The class is applied in TodoItem when `todo.completed` is true. No new CSS is needed.

**Error handling** — Use `GENERIC_MUTATION_ERROR_MESSAGE` from [useTodos.ts](packages/web/src/hooks/useTodos.ts) as the error message on failure.

**Test patterns** — Use React Testing Library with `@testing-library/user-event` for click events. New file `App.toggle-todo.test.tsx` for integration tests (per project convention: App tests split by feature). Import fixtures and mock helpers from `packages/web/src/test-utils/index.ts`.

### PATCH API Contract

The PATCH endpoint is available at `/todos/${id}`:
- **Method:** PATCH
- **Body:** `{ completed?: boolean }` (JSON)
- **Success:** 200 with full Todo object (including updated `completed` and `updatedAt`)
- **Not found:** 404 with `{ code: "NOT_FOUND", message: string }`
- Types are generated in [packages/web/src/api/generated/index.ts](packages/web/src/api/generated/index.ts) under `paths["/todos/{id}"]["patch"]`

### Checkbox Accessibility

- Keep the existing `aria-label` pattern on the checkbox: `` `${todo.text} – ${todo.completed ? "completed" : "not completed"}` ``
- The label updates optimistically when the state flips
- Checkbox should be focusable and operable via keyboard (Space/Enter toggles)

### No CSS Changes Needed

The existing styles handle everything:
- `.completed` class on text for strikethrough + reduced opacity
- `.pending` class on item row for reduced opacity + pointer-events: none
- Checkbox `checked` attribute reflects `todo.completed` state directly

### File Structure

New files:
- `packages/web/src/App.toggle-todo.test.tsx`

Modified files:
- `packages/web/src/hooks/useTodos.ts` — add `toggleTodoCompletion`
- `packages/web/src/App.tsx` — extract and pass `toggleTodoCompletion`
- `packages/web/src/components/TodoList.tsx` — add `onToggleCompletion` prop
- `packages/web/src/components/TodoItem.tsx` — make checkbox functional
- `packages/web/src/components/TodoItem.test.tsx` — add toggle tests
- `packages/web/e2e/todo-flows.spec.ts` — add toggle E2E tests

### Project Structure Notes

- All changes align with existing project structure
- No new directories needed
- New test file follows `App.<feature>.test.tsx` convention
- No changes to API or shared packages (PATCH endpoint already supports `completed` field)

### Previous Story Intelligence (Story 2.2)

Key learnings from Story 2.2:
- `pendingActions` map is already in place and working (`Record<string, string>` keyed by todo ID)
- TodoItem already has the `pendingAction` prop and disables interactions when pending
- `.pending` CSS class already applies opacity + pointer-events: none to the row
- `.completed` CSS class already handles visual distinction (strikethrough + opacity)
- `cancelledRef` and `savingRef` patterns were added for blur/enter edge cases — not needed for toggle (single click action)
- `@testing-library/user-event` is already installed
- Review found: completed todos are not editable inline (by design) — this stays unchanged
- Review deferred: concurrent PATCH calls for same todo ID not guarded at hook level — planned for Story 2.6

### Git Intelligence

Recent commits show consistent patterns:
- `be2e728 feat: implement story 2.2` — most recent, established TodoItem extraction + inline edit
- `c0e4eb5 feat: implement story 2.0` — PATCH API route + retro fixes
- Commit messages follow `feat: implement story X.Y` pattern

### References

- [Source: epics.md#Story 2.3] — Acceptance criteria
- [Source: epics.md#Epic 2 Retro Learnings] — Optimistic vs server-confirms-first coexist in same hook
- [Source: architecture.md#Frontend Architecture] — Optimistic/pending UI rules: toggle uses optimistic with rollback
- [Source: architecture.md#CSS Token System] — Semantic tokens only in component modules
- [Source: architecture.md#Anti-patterns] — Explicitly forbidden: deleting todo in UI before API confirms
- [Source: ux-design-specification.md#Toggle Complete] — Optimistic update, visual distinction, rollback on failure
- [Source: project-context.md] — Testing practices, coding conventions, AAA pattern
- [Source: 2-2-inline-edit-todo-text.md] — Previous story file list, learnings, pendingActions pattern

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6 (1M context)

### Debug Log References

None — clean implementation with no blockers.

### Completion Notes List

- Added `toggleTodoCompletion` to `useTodos` hook following the optimistic update pattern: immediate flip, pending state, server confirmation or rollback on failure
- Wired `onToggleCompletion` prop through App -> TodoList -> TodoItem
- Made checkbox interactive: enabled by default, disabled during pending, fires toggle on change
- Added 2 new TodoItem unit tests (toggle calls handler, disabled when pending) and 1 existing test updated (checkbox now enabled)
- Created `App.toggle-todo.test.tsx` with 2 integration tests: success path (optimistic check) and failure path (revert + error banner)
- Added 3 E2E tests: mark complete, unmark complete, failure rollback with error banner
- All validation gates pass: type:check, biome:check, test:ci (42 web + 19 API), test:e2e (13 tests)

### Change Log

- 2026-03-30: Implemented Story 2.3 — toggle completion with optimistic UI and rollback on failure

### File List

Modified:
- `packages/web/src/hooks/useTodos.ts` — added `toggleTodoCompletion` function and updated return type
- `packages/web/src/App.tsx` — extracted and passed `toggleTodoCompletion` to TodoList
- `packages/web/src/components/TodoList.tsx` — added `onToggleCompletion` prop, forwarded to TodoItem
- `packages/web/src/components/TodoItem.tsx` — added `onToggleCompletion` prop, made checkbox interactive
- `packages/web/src/components/TodoItem.test.tsx` — updated render helper, updated checkbox test, added toggle tests
- `packages/web/e2e/todo-flows.spec.ts` — added toggle completion E2E tests

New:
- `packages/web/src/App.toggle-todo.test.tsx` — App integration tests for toggle flow
