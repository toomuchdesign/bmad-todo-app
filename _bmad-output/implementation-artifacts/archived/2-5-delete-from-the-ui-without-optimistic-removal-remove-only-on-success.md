# Story 2.5: Delete from the UI without optimistic removal (remove only on success)

Status: done

## Story

As a user,
I want to delete a todo with predictable behavior,
So that I don't lose items due to transient failures.

## Acceptance Criteria

1. **Per-row pending indicator on delete click**
   - Given a todo item is visible
   - When I click/tap the Delete button
   - Then the UI shows a per-row pending indicator (`.pending` class: opacity 0.6, pointer-events none)
   - And the row remains visible until the API confirms deletion

2. **Row removed on API success**
   - Given the API delete succeeds (204)
   - When the response returns
   - Then the todo is removed from the list

3. **Row preserved and error shown on API failure**
   - Given the API delete fails (network error or non-2xx)
   - When the response returns
   - Then the todo remains visible in the list (unchanged)
   - And the UI shows a global error banner

## Tasks / Subtasks

- [x] Task 1: Add `deleteTodo` mutation to `useTodos` hook (AC: #1, #2, #3)
  - [x] Add `deleteTodo(id: string): Promise<boolean>` function in `useTodos.ts`
  - [x] **Not optimistic**: do NOT remove the todo from state before API confirmation
  - [x] Set `pendingActions[id] = "delete"` immediately on call
  - [x] Clear error state on call start (`setError(null)`)
  - [x] Send `DELETE /todos/${id}` request (no body, no Content-Type header)
  - [x] On success (204): remove the todo from `todos` state via `setTodos(prev => prev.filter(t => t.id !== id))`, clear pending action, return `true`
  - [x] On failure: keep todos unchanged, set error message (parse API body or fall back to generic), clear pending action, return `false`
  - [x] Export `deleteTodo` from the hook's return object

- [x] Task 2: Add Delete button to `TodoItem` component (AC: #1)
  - [x] Accept new prop `onDelete: (id: string) => Promise<boolean>` in `TodoItemProps`
  - [x] Add a `<button>` with text "Delete" after the `<time>` element
  - [x] `aria-label="Delete {todo.text}"` for accessibility
  - [x] `disabled` when `pendingAction !== null` (any pending action disables delete)
  - [x] `onClick` calls `onDelete(todo.id)`
  - [x] Style with new `.deleteButton` class in `TodoItem.module.css`

- [x] Task 3: Style the Delete button (AC: #1)
  - [x] Add `.deleteButton` to `TodoItem.module.css`
  - [x] Minimal styling: semantic token colors, small font size, no heavy visuals
  - [x] Disabled state: opacity 0.6, cursor not-allowed (consistent with existing disabled patterns)
  - [x] The existing `.pending` class on the row already handles opacity + pointer-events: none during pending

- [x] Task 4: Wire `deleteTodo` through `TodoList` to `TodoItem` (AC: #1, #2, #3)
  - [x] Add `onDelete` prop to `TodoListProps` in `TodoList.tsx`
  - [x] Pass `onDelete` to each `<TodoItem>`
  - [x] In `App.tsx`: destructure `deleteTodo` from `useTodos()` and pass it to `<TodoList onDelete={deleteTodo}>`

- [x] Task 5: Update `TodoItem.test.tsx` unit tests (AC: #1, #2, #3)
  - [x] Add `onDelete` mock (`vi.fn().mockResolvedValue(true)`) to all existing test renders
  - [x] Add tests for delete button:
    - Renders a Delete button with accessible label
    - Delete button calls `onDelete(todo.id)` on click
    - Delete button is disabled when `pendingAction` is set
    - Delete button is disabled during delete (covers pending state)

- [x] Task 6: Create `App.delete-todo.test.tsx` integration tests (AC: #1, #2, #3)
  - [x] Follow existing pattern from `App.toggle-todo.test.tsx`
  - [x] Setup: `fetchMock.get("/todos", { todos: TODO_FIXTURES })`, `fetchMock.delete("express:/todos/:id", 204)`
  - [x] Test: clicking Delete shows pending state and row remains visible
  - [x] Test: on success, the todo is removed from the list
  - [x] Test: on failure, the todo remains visible and error banner is shown
  - [x] Test: on network error, the todo remains visible and error banner is shown
  - [x] Use `createDeferred` for timing control (same pattern as toggle tests)

- [x] Task 7: Add E2E tests for delete flow (AC: #1, #2, #3)
  - [x] Add `test.describe("delete todo flow", ...)` in `todo-flows.spec.ts`
  - [x] Test: clicking Delete removes the todo from the list (happy path)
  - [x] Test: on API failure, todo remains visible and error banner is shown

- [x] Task 8: Run all validation gates
  - [x] `npm run type:check` passes
  - [x] `npm run biome:check` passes
  - [x] `npm run test:ci` passes
  - [x] `npm run test:e2e` passes

### Review Findings

- [x] [Review][Patch] Untyped error response body in `deleteTodo` — `response.json()` returns implicit `any`; other mutations use `as ApiResponses<...>` type assertions [useTodos.ts:230]
- [x] [Review][Defer] 404 on already-deleted todo loops forever — cross-tab scenario where 404 is not distinguished from 500; pre-existing UX gap, out of scope
- [x] [Review][Defer] `pendingAction` is an untyped magic string — `"delete"`, `"edit"`, `"toggle"` not validated against union type; pre-existing pattern

## Dev Notes

### Critical: Non-Optimistic Delete Pattern

This story uses a **server-confirms-first** pattern, NOT the optimistic pattern from Story 2.3 (toggle). The todo row must remain visible until the API returns 204. This is an intentional UX decision per the PRD/UX spec (UX-DR10: "delete is not optimistic — row removed only after API success").

Do NOT reuse `patchTodo()`. Write a separate `deleteTodo()` function since:
- DELETE uses a different HTTP method (DELETE, not PATCH)
- DELETE returns 204 with no body (cannot parse response as JSON)
- Delete removes the item from state rather than updating it
- No rollback needed — state doesn't change optimistically

### Implementation Pattern for `deleteTodo`

```typescript
async function deleteTodo(id: string): Promise<boolean> {
  setError(null);
  setPendingActions((prev) => ({ ...prev, [id]: "delete" }));

  function clearPending(): void {
    setPendingActions((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
  }

  try {
    const response = await fetch(`/todos/${id}`, { method: "DELETE" });

    if (!response.ok) {
      let message = GENERIC_MUTATION_ERROR_MESSAGE;
      try {
        const body = await response.json();
        if (body.message) message = body.message;
      } catch { /* fall back to generic */ }
      setError(message);
      clearPending();
      return false;
    }

    setTodos((prev) => prev.filter((t) => t.id !== id));
    clearPending();
    return true;
  } catch {
    setError(GENERIC_MUTATION_ERROR_MESSAGE);
    clearPending();
    return false;
  }
}
```

Key differences from `patchTodo`:
- No optimistic state change before request
- No snapshot/rollback logic
- No request body or Content-Type header
- Successful response: filter todo out of state (don't parse body — 204 has none)
- Error response: try to parse body for message (API returns JSON error body on 4xx/5xx)

### Delete Button in TodoItem

Add the button after the `<time>` element in the JSX:

```tsx
<button
  type="button"
  className={styles.deleteButton}
  onClick={() => onDelete(todo.id)}
  disabled={isPending}
  aria-label={`Delete ${todo.text}`}
>
  Delete
</button>
```

The existing `.pending` class on the `<li>` already applies `pointer-events: none` and `opacity: 0.6` to the entire row during any pending action, so the delete button inherits that visual feedback. The `disabled` attribute provides explicit HTML-level disabling.

### CSS for Delete Button

Add to `TodoItem.module.css`:
```css
.deleteButton {
  padding: 4px 8px;
  font-size: 13px;
  border: 1px solid var(--s-border);
  border-radius: 4px;
  background: var(--s-bg);
  color: var(--s-text);
  cursor: pointer;
  flex-shrink: 0;
}

.deleteButton:hover:not(:disabled) {
  border-color: var(--s-border-error);
  color: var(--s-text-error);
}

.deleteButton:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
```

### Component Prop Threading

Changes to wire `deleteTodo` through:

1. **`useTodos.ts`** — add `deleteTodo` to the hook return type and implementation
2. **`App.tsx`** — destructure `deleteTodo` from `useTodos()`, pass as `onDelete={deleteTodo}` to `<TodoList>`
3. **`TodoList.tsx`** — add `onDelete` to `TodoListProps`, pass to each `<TodoItem onDelete={onDelete}>`
4. **`TodoItem.tsx`** — add `onDelete` to `TodoItemProps`, render Delete button

### Test Patterns

**Unit tests (`TodoItem.test.tsx`):**
- All existing test renders need `onDelete: vi.fn().mockResolvedValue(true)` added to props
- New describe block for delete button visibility, click behavior, and disabled state

**Integration tests (`App.delete-todo.test.tsx`):**
- Follow `App.toggle-todo.test.tsx` structure exactly
- Mock: `fetchMock.delete("express:/todos/:id", 204)` for success
- Mock: `fetchMock.delete("express:/todos/:id", { status: 500, body: { message: "Server error" } })` for failure
- Use `createDeferred` + `fetchMock.delete("express:/todos/:id", () => deferred.promise.then(...))` for timing control
- Key assertion: after clicking Delete and before resolve, the todo row is still visible (non-optimistic proof)
- Key assertion: after resolve with 204, `queryByText("Buy milk")` returns null (removed)
- Key assertion: after resolve with error, `getByText("Buy milk")` still present + `getByRole("alert")` visible

**E2E tests (`todo-flows.spec.ts`):**
- Create a todo, then click Delete, verify it disappears
- Use `page.route` to intercept DELETE with 500, verify error banner and todo still visible

### fetchMock for DELETE 204

`fetch-mock` returns 204 with: `fetchMock.delete("express:/todos/:id", 204)` — this sends a 204 response with no body. For the test that verifies the todo is not in the response after delete, the GET mock should already handle that since the test state is managed by the hook (filtering on success).

### Existing Patterns to Follow

- **Hook file** — [packages/web/src/hooks/useTodos.ts](packages/web/src/hooks/useTodos.ts): add `deleteTodo` alongside existing mutations, follow `clearPending` pattern from `patchTodo`
- **Component file** — [packages/web/src/components/TodoItem.tsx](packages/web/src/components/TodoItem.tsx): add button in the JSX return, add prop to type
- **List component** — [packages/web/src/components/TodoList.tsx](packages/web/src/components/TodoList.tsx): thread new prop through
- **App** — [packages/web/src/App.tsx](packages/web/src/App.tsx): destructure and pass
- **Unit tests** — [packages/web/src/components/TodoItem.test.tsx](packages/web/src/components/TodoItem.test.tsx): add `onDelete` mock to all renders
- **Integration tests** — [packages/web/src/App.toggle-todo.test.tsx](packages/web/src/App.toggle-todo.test.tsx): follow structure for `App.delete-todo.test.tsx`
- **E2E tests** — [packages/web/e2e/todo-flows.spec.ts](packages/web/e2e/todo-flows.spec.ts): add describe block following toggle flow pattern
- **CSS** — [packages/web/src/components/TodoItem.module.css](packages/web/src/components/TodoItem.module.css): add `.deleteButton` class
- **Test utils** — [packages/web/src/test-utils/index.ts](packages/web/src/test-utils/index.ts): use existing `createDeferred` and `TODO_FIXTURES`
- **Contracts** — [packages/web/src/contracts.ts](packages/web/src/contracts.ts): `TODO_BY_ID_API_PATH` already exists for `/todos/{id}`

### Anti-Patterns to Avoid

- Do NOT use optimistic removal — this is explicitly non-optimistic (UX-DR10)
- Do NOT reuse `patchTodo()` — DELETE is a fundamentally different operation
- Do NOT try to parse JSON body on 204 success — there is no body
- Do NOT add a confirmation dialog — PRD explicitly says "no confirmation dialog in MVP"
- Do NOT send Content-Type header on DELETE requests — there is no body
- Do NOT add `deletedAt` filtering on the frontend — the server already excludes deleted todos from GET /todos

### Project Structure Notes

- All changes are in `packages/web` (UI-only story, API was done in Story 2.4)
- No new directories needed
- New files: `packages/web/src/App.delete-todo.test.tsx`
- Modified files: `useTodos.ts`, `TodoItem.tsx`, `TodoItem.module.css`, `TodoList.tsx`, `App.tsx`, `TodoItem.test.tsx`, `todo-flows.spec.ts`

### Previous Story Intelligence (Story 2.4)

Key learnings from Story 2.4:
- DELETE API endpoint returns `204 No Content` with no body — confirmed working
- `deleteTodoInDatabase` uses `where(and(eq, isNull))` — already-deleted todos return 404
- OpenAPI spec and web types already include the DELETE endpoint (`paths["/todos/{id}"]["delete"]`)
- API error responses on 404 include `{ code: "NOT_FOUND", message: "Todo not found", requestId }` — can be displayed in error banner

### Git Intelligence

Recent commits:
- `6713da3 feat: story 2.4` — DELETE API endpoint (latest)
- `4a3a280 refactor: move mockGlobal to beforeEach, import fetchMock directly` — test refactoring pattern
- `d7b66bc refactor: drop mock helpers, use fetch-mock directly in tests` — fetch-mock used directly, no wrappers
- `819b0ac feat: implement story 2.3` — toggle completion with optimistic UI (contrast with this story's non-optimistic approach)
- Commit convention: `feat: story X.Y` or `feat: implement story X.Y`

### References

- [Source: epics.md#Story 2.5] — Acceptance criteria and non-optimistic delete requirement
- [Source: epics.md#Epic 2 Retrospective Learnings] — "Story 2.5 (delete) waits for server confirmation"
- [Source: ux-design-specification.md#Delete Todo] — "Remove row only when API confirms delete"
- [Source: architecture.md#Frontend Architecture] — Delete: not optimistic
- [Source: architecture.md#API & Communication Patterns] — `DELETE /todos/:id -> 204 No Content`
- [Source: project-context.md] — Testing practices, AAA pattern, nested describe/it blocks, fetch-mock directly
- [Source: 2-4-*.md] — Previous story: DELETE API endpoint implementation details

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6 (1M context)

### Debug Log References

- E2E tests required `exact: true` on `getByRole("button")` queries to avoid matching Delete buttons alongside text buttons

### Completion Notes List

- Implemented non-optimistic `deleteTodo` in `useTodos` hook — sets pending state, sends DELETE, removes from state only on 204 success
- Added Delete button to `TodoItem` with accessible label and disabled state during any pending action
- Styled `.deleteButton` with semantic tokens and hover/disabled states
- Wired `onDelete` prop through `TodoList` to `TodoItem` via `App`
- Added 4 unit tests for delete button in `TodoItem.test.tsx`
- Created `App.delete-todo.test.tsx` with 4 integration tests covering pending state, success removal, API failure, and network error
- Added 2 E2E tests for delete happy path and failure path
- Fixed existing E2E button selectors with `exact: true` to avoid ambiguity with new Delete buttons
- All validation gates pass: type:check, biome:check, test:ci, test:e2e

### Change Log

- 2026-03-31: Implemented story 2.5 — delete from UI with non-optimistic removal

### File List

- `packages/web/src/hooks/useTodos.ts` (modified) — added `deleteTodo` function and export
- `packages/web/src/components/TodoItem.tsx` (modified) — added `onDelete` prop and Delete button
- `packages/web/src/components/TodoItem.module.css` (modified) — added `.deleteButton` styles
- `packages/web/src/components/TodoList.tsx` (modified) — added `onDelete` prop threading
- `packages/web/src/App.tsx` (modified) — destructured and passed `deleteTodo`
- `packages/web/src/components/TodoItem.test.tsx` (modified) — added `onDelete` mock and delete button tests
- `packages/web/src/App.delete-todo.test.tsx` (new) — integration tests for delete flow
- `packages/web/e2e/todo-flows.spec.ts` (modified) — added delete flow E2E tests, fixed button selectors with `exact: true`
