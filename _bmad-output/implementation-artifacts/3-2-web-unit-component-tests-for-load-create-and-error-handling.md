# Story 3.2: Web unit/component tests for load, create, and error handling

Status: done

## Story

As a maintainer,
I want web tests for the core screen states and interactions,
So that regressions in UX and failure handling are caught early.

## Acceptance Criteria

1. **Network-boundary mocking with fetch-mock**
   - Given `@fetch-mock/vitest` intercepts HTTP requests at the network boundary
   - When I run web tests
   - Then no real network requests are made

2. **Core screen state coverage**
   - Given the web test suite runs
   - When it exercises load and create flows
   - Then tests cover: initial load success, initial load failure with Retry, empty state, create validation (empty/too-long title), create success, and create failure showing global error

## Tasks / Subtasks

- [x] Task 1: Audit existing web test coverage against AC (AC: #2)
  - [x] Read all `*.test.tsx` files in `packages/web/src/` and catalog every test case
  - [x] Map each test case to the AC #2 requirements: load success, load failure + Retry, empty state, create validation, create success, create failure + global error
  - [x] Identify gaps: missing scenarios from AC that have no corresponding test
  - [x] Document findings as a checklist of gaps to fill

- [x] Task 2: Fill identified test gaps (AC: #1, #2)
  - [x] For each gap found in Task 1, add or update the appropriate test file
  - [x] Follow existing patterns: App-level integration tests go in `App.<feature>.test.tsx` files
  - [x] Component-level tests go next to the component (e.g., `AddTodoForm.test.tsx`)
  - [x] Ensure all new tests use `@fetch-mock/vitest` for network mocking (not MSW)

- [x] Task 3: Run validation gates
  - [x] `npm run type:check` passes
  - [x] `npm run biome:check` passes
  - [x] `npm run test:ci` passes
  - [x] `npm run test:e2e` passes

## Dev Notes

### Critical Context: Most Coverage Already Exists

The epic note explicitly states: **"Make sure we integrate tests with existing ones. Most of this story requirements might be already implemented."**

The existing web test suite already has extensive coverage. **Start by auditing (Task 1) before writing any code.** The primary value of this story is to confirm comprehensive coverage exists, fill any gaps, and ensure consistency.

### Existing Test Files (9 files)

| File                                                 | Scope                                                   |
| ---------------------------------------------------- | ------------------------------------------------------- |
| `packages/web/src/App.test.tsx`                      | Load states: loading, empty, list, error banner + retry |
| `packages/web/src/App.create-todo.test.tsx`          | Create flow: success, failure, validation               |
| `packages/web/src/App.delete-todo.test.tsx`          | Delete flow: pending, success, failure                  |
| `packages/web/src/App.edit-todo.test.tsx`            | Edit flow: Ctrl+Enter save, Escape cancel               |
| `packages/web/src/App.toggle-todo.test.tsx`          | Toggle completion: optimistic + rollback                |
| `packages/web/src/App.mutation-concurrency.test.tsx` | Concurrent mutations                                    |
| `packages/web/src/components/AddTodoForm.test.tsx`   | Form component: validation, submission                  |
| `packages/web/src/components/TodoItem.test.tsx`      | Item component: edit, toggle, delete                    |
| `packages/web/src/utils/http-client.test.ts`         | HTTP client: GET/POST/PATCH/DELETE, error handling      |

### Test Infrastructure

- **Framework**: Vitest with jsdom environment
- **Config**: `packages/web/vitest.config.ts` — restoreMocks, mockReset, unstubGlobals enabled
- **Setup**: `packages/web/vitest.setup.ts` — imports `@testing-library/jest-dom`, sets up `@fetch-mock/vitest` globally, runs `cleanup()` after each test
- **Network mocking**: `@fetch-mock/vitest` (NOT MSW, despite architecture doc mentioning MSW — the project chose fetch-mock instead)
- **User interaction**: `@testing-library/user-event` for keyboard interactions, `fireEvent` for simple events
- **Async control**: `Deferred` utility from `test-utils/deferred.ts` for controlling promise resolution timing

### Test Utilities Barrel

All test utilities imported from `packages/web/src/test-utils/index.ts`:

- `TODO_FIXTURES` — array of 2 sample todos (from `fetch-mocks.ts`)
- `createDeferred<T>()` — creates controllable promise for async test timing (from `deferred.ts`)

### Key Dependencies

```
@fetch-mock/vitest: 0.2.18
@testing-library/react: 16.3.2
@testing-library/dom: 10.4.1
@testing-library/jest-dom: 6.9.1
@testing-library/user-event: 14.6.1
vitest: 4.1.2
jsdom: 26.0.0
```

### Test Patterns to Follow

- **App integration tests**: split by feature into `App.<feature>.test.tsx` files
- **Query strategy**: prefer `getByRole`, `getByLabelText`, `getByText` — query by accessible semantics, not implementation
- **Async assertions**: use `waitFor()` for async state updates
- **Mock setup**: `fetchMock.get/post/patch/delete()` in `beforeEach` or per-test
- **Deferred promises**: use `createDeferred()` to control timing for testing loading/pending states
- **AAA pattern**: Arrange → Act → Assert with blank line separation
- **Nested describe/it**: conditions in `describe`, outcomes in `it`

### AC-to-Existing-Test Mapping (Preliminary)

This mapping should be verified during Task 1 audit:

| AC Requirement                | Likely Covered In                                        |
| ----------------------------- | -------------------------------------------------------- |
| Initial load success          | `App.test.tsx` — renders todo list                       |
| Initial load failure + Retry  | `App.test.tsx` — error banner + retry                    |
| Empty state                   | `App.test.tsx` — empty state message                     |
| Create validation (empty)     | `App.create-todo.test.tsx` and/or `AddTodoForm.test.tsx` |
| Create validation (too long)  | `AddTodoForm.test.tsx`                                   |
| Create success                | `App.create-todo.test.tsx` — new todo appears            |
| Create failure + global error | `App.create-todo.test.tsx` — error banner                |

Most or all AC items appear to be covered. The audit will confirm and identify any gaps.

### Anti-Patterns to Avoid

- Do NOT install MSW — the project uses `@fetch-mock/vitest` for network mocking
- Do NOT duplicate the global `cleanup()` or `fetchMock` setup from `vitest.setup.ts`
- Do NOT add new test utilities outside `packages/web/src/test-utils/` barrel
- Do NOT change existing test structure — extend it
- Do NOT write exhaustive permutation tests — keep tested scenarios to a reasonable minimum
- Do NOT test implementation details — test observable behavior (rendered output, user interactions)
- Do NOT create top-level `it()` blocks — always nest inside `describe`

### Previous Story Intelligence (Story 3.1)

- Story 3.1 was an audit-first story: read existing tests, map to AC, fill gaps. Same approach applies here.
- Story 3.1 found most API test coverage already existed from Story 3.0 updates — expect the same for web tests.
- Key learning: `deletedAt` uses `undefined` (not `null`) in the API layer. Ensure any new web test fixtures reflect this.
- Story 3.1 added only 5 new test cases across 4 files — minimal delta expected here too.

### Git Intelligence

Recent commits show:

- `a00b800 refactor: story 3.1` — latest, just completed API test audit
- `75cbc3d refactor: remove unnecessary null coercions in DB layer`
- `be26144 refactor: replace deletedAt null with undefined across the stack`
- `f2ec610 feat: story 3.0` — title/text schema change that updated all existing tests

The `deletedAt: null → undefined` refactor and title/text schema change are already reflected in the current test suite.

### Data Model Context

The Todo model has:

- `id: string` (UUID)
- `title: string` (required, 1-100 chars via `MAX_TODO_TITLE_LENGTH`)
- `text: string` (optional description, 1-500 chars via `MAX_TODO_TEXT_LENGTH`)
- `completed: boolean`
- `createdAt: string` (ISO date-time)
- `updatedAt: string` (ISO date-time)
- `deletedAt?: string` (ISO date-time, undefined when not deleted)

### Project Structure Notes

- All changes confined to `packages/web/src/` directory
- No new component files expected — only test file additions/modifications
- Test utilities imported from `packages/web/src/test-utils/index.ts`
- App integration tests follow `App.<feature>.test.tsx` naming convention

### References

- [Source: epics.md#Story 3.2] — Acceptance criteria
- [Source: architecture.md#Testing Strategy & Tooling] — Web unit/component test strategy
- [Source: architecture.md#Test & Local Data Reset] — Determinism rules
- [Source: architecture.md#Frontend Architecture] — State management, error surface patterns
- [Source: 3-1-*.md] — Previous story audit-first approach, minimal delta finding
- [Source: project-context.md#Testing] — AAA pattern, nested describe/it, minimal test coverage rule

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6 (1M context)

### Debug Log References

None — no issues encountered.

### Completion Notes List

- Audited all 9 existing web test files against AC #2 requirements
- All AC requirements fully covered by existing tests — zero gaps identified:
  - Initial load success: `App.test.tsx` — "renders todo items when todos are loaded"
  - Initial load failure + Retry: `App.test.tsx` — error banner tests + Retry button test
  - Empty state: `App.test.tsx` — "shows empty state message when no todos exist"
  - Create validation (empty): `App.create-todo.test.tsx` + `AddTodoForm.test.tsx`
  - Create validation (too-long): `App.create-todo.test.tsx` + `AddTodoForm.test.tsx`
  - Create success: `App.create-todo.test.tsx` — "adds the new todo to the list"
  - Create failure + global error: `App.create-todo.test.tsx` — "shows global error banner and preserves input"
- AC #1 (fetch-mock): All App-level integration tests use `@fetch-mock/vitest`; component tests use `vi.fn()` (no network calls needed)
- No code changes required — Task 2 was a no-op as predicted by dev notes and Story 3.1 learnings
- All validation gates pass: type:check, biome:check, test:ci (103 tests, 14 files), test:e2e (18 tests)

### Change Log

- 2026-04-04: Story completed — audit confirmed full existing coverage, no code changes needed

### File List

No files modified (audit-only story).
