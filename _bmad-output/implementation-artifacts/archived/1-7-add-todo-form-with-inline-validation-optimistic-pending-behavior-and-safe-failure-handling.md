# Story 1.7: Add todo form with inline validation, optimistic/pending behavior, and safe failure handling

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a user,
I want to add a todo from the main screen with immediate feedback,
so that capturing tasks feels frictionless.

## Acceptance Criteria

1. **Given** the add input is visible
   **When** I submit empty/whitespace-only text
   **Then** the UI shows an inline validation message near the input
   **And** the input value is preserved

2. **Given** I submit text longer than the max
   **When** validation runs
   **Then** the UI shows an inline validation message indicating the length constraint
   **And** the input value is preserved

3. **Given** I submit valid text
   **When** the create request is in flight
   **Then** the UI shows a pending state (either a temporary row or a saving indicator)

4. **Given** the create request succeeds
   **When** the response returns
   **Then** the new todo appears in the list (newest-first)
   **And** focus returns to the add input

5. **Given** the create request fails due to network/server error
   **When** the failure is received
   **Then** the UI shows a global error banner describing that the change didn't save
   **And** the UI does not leave a ghost todo in the list
   **And** the user-entered text is preserved for retry

## Tasks / Subtasks

- [x] Create `AddTodoForm` component with inline validation (AC: 1, 2)
  - [x] Create `src/web/src/components/AddTodoForm.tsx` with co-located `AddTodoForm.module.css`
  - [x] Render a single-line text input + "Add" submit button inside a `<form>`
  - [x] On submit: trim input, validate against empty/whitespace-only and `MAX_TODO_TEXT_LENGTH` (from `contracts.ts`)
  - [x] Show inline validation message below the input when invalid; preserve typed text
  - [x] Clear inline validation on next input change
  - [x] Accept `onSubmit: (text: string) => Promise<boolean>` prop (returns true on success, false on failure)
  - [x] On successful submit: clear input and refocus the text input
  - [x] On failed submit: preserve input text (do not clear)
  - [x] Show a disabled/pending state on the submit button while the create request is in flight
  - [x] Use `MAX_TODO_TEXT_LENGTH` from `contracts.ts` for the constraint value in the validation message

- [x] Extend `useTodos` hook with `createTodo` mutation (AC: 3, 4, 5)
  - [x] Add a `createTodo(text: string): Promise<boolean>` function to the hook return
  - [x] POST to `TODOS_API_PATH` with `{ text }` body, `Content-Type: application/json`
  - [x] On success: prepend the returned `Todo` to the `todos` array (newest-first), return `true`
  - [x] On failure: set `error` with a user-friendly message ("Couldn't save changes. Please try again."), return `false`
  - [x] Do NOT add an optimistic temporary row — just show the form's pending state during the request
  - [x] Clear any previous error state when starting a new create request

- [x] Integrate `AddTodoForm` into `App.tsx` layout (AC: 1–5)
  - [x] Import and render `AddTodoForm` between the global error banner and the `TodoList`
  - [x] Wire `createTodo` from `useTodos` to the form's `onSubmit` prop
  - [x] The existing `GlobalErrorBanner` already handles mutation errors via `useTodos.error`

- [x] Add component and integration tests (AC: 1–5)
  - [x] Add `AddTodoForm` unit tests in `src/web/src/components/AddTodoForm.test.tsx`
    - [x] Empty/whitespace submission shows inline validation, preserves input
    - [x] Too-long submission shows inline validation with length constraint, preserves input
    - [x] Valid submission calls onSubmit, shows pending/disabled button
    - [x] Successful submission clears input and refocuses
    - [x] Failed submission preserves input text
    - [x] Inline validation clears on next input change
  - [x] Update `App.test.tsx` with integration tests for the create flow
    - [x] Successful create: mock POST success, verify new todo appears in list, input cleared
    - [x] Failed create: mock POST failure, verify global error banner shown, input preserved, no ghost row
    - [x] Validation: verify inline validation appears for empty/too-long input without network call

### Review Findings

- [x] [Review][Patch] Missing `Content-Type: application/json` header on POST request [src/web/src/hooks/useTodos.ts:78] — fixed
- [x] [Review][Patch] Unhandled rejection in `onSubmit` leaves form permanently disabled [src/web/src/components/AddTodoForm.tsx:43-45] — fixed

- [x] Run project validation gates before handoff
  - [x] `npm run type:check`
  - [x] `npm run biome:check`
  - [x] `npm run test:ci`

## Dev Notes

### Story Scope and Intent

- This is the second web UI story. It adds the create flow on top of the read-only list from Story 1.6.
- Scope is **add form + inline validation + create mutation + failure handling**. Inline edit (Story 2.2), toggle (Story 2.3), and delete (Story 2.5) are out of scope.
- The `useTodos` hook created in Story 1.6 must be extended — not replaced — with a `createTodo` function.
- The `GlobalErrorBanner` from Story 1.6 is reused as-is for mutation errors.

### Current Web Baseline (from Story 1.6)

- `App.tsx` renders: `<h1>Todos</h1>` -> optional `GlobalErrorBanner` -> `TodoList`
- `useTodos` hook exposes: `{ todos, loading, error, retry }` — fetch-only, no mutations
- `contracts.ts` exports: `TODOS_API_PATH`, `ApiResponses`, `MAX_TODO_TEXT_LENGTH`
- `api/helpers.ts` exports: `ApiResponseBody`, `ApiResponses` (TypeScript types only, no runtime helpers)
- `api/generated/index.ts` has OpenAPI-generated types including POST /todos request/response shapes
- Tests use `vi.stubGlobal("fetch", ...)` with mock response objects, `waitFor()`, role-based selectors
- Vite dev proxy forwards `/todos` to `http://localhost:3000`

### API Contract for POST /todos (from Story 1.5)

- **Request:** `POST /todos` with `Content-Type: application/json`, body `{ "text": "..." }`
- **Success (200):** returns `Todo` object with `id`, `text`, `completed`, `createdAt`, `updatedAt`, `deletedAt`
- **Validation error (400):** `{ code: "VALIDATION_ERROR", message: "...", requestId: "..." }`
  - Empty/whitespace text: message "Text must not be empty"
  - Too long text: message "Text must not exceed 200 characters"
- **Server error (500):** `{ code: "INTERNAL_ERROR", message: "...", requestId: "..." }`

### Architecture Compliance Guardrails (must follow)

- **State management:** React built-ins only (`useState`, `useCallback`). No external state libraries.
- **Data fetching:** Plain `fetch`. No axios or other HTTP libraries.
- **Styling:** CSS Modules (`*.module.css` co-located with components). No UI kits, no Tailwind.
- **Validation:** Client-side validation uses `MAX_TODO_TEXT_LENGTH` from `@bmad-todo/shared` via `contracts.ts`. Trim input before validation.
- **Error surface:** `GlobalErrorBanner` for network/server failures; inline validation message for input errors.
- **UX non-negotiables:**
  - Never clear typed text on validation or network failure
  - After successful add, focus returns to the add input
  - No ghost todos: do not add an item to the list that the server hasn't confirmed
- **Component file naming:** `PascalCase.tsx` with co-located `PascalCase.module.css`.
- **Function declarations** for named/exported functions (not arrow functions), per project-context.md.
- **No `any` type.** Use `unknown` if needed.

### Component Architecture

```
src/web/src/
├── App.tsx                        # Composes: GlobalErrorBanner + AddTodoForm + TodoList
├── hooks/
│   └── useTodos.ts                # Extended with createTodo()
├── components/
│   ├── AddTodoForm.tsx            # NEW: text input + submit + inline validation
│   ├── AddTodoForm.module.css     # NEW
│   ├── AddTodoForm.test.tsx       # NEW: unit tests
│   ├── GlobalErrorBanner.tsx      # Existing (no changes expected)
│   ├── GlobalErrorBanner.module.css
│   ├── TodoList.tsx               # Existing (no changes expected)
│   └── TodoList.module.css
```

### UX Copy Guidance (from UX spec)

- **Empty/whitespace validation:** "Todo text must not be empty."
- **Too-long validation:** "Todo text must be between 1 and 200 characters." (use `MAX_TODO_TEXT_LENGTH` for the value)
- **Mutation failure banner:** "Couldn't save changes. Please try again."
- **Form layout:** input + "Add" button, inline validation below input
- **After successful add:** clear input, return focus to input, new todo at top of list

### Implementation Guidance

**AddTodoForm component:**
- Use a `<form>` element with `onSubmit` handler (supports both button click and Enter key)
- Track local state: `text` (string), `validationError` (string | null), `submitting` (boolean)
- On submit: `e.preventDefault()`, trim text, validate, call `onSubmit(trimmedText)`, handle result
- The `onSubmit` prop returns a Promise<boolean> — `true` means success (clear input + refocus), `false` means server error (preserve input)
- Use a ref on the input for focus management after successful submit
- Disable the "Add" button while `submitting` is true

**useTodos hook extension:**
- Add `createTodo` to the returned object
- Implementation: `fetch(TODOS_API_PATH, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text }) })`
- On success: parse response as `Todo`, prepend to `todos` state array
- On failure: parse `ApiErrorResponse` for message or fall back to "Couldn't save changes. Please try again."
- Clear `error` at the start of `createTodo` to dismiss any previous error banner

**Accessibility:**
- Input must have an accessible label (use `<label>` or `aria-label`)
- Validation message should use `aria-live="polite"` or be associated via `aria-describedby`
- Submit button text: "Add"

### Previous Story Intelligence (Story 1.6)

- `useTodos` hook uses `useState`/`useEffect`/`useCallback` — extend with same patterns
- Tests mock `fetch` globally with `vi.stubGlobal("fetch", mockFetch)` and use `waitFor()` for async assertions
- Test fixtures use full `Todo` objects with all fields (id, text, completed, createdAt, updatedAt, deletedAt)
- Biome auto-fix was needed for import formatting — run `npm run biome:fix` if biome:check fails
- Explicit `cleanup()` in `afterEach` is required (no vitest `globals: true`)
- `@testing-library/user-event` is not installed; use `fireEvent` from `@testing-library/react`

### Git Intelligence Summary

- `feat: implement story 1.6`: Added TodoList screen with loading/empty/error states, useTodos hook, GlobalErrorBanner, Vite dev proxy, 9 web tests
- `feat: implement story 1.5`: Added POST /todos API endpoint with validation, updated error handler, OpenAPI spec

### Testing Requirements

- Vitest + React Testing Library with `@testing-library/jest-dom` matchers
- Mock `fetch` globally with `vi.stubGlobal("fetch", ...)` (same pattern as Story 1.6 tests)
- Follow project test conventions: nested `describe` > `it`, AAA pattern, explicit `expect(...)` assertions
- Use `fireEvent` (not `userEvent` — not installed) for form interaction
- Use `waitFor()` for async assertions after mutation calls
- Ensure `cleanup()` is called in `afterEach`

### Cross-Story Dependencies

- **Story 2.2** (inline edit) will add edit capability to `TodoItem` rows within `TodoList`
- **Story 2.3** (toggle complete) will add toggle mutation to `useTodos` and interactive checkboxes
- **Story 2.5** (delete) will add delete mutation to `useTodos` and delete buttons to rows
- The `useTodos` hook will be further extended in all of these stories

### File Structure Requirements

New files:
- `src/web/src/components/AddTodoForm.tsx`
- `src/web/src/components/AddTodoForm.module.css`
- `src/web/src/components/AddTodoForm.test.tsx`

Modified files:
- `src/web/src/hooks/useTodos.ts` (add `createTodo` function)
- `src/web/src/App.tsx` (integrate `AddTodoForm`)
- `src/web/src/App.test.tsx` (add create flow integration tests)

### Project Structure Notes

- All new files follow the established component pattern from Story 1.6
- No new directories needed — components go in `src/web/src/components/`, tests co-located
- No architecture conflicts detected

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story 1.7]
- [Source: _bmad-output/planning-artifacts/architecture.md#Frontend Architecture]
- [Source: _bmad-output/planning-artifacts/architecture.md#API & Communication Patterns]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Create Todo]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Global Error Element]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Focus Management]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#UX Consistency Rules]
- [Source: project-context.md#Testing Practices]
- [Source: project-context.md#Coding Practices]
- [Source: _bmad-output/implementation-artifacts/1-6-build-the-todo-list-screen-with-load-states-and-retry.md#Completion Notes List]
- [Source: _bmad-output/implementation-artifacts/1-6-build-the-todo-list-screen-with-load-states-and-retry.md#Dev Agent Record]

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6 (1M context)

### Debug Log References

- Focus management required `useEffect` + `shouldFocus` state flag because React 18 batches state updates, causing `inputRef.current?.focus()` to fire while the input was still disabled in the DOM.

### Completion Notes List

- Created `AddTodoForm` component with `<form>`, text input, "Add" button, inline client-side validation (empty/whitespace and max length), pending/disabled state, and focus management on success.
- Extended `useTodos` hook with `createTodo(text)` mutation: POST to `/todos`, prepend on success, set error on failure, clears previous error before each attempt.
- Integrated `AddTodoForm` into `App.tsx` between GlobalErrorBanner and TodoList.
- Added 8 unit tests for AddTodoForm (validation, pending state, success/failure behavior, validation clearing).
- Added 4 integration tests in App.test.tsx for create flow (success, failure with error banner, empty validation, too-long validation).
- All 31 tests pass (21 web + 10 API). Type check and biome check clean.

### Change Log

- 2026-03-29: Implemented story 1.7 — AddTodoForm component, createTodo mutation in useTodos hook, App.tsx integration, 12 new tests.
- 2026-03-29: Refactored App integration tests — split by feature, extracted shared test-utils barrel.

### File List

New files:
- src/web/src/components/AddTodoForm.tsx
- src/web/src/components/AddTodoForm.module.css
- src/web/src/components/AddTodoForm.test.tsx
- src/web/src/App.create-todo.test.tsx
- src/web/src/test-utils/index.ts

Modified files:
- src/web/src/hooks/useTodos.ts
- src/web/src/App.tsx
- src/web/src/App.test.tsx
- project-context.md
- _bmad-output/planning-artifacts/architecture.md
