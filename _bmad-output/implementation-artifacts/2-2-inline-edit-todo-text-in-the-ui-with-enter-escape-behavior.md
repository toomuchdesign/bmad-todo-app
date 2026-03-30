# Story 2.2: Inline edit todo text in the UI with Enter/Escape behavior

Status: done

## Story

As a user,
I want to edit a todo inline,
So that I can adjust wording without leaving the list.

## Acceptance Criteria

1. **Enter edit mode on click**
   - Given a todo item is visible
   - When I tap/click the todo text
   - Then it enters edit mode with the current text in an input

2. **Save on Enter**
   - Given I am editing a todo
   - When I press Enter
   - Then the UI sends the PATCH request and shows a per-row pending indicator

3. **Cancel on Escape**
   - Given I am editing a todo
   - When I press Escape
   - Then edit mode is canceled and the original text is shown

4. **Save on click-outside (blur)**
   - Given I am editing a todo
   - When I click outside the edit input (blur)
   - Then the edit is saved (same as Enter) -- most forgiving UX per retro decision

5. **Show global error on save failure**
   - Given the save fails due to network/server error
   - When the response returns
   - Then the UI shows a global error banner
   - And the UI remains consistent (no silent loss of edits)

6. **Inline validation for empty/too-long text**
   - Given I am editing a todo
   - When I try to save empty/whitespace-only or too-long text
   - Then the UI shows inline validation (same rules as AddTodoForm)
   - And the edit input stays open with the typed text preserved

7. **Per-row pending indicator during save**
   - Given I save an edit
   - When the PATCH request is in-flight
   - Then the todo row shows a visual pending indicator
   - And the row interactions (edit, checkbox, delete) are disabled

## Tasks / Subtasks

- [x] Task 1: Extract TodoItem component from TodoList (AC: all)
  - [x] Create `packages/web/src/components/TodoItem.tsx` + `TodoItem.module.css`
  - [x] Move the `<li>` rendering from `TodoList.tsx` into `TodoItem`
  - [x] Props: `todo: Todo`, `onUpdateText: (id: string, text: string) => Promise<boolean>`, `pendingAction: string | null`
  - [x] TodoList passes the new props and maps each todo to `<TodoItem>`
  - [x] Checkbox stays `disabled` for now (Story 2.3 enables it)
  - [x] Delete button is NOT added yet (Story 2.5 adds it)
  - [x] Verify existing App tests still pass after extraction

- [x] Task 2: Add `updateTodoText` to `useTodos` hook (AC: #2, #5)
  - [x] Add function `updateTodoText(id: string, text: string): Promise<boolean>` to `useTodos`
  - [x] Follow the `createTodo` pattern: `setError(null)` -> PATCH request -> update state on success -> `setError(GENERIC_MUTATION_ERROR_MESSAGE)` on failure
  - [x] PATCH URL: `` `/todos/${id}` `` — send `{ text }` as JSON body
  - [x] On success: update the matching todo in `todos` state array with the returned todo
  - [x] Return `true` on success, `false` on failure
  - [x] Add `pendingActions` state: `Record<string, string>` mapping todo ID to action name (e.g., `"edit"`)
  - [x] Set `pendingActions[id] = "edit"` before request, clear on completion (success or failure)
  - [x] Expose `pendingActions` from hook return type

- [x] Task 3: Implement inline edit mode in TodoItem (AC: #1, #2, #3, #4, #6, #7)
  - [x] Add local state: `editing: boolean`, `editText: string`, `validationError: string | null`
  - [x] Click handler on todo text `<button>` sets `editing = true` and `editText = todo.text`
  - [x] When `editing`, render an `<input>` instead of the `<button>` with `value={editText}`
  - [x] Use `useEffect` + state flag pattern for focus management (same as AddTodoForm's `shouldFocus`)
  - [x] Auto-focus the input when entering edit mode and select all text
  - [x] `onKeyDown` handler: Enter -> save, Escape -> cancel
  - [x] `onBlur` handler: save (same as Enter) — per epic retro decision
  - [x] Cancel: reset `editText` to `todo.text`, clear `validationError`, set `editing = false`
  - [x] Save logic: trim text, validate (empty check + MAX_TODO_TEXT_LENGTH), if unchanged from `todo.text` just exit edit mode, otherwise call `onUpdateText(todo.id, trimmedText)`
  - [x] On save success: exit edit mode
  - [x] On save failure: stay in edit mode with typed text preserved (never silently discard)
  - [x] Show `validationError` below the input (reuse AddTodoForm CSS pattern)
  - [x] Disable interactions when `pendingAction` is set (the row is busy)

- [x] Task 4: Wire TodoItem to App (AC: all)
  - [x] Pass `updateTodoText` from `useTodos` through `TodoList` to `TodoItem`
  - [x] Pass `pendingActions` from `useTodos` through `TodoList` to each `TodoItem`
  - [x] Update `TodoList` props to accept `onUpdateText` and `pendingActions`

- [x] Task 5: Style inline edit and pending states (AC: #1, #7)
  - [x] Style the edit input to match the todo text appearance (same font size, alignment)
  - [x] Use existing semantic tokens (`--s-border-focus`, `--s-focus-ring`, `--s-border-error`, `--s-text-error`)
  - [x] Add pending state styling: reduced opacity + pointer-events: none
  - [x] Completed todos should NOT be editable (skip click handler when `todo.completed`)

- [x] Task 6: Install `@testing-library/user-event` (AC: retro-driven)
  - [x] `npm install -D @testing-library/user-event -w packages/web`
  - [x] Use it for keyboard interaction tests (Enter/Escape) in this story
  - [x] Do NOT migrate existing `fireEvent`-based tests in Stories 1.6/1.7

- [x] Task 7: Write TodoItem unit tests (AC: #1, #2, #3, #4, #5, #6)
  - [x] Create `packages/web/src/components/TodoItem.test.tsx`
  - [x] Test: renders todo text as read-only label by default
  - [x] Test: clicking todo text enters edit mode with input containing current text
  - [x] Test: pressing Escape cancels edit and restores original text
  - [x] Test: pressing Enter with valid changed text calls `onUpdateText`
  - [x] Test: blur with valid changed text calls `onUpdateText` (click-outside saves)
  - [x] Test: pressing Enter with empty text shows inline validation error
  - [x] Test: pressing Enter with too-long text shows inline validation error
  - [x] Test: pressing Enter with unchanged text exits edit mode without API call
  - [x] Test: on save failure, edit mode stays open with typed text preserved
  - [x] Test: pending state disables interactions
  - [x] Test: completed todo text is not clickable for edit
  - [x] Use `@testing-library/user-event` for keyboard events

- [x] Task 8: Write App integration test for edit flow (AC: all)
  - [x] Create `packages/web/src/App.edit-todo.test.tsx`
  - [x] Test: user clicks todo text, edits, presses Enter -> todo text is updated in list
  - [x] Test: user edits and presses Escape -> original text restored
  - [x] Test: edit save fails -> global error banner shown, edit mode preserved
  - [x] Add fetch mock helpers to `test-utils/index.ts` for PATCH responses

- [x] Task 9: Add E2E test cases for inline edit (AC: all)
  - [x] Add inline edit E2E tests to `packages/web/e2e/todo-flows.spec.ts`
  - [x] E2E: click todo text -> edit -> Enter -> verify text updated
  - [x] E2E: click todo text -> edit -> Escape -> verify original text
  - [x] E2E: edit with empty text -> verify validation prevents save

- [x] Task 10: Run all validation gates
  - [x] `npm run type:check` passes
  - [x] `npm run biome:check` passes
  - [x] `npm run test:ci` passes (all existing + new tests)
  - [x] `npm run test:e2e` passes

## Dev Notes

### Architecture Compliance

- **No new state libraries** — use React built-ins only (useState, useEffect, useRef, useCallback)
- **CSS Modules only** — use semantic tokens (`--s-*`), never primitives or hard-coded values
- **Follow existing fetch pattern** — plain `fetch` for PATCH call, same error handling as `createTodo`
- **PATCH endpoint** is already implemented (Story 2.1): `PATCH /todos/:id` with body `{ text?: string, completed?: boolean }`, returns 200 with updated Todo

### Existing Patterns to Follow

**Component extraction** — TodoItem is extracted from TodoList's inline `<li>`. The component follows the same CSS Module pattern as `AddTodoForm` and `GlobalErrorBanner`: separate `.tsx` + `.module.css` files.

**Focus management** — Use the `useEffect` + `shouldFocus` state flag pattern established in [AddTodoForm.tsx](packages/web/src/components/AddTodoForm.tsx:17-21). Direct `ref.focus()` calls after state changes are unreliable in React 18 due to batched updates.

**Validation** — Reuse the same trim + empty check + `MAX_TODO_TEXT_LENGTH` validation from [AddTodoForm.tsx](packages/web/src/components/AddTodoForm.tsx:29-42). Same error messages for consistency.

**Hook mutation pattern** — Follow `createTodo` in [useTodos.ts](packages/web/src/hooks/useTodos.ts:72-109): clear error, fire request, update todos state on success, set error on failure. The new `updateTodoText` function follows the identical pattern but with PATCH method and per-item state update.

**Test patterns** — Use React Testing Library with `@testing-library/jest-dom` matchers. New file `TodoItem.test.tsx` for unit tests. New file `App.edit-todo.test.tsx` for integration tests (per project convention: App tests split by feature). Import fixtures and mock helpers from `packages/web/src/test-utils/index.ts`.

### PATCH API Contract

The PATCH endpoint is available at `/todos/${id}`:
- **Method:** PATCH
- **Body:** `{ text?: string }` (JSON)
- **Success:** 200 with full Todo object
- **Validation error:** 400 with `{ code: "VALIDATION_ERROR", message: string }`
- **Not found:** 404 with `{ code: "NOT_FOUND", message: string }`
- Types are generated in [packages/web/src/api/generated/index.ts](packages/web/src/api/generated/index.ts) under `paths["/todos/{id}"]["patch"]`

### Per-Row Pending State Design

Add a `pendingActions` map (`Record<string, string>`) to `useTodos` instead of a simple boolean. This supports:
- Story 2.2: `pendingActions[id] = "edit"` during text save
- Story 2.3: `pendingActions[id] = "toggle"` during toggle (future)
- Story 2.5: `pendingActions[id] = "delete"` during delete (future)

The map is keyed by todo ID so concurrent mutations on different todos don't interfere (prepares for Story 2.6 AbortController refactor).

### Click-Outside (Blur) Behavior

Per epic retro decision: blur saves (same as Enter). This is the "most forgiving UX" — prevents accidental loss of edits. The `onBlur` handler must check that the blur wasn't triggered by Escape (use a ref flag to distinguish cancel from blur-save).

**Important edge case:** When Enter is pressed, the save handler runs and then blur fires. Use a ref (e.g., `savingRef`) to prevent double-save: if save is already in progress from Enter, skip the blur-triggered save.

### Completed Todos

Completed todos should NOT enter edit mode when clicked. The text click handler should be a no-op when `todo.completed === true`. This is UX-consistent: you wouldn't edit something you've already marked done (and if you need to, un-complete it first in Story 2.3).

### Test Utilities to Add

Add to `packages/web/src/test-utils/index.ts`:
- `mockFetchSequence(responses: Array<{ok: boolean, status?: number, body: unknown}>)` — or simply use `vi.fn()` with `.mockResolvedValueOnce()` chains for tests that need a successful GET followed by a PATCH response
- Keep it simple: individual tests can set up their own fetch mock chains

### File Structure

New files:
- `packages/web/src/components/TodoItem.tsx`
- `packages/web/src/components/TodoItem.module.css`
- `packages/web/src/components/TodoItem.test.tsx`
- `packages/web/src/App.edit-todo.test.tsx`

Modified files:
- `packages/web/src/components/TodoList.tsx` — delegate to TodoItem
- `packages/web/src/components/TodoList.module.css` — may remove item-level styles (moved to TodoItem.module.css)
- `packages/web/src/hooks/useTodos.ts` — add `updateTodoText`, `pendingActions`
- `packages/web/src/App.tsx` — pass new props through
- `packages/web/src/test-utils/index.ts` — may add PATCH mock helpers
- `packages/web/e2e/todo-flows.spec.ts` — add edit E2E tests
- `packages/web/package.json` — add `@testing-library/user-event` dev dep

### Previous Story Intelligence (Story 2.1)

Key learnings from Story 2.1:
- PATCH route is fully implemented with text trimming, validation, and 404 handling
- OpenAPI types include PATCH at `paths["/todos/{id}"]["patch"]`
- `GlobalErrorBanner` already has `loading` prop for retry debounce
- `useTodos` preserves error during retry (doesn't clear error at fetch start)
- Pre-commit hook runs `source:fix` before `source:check`
- `uuid` format validation was added to PATCH params (non-UUID IDs return 400, not 500)
- `seedTodo` helper exists in API test-utils for creating test data

### References

- [Source: epics.md#Story 2.2] — Acceptance criteria, retro-driven additions
- [Source: epics.md#Epic 2 Retro Learnings] — Focus management, user-event, click-outside saves, vitest globals: false
- [Source: architecture.md#Frontend Architecture] — State management, styling, optimistic/pending UI rules
- [Source: architecture.md#CSS Token System] — Semantic tokens only in component modules
- [Source: ux-design-specification.md#Edit Todo (Inline)] — Entry, edit mode UI, pending + failure behavior
- [Source: project-context.md] — Testing practices, coding conventions, AAA pattern
- [Source: packages/web/src/hooks/useTodos.ts] — Existing hook pattern for mutations
- [Source: packages/web/src/components/AddTodoForm.tsx] — Focus management pattern, validation pattern
- [Source: packages/web/src/components/TodoList.tsx] — Current inline rendering to extract from
- [Source: packages/web/src/api/generated/index.ts] — PATCH type definitions
- [Source: 2-1-implement-patch-todos-id-for-text-and-completion-updates.md] — Previous story file list, learnings

## Change Log

- Implemented inline edit for todo items with Enter/Escape/blur behavior, per-row pending state, and validation (Date: 2026-03-30)

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6 (1M context)

### Debug Log References

- Used `<button>` instead of interactive `<span>` for todo text click target (biome lint: static elements should not be interactive)
- `cancelledRef` pattern to prevent blur-save when Escape is pressed
- `savingRef` pattern to prevent double-save when Enter triggers blur

### Completion Notes List

- Extracted TodoItem component from TodoList with full inline edit support
- Added `updateTodoText` and `pendingActions` to useTodos hook following createTodo pattern
- Inline edit mode: Enter saves, Escape cancels, blur saves (most forgiving UX per retro)
- Validation reuses same rules as AddTodoForm (empty + MAX_TODO_TEXT_LENGTH)
- Completed todos render as non-clickable spans (no edit mode)
- Pending state disables row via opacity + pointer-events: none
- 13 unit tests (TodoItem), 3 integration tests (App.edit-todo), 3 E2E tests
- Installed @testing-library/user-event for keyboard interaction tests
- All validation gates pass: type:check, biome:check, test:ci (56 tests), test:e2e (10 tests)

### File List

New files:
- packages/web/src/components/TodoItem.tsx
- packages/web/src/components/TodoItem.module.css
- packages/web/src/components/TodoItem.test.tsx
- packages/web/src/App.edit-todo.test.tsx

Modified files:
- packages/web/src/components/TodoList.tsx
- packages/web/src/components/TodoList.module.css
- packages/web/src/hooks/useTodos.ts
- packages/web/src/App.tsx
- packages/web/e2e/todo-flows.spec.ts
- packages/web/package.json
- package-lock.json

### Review Findings

- [x] [Review][Patch] `cancelledRef` not reset on re-entering edit mode — fixed: reset in `enterEditMode()`. [packages/web/src/components/TodoItem.tsx:31]
- [x] [Review][Patch] Error response typed as `["400"]` → `["default"]` to match `createTodo` pattern. [packages/web/src/hooks/useTodos.ts:139]
- [x] [Review][Patch] Missing accessibility association on edit input — fixed: uses `aria-invalid` + `aria-live="polite"` on error `<p>` (avoids duplicate ID issue in list). [packages/web/src/components/TodoItem.tsx:135]
- [x] [Review][Patch] E2E inline edit tests — fixed: each test now creates its own todo for isolation. [packages/web/e2e/todo-flows.spec.ts:91]
- [x] [Review][Patch] `savingRef` not reset on rejection — fixed: wrapped in try/finally. [packages/web/src/components/TodoItem.tsx:68]
- [x] [Review][Defer] Concurrent multi-item edit mode — multiple todos can be in edit mode simultaneously; clicking a second todo triggers blur-save on the first. Pre-existing architectural choice, not a regression.
- [x] [Review][Defer] CSS hardcoded spacing/sizing values in TodoItem.module.css — pre-existing pattern moved from TodoList.module.css, not a regression. [packages/web/src/components/TodoItem.module.css]
- [x] [Review][Defer] Concurrent PATCH calls for same todo ID not guarded at hook level — planned for Story 2.6 AbortController refactor. Currently protected by `savingRef` in TodoItem. [packages/web/src/hooks/useTodos.ts:117]
