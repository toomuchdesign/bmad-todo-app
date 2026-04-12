# Story 1.6: Build the Todo List screen with load states and retry

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a user,
I want to see a clear loading/empty/list state on one screen,
so that I always understand what's happening.

## Acceptance Criteria

1. **Given** I open the app
   **When** the initial todo load is in progress
   **Then** the UI shows a loading indicator in the list region
   **And** it does not show the empty state while loading

2. **Given** the initial todo load succeeds with an empty list
   **When** the UI renders
   **Then** it shows an empty state message prompting me to add my first todo

3. **Given** the initial todo load fails
   **When** the UI renders
   **Then** it shows a global error banner with a clear message
   **And** it includes a Retry action that attempts the load again

## Tasks / Subtasks

- [x] Replace the template App with the Todo List screen layout (AC: 1, 2, 3)
  - [x] Remove all Vite template content from `App.tsx` and `App.css`
  - [x] Implement the single-screen layout: title "Todos", global error region, list state region (loading | empty | list)
  - [x] Keep global base styles in `index.css` (update CSS custom properties as needed for the todo theme)

- [x] Create `useTodos` hook for data fetching and state management (AC: 1, 2, 3)
  - [x] Implement at `src/web/src/hooks/useTodos.ts`
  - [x] Manage state: `loading`, `error`, `todos` (typed as `Todo[]` from `@bmad-todo/shared`)
  - [x] Fetch `GET /todos` on mount using plain `fetch` via the Vite dev proxy
  - [x] Parse response as `{ todos: Todo[] }` on success
  - [x] On failure, capture a user-friendly error message from `ApiErrorResponse` or fall back to generic copy
  - [x] Expose a `retry` function that resets error state and re-fetches
  - [x] Use React built-ins only (`useState` / `useEffect`); no external state libraries

- [x] Create `GlobalErrorBanner` component (AC: 3)
  - [x] Implement at `src/web/src/components/GlobalErrorBanner.tsx`
  - [x] Accept `message` (string) and optional `onRetry` callback props
  - [x] Render a visible banner with the error message and a "Retry" button when `onRetry` is provided
  - [x] Use `role="alert"` for accessibility (screen reader announcement without stealing focus)
  - [x] Style with CSS Module (`GlobalErrorBanner.module.css`)

- [x] Create `TodoList` component for list/loading/empty states (AC: 1, 2)
  - [x] Implement at `src/web/src/components/TodoList.tsx`
  - [x] Accept `todos` (Todo[]), `loading` (boolean) props
  - [x] When `loading` is true, render a loading indicator (text or spinner) and do NOT show empty state
  - [x] When `loading` is false and `todos` is empty, render empty state: "No todos yet. Add your first one above."
  - [x] When `loading` is false and `todos` has items, render each todo as a read-only row showing: completion status (checkbox, disabled for now), text, and creation timestamp context
  - [x] Style with CSS Module (`TodoList.module.css`)

- [x] Configure Vite dev proxy to forward `/todos` to the API server (AC: 1, 2, 3)
  - [x] Add `server.proxy` in `vite.config.ts` to proxy `/todos` requests to `http://localhost:3000` (or the configured API port)
  - [x] This enables the web app to call `fetch("/todos")` without CORS issues during development

- [x] Update `App.test.tsx` and add component tests (AC: 1, 2, 3)
  - [x] Replace the existing template test in `App.test.tsx` with tests for the new Todo List screen
  - [x] Test loading state: verify loading indicator is shown initially
  - [x] Test empty state: mock a successful empty response, verify empty state message
  - [x] Test list state: mock a successful response with todos, verify todos render
  - [x] Test error + retry: mock a failed response, verify global error banner with retry button, click retry triggers re-fetch
  - [x] Use `vitest` with `@testing-library/react` and mock `fetch` (or use MSW if already available)
  - [x] Follow project test conventions: nested `describe` > `it`, AAA pattern, explicit assertions

- [x] Run project validation gates before handoff
  - [x] `npm run type:check`
  - [x] `npm run biome:check`
  - [x] `npm run test:ci`

### Review Findings

- [x] [Review][Defer] No AbortController — unmounted component calls setState, concurrent retry race [useTodos.ts] — deferred, not triggered in current MVP (no routing/unmount path)
- [x] [Review][Defer] Stale todos visible alongside error banner on retry failure [useTodos.ts] — deferred, latent issue (todos are [] on initial failure; matters when mutations added)
- [x] [Review][Defer] Retry button clickable during in-flight fetch (no debounce/disable) [useTodos.ts + App.tsx] — deferred, low impact for MVP single-screen
- [x] [Review][Defer] Dark mode error banner contrast may not meet WCAG [GlobalErrorBanner.module.css] — deferred, to be verified in accessibility story (3-4)

## Dev Notes

### Story Scope and Intent

- This is the first web UI story. It replaces the Vite template placeholder with the real Todo List screen.
- Scope is **read-only display + error/retry**. The add form (Story 1.7), inline edit (Story 2.2), toggle (Story 2.3), and delete (Story 2.5) are out of scope.
- TodoItem rows in this story should display todo text and completion status but interactive actions (edit, toggle, delete) are stubs or disabled until their respective stories.
- The `useTodos` hook created here will be extended in Story 1.7 to support create mutations.

### Current Web Baseline (from existing code)

- `App.tsx` is the Vite template placeholder (counter demo). It must be completely replaced.
- `App.css` contains template styles. Replace entirely with todo app styles.
- `index.css` has CSS custom properties and global reset. Preserve the approach but update variables as needed for the todo theme.
- `contracts.ts` already exports `TODOS_API_PATH = "/todos"`, `TodosResponse`, `TodosErrorResponse`, and `MAX_TODO_TEXT_LENGTH` from `@bmad-todo/shared`. Use these.
- `src/web/src/api/generated/index.ts` has generated API path types. Already wired.
- No Vite dev proxy is configured yet. The `vite.config.ts` only has the React plugin.

### API Response Shape (from Story 1.4/1.5)

The `GET /todos` endpoint returns:
- **Success (200):** `{ todos: Todo[] }` where each `Todo` has `id`, `text`, `completed`, `createdAt`, `updatedAt`, `deletedAt`
- **Error:** `ApiErrorResponse` with `code`, `message`, and optional `requestId`
- **Header:** `x-request-id` is always present on responses

The API is served by Fastify on the port specified in `src/api/.env` (default 3000).

### Architecture Compliance Guardrails (must follow)

- **State management:** React built-ins only (`useState`, `useEffect`, `useReducer`). No Redux, Zustand, or React Query.
- **Data fetching:** Plain `fetch` wrapped by a typed client or hook. Do not add axios or other HTTP libraries.
- **Styling:** CSS + CSS Modules (`*.module.css` co-located with components). No UI kits, no Tailwind.
- **Global error surface:** Single `GlobalErrorBanner` component for network/server failures, matching UX spec.
- **Never show empty state while loading** (UX non-negotiable).
- **Error banner uses `role="alert"`** for accessible announcement without focus steal.
- **Component file naming:** `PascalCase.tsx` with co-located `PascalCase.module.css`.
- **Function declarations** for named/exported functions (not arrow functions), per project-context.md.
- **No `any` type.** Use `unknown` if needed.

### Component Architecture (from architecture doc)

Per the architecture's project structure and UX component strategy:

```
src/web/src/
├── App.tsx                    # Root: composes GlobalErrorBanner + TodoList
├── hooks/
│   └── useTodos.ts            # State + fetch + retry logic
├── components/
│   ├── GlobalErrorBanner.tsx   # Error display with optional retry
│   ├── GlobalErrorBanner.module.css
│   ├── TodoList.tsx            # Loading/empty/list states
│   └── TodoList.module.css
└── styles/
    └── app.css                # App-level layout styles (replaces App.css)
```

### UX Copy Guidance (from UX spec)

- **Loading:** Show a loading indicator in the list region (e.g., "Loading..." text or a spinner)
- **Empty state:** "No todos yet." + "Add your first one above."
- **Load failure:** "Couldn't load todos. Check your connection and try again." + Retry button
- **Title:** "Todos"

### Fetch Implementation Guidance

- Use `TODOS_API_PATH` from `contracts.ts` for the URL (value: `"/todos"`)
- The Vite dev proxy will forward this to the API server, avoiding CORS issues
- Parse success response: `const data = await response.json()` then access `data.todos`
- Parse error response: try to read `ApiErrorResponse` from body for the `message` field; fall back to a generic message if parsing fails
- Handle network errors (fetch throws) with a generic "Couldn't load todos" message

### Previous Story Intelligence (Story 1.5)

- Story 1.5 was API-only (POST /todos). No web components were created.
- The `errorHandlerPlugin` now maps Fastify validation errors to `{ code: "VALIDATION_ERROR", message: "...", requestId: "..." }`.
- DB create helper and camelCase mapping patterns are established in `src/api/src/db/todos.ts`.
- API tests follow nested `describe` > `it` with AAA pattern — web tests should do the same.

### Git Intelligence Summary (recent commits)

- `feat: implement story 1.5`: Added POST /todos with validation, extended error handler, updated OpenAPI.
- `feat: implement story 1.4`: Added GET /todos with DB, request-id plugin, error-handler plugin, test infrastructure.
- The web workspace has not been modified since initial scaffolding (Story 1.1).

**Implication:** This is a greenfield story for the web workspace. All template content should be replaced. Follow patterns from API tests for test structure conventions.

### Testing Requirements

- Tests must use Vitest + React Testing Library with `@testing-library/jest-dom` matchers.
- Mock `fetch` globally (e.g., `vi.stubGlobal('fetch', ...)`) or use MSW. Since MSW is listed in the architecture for web tests, prefer MSW if it's already installed; otherwise, mocking `fetch` directly is acceptable for this story.
- Follow project test conventions from `project-context.md`:
  - Nested `describe` > `it` blocks (no top-level `it`)
  - AAA pattern (Arrange/Act/Assert) with blank line separation
  - Explicit `expect(...)` assertions on observable behavior
  - Use `@testing-library/react` `render`, `screen`, `waitFor`
- Tests to cover:
  - Loading state visible on initial render
  - Empty list renders empty state message
  - Populated list renders todo items
  - Error state renders GlobalErrorBanner with message and Retry button
  - Clicking Retry triggers a new fetch attempt

### Cross-Story Dependencies

- **Story 1.7** (add form) will compose `AddTodoForm` into the same `App.tsx` layout and extend `useTodos` with a `createTodo` function.
- **Story 2.2–2.5** (edit, toggle, delete) will add interactive behavior to `TodoItem` rows within `TodoList`.
- The `GlobalErrorBanner` created here will be reused for mutation errors in Stories 1.7, 2.2, 2.3, and 2.5.
- The `useTodos` hook created here is the foundation for all future state management.

### File Structure Requirements

New files:
- `src/web/src/hooks/useTodos.ts`
- `src/web/src/components/GlobalErrorBanner.tsx`
- `src/web/src/components/GlobalErrorBanner.module.css`
- `src/web/src/components/TodoList.tsx`
- `src/web/src/components/TodoList.module.css`

Modified files:
- `src/web/src/App.tsx` (complete rewrite)
- `src/web/src/App.css` (complete rewrite or rename to `styles/app.css`)
- `src/web/src/App.test.tsx` (complete rewrite)
- `src/web/vite.config.ts` (add dev proxy)

Files to potentially remove:
- `src/web/src/assets/hero.png`, `react.svg`, `vite.svg` (template assets no longer needed)

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story 1.6: Build the Todo List screen with load states and retry]
- [Source: _bmad-output/planning-artifacts/architecture.md#Frontend Architecture]
- [Source: _bmad-output/planning-artifacts/architecture.md#Project Structure & Boundaries]
- [Source: _bmad-output/planning-artifacts/architecture.md#Testing Strategy & Tooling]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Loading State]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Empty State]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Global Error Element]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Component Strategy]
- [Source: project-context.md#Testing Practices]
- [Source: project-context.md#Coding Practices]
- [Source: _bmad-output/implementation-artifacts/1-5-implement-post-todos-with-validation-and-stable-validation-errors.md#Completion Notes List]

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6 (1M context)

### Debug Log References

- Biome auto-fix needed for import formatting and import ordering
- `@testing-library/user-event` not installed; used `fireEvent` from `@testing-library/react` instead
- Explicit `cleanup()` required in `afterEach` because vitest `globals: true` is not set, preventing auto-cleanup

### Completion Notes List

- Replaced all Vite template content (App.tsx, App.css, index.css) with Todo List screen layout
- Created `useTodos` hook using `useState`/`useEffect`/`useCallback` for data fetching with loading/error/retry state
- Created `GlobalErrorBanner` component with `role="alert"` accessibility and optional retry action
- Created `TodoList` component handling loading, empty, and populated list states with disabled completion checkboxes
- Configured Vite dev proxy to forward `/todos` to `http://localhost:3000`
- Removed template assets (hero.png, react.svg, vite.svg) and assets directory
- Narrowed `#root` max-width from 1126px to 640px for a focused todo-app layout
- 9 tests covering all ACs: loading indicator, empty state, list rendering, completion status, error banner with API/network/parse errors, retry behavior, page structure
- All validation gates pass: type:check, biome:check, test:ci (9 web + 10 API tests)

### Change Log

- 2026-03-29: Implemented Story 1.6 — Todo List screen with load states and retry

### File List

New files:
- src/web/src/hooks/useTodos.ts
- src/web/src/components/GlobalErrorBanner.tsx
- src/web/src/components/GlobalErrorBanner.module.css
- src/web/src/components/TodoList.tsx
- src/web/src/components/TodoList.module.css

Modified files:
- src/web/src/App.tsx (complete rewrite)
- src/web/src/App.css (complete rewrite)
- src/web/src/App.test.tsx (complete rewrite)
- src/web/src/index.css (updated layout width, removed template-specific styles)
- src/web/vite.config.ts (added dev proxy for /todos)

Deleted files:
- src/web/src/assets/hero.png
- src/web/src/assets/react.svg
- src/web/src/assets/vite.svg
