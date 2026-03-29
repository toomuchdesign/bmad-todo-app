# Story 1.8: Set up Playwright E2E infrastructure and cover Epic 1 flows

Status: done

## Story

As a maintainer,
I want E2E tests covering the current load and create flows,
so that regressions are caught early as new features are added.

## Acceptance Criteria

1. **Playwright configured with `test:e2e` root script**
   - Given no Playwright infrastructure exists yet
   - When I set up E2E testing
   - Then Playwright is configured with a `test:e2e` root script
   - And dev servers (web + API) are orchestrated for E2E runs
   - And DB is reset via the existing `db:reset` script before each test or suite

2. **Epic 1 flows covered**
   - Given the E2E suite runs
   - When it exercises Epic 1 flows
   - Then it covers:
     - App loads and shows the todo list
     - Empty state is displayed when no todos exist
     - Creating a todo with valid text adds it to the list (newest-first)
     - Inline validation prevents empty/whitespace and too-long submissions
     - Load failure shows error banner with working retry

3. **Incremental E2E growth enabled**
   - Given E2E tests exist for current features
   - When Epic 2 stories are implemented
   - Then each story adds E2E cases for its feature alongside unit tests (E2E coverage grows incrementally with the codebase)

## Tasks / Subtasks

- [x] Task 1: Install Playwright and configure (AC: #1)
  - [x] Install `@playwright/test` version `1.58.2` as a devDependency in the **web workspace** (`src/web`)
  - [x] Run `npx playwright install chromium` to install browser binary (Chromium only for MVP)
  - [x] Create `src/web/e2e/playwright.config.ts` with webServer orchestration (see Dev Notes)
  - [x] Update `src/web/package.json` — set `"test:e2e": "playwright test --config e2e/playwright.config.ts"`
  - [x] Verify root `package.json` `"test:e2e"` script already delegates to `npm -w src/web run test:e2e` (it does — currently a TODO echo stub, update if needed)

- [x] Task 2: Create DB reset global setup (AC: #1)
  - [x] Create `src/web/e2e/global-setup.ts` that runs the existing `db:reset` script (`npm -w src/api run db:reset`) before the suite
  - [x] Reference `globalSetup` in `playwright.config.ts`

- [x] Task 3: Write Epic 1 E2E specs (AC: #2)
  - [x] Create `src/web/e2e/todo-flows.spec.ts`
  - [x] Test: app loads and renders the todo list container
  - [x] Test: empty state message is displayed when no todos exist (DB was just reset)
  - [x] Test: creating a todo with valid text adds it to the list at the top (newest-first ordering)
  - [x] Test: creating a second todo places it above the first (newest-first)
  - [x] Test: submitting empty/whitespace text shows inline validation error, todo is not created
  - [x] Test: submitting text exceeding MAX_TODO_TEXT_LENGTH (200 chars) shows inline validation error
  - [x] Test: load failure shows error banner with retry button (requires network interception to simulate API failure)

- [x] Task 4: Verify E2E run end-to-end (AC: #1, #2)
  - [x] Run `npm run test:e2e` from root and confirm all specs pass
  - [x] Confirm DB is reset before the suite
  - [x] Confirm dev servers start and stop automatically

- [x] Task 5: Run all validation gates (AC: #1, #2, #3)
  - [x] `npm run type:check` passes
  - [x] `npm run biome:check` passes
  - [x] `npm run test:ci` passes (existing unit/integration tests unaffected)
  - [x] `npm run test:e2e` passes

## Dev Notes

### Story Scope

This story establishes Playwright E2E infrastructure and covers Epic 1 flows only. It was added during the Epic 1 retrospective to create a regression safety net before Epic 2 mutations land. Story 3.3 in Epic 3 becomes a consolidation/gap-filling pass rather than building from scratch.

### Baseline (What Exists)

- **No Playwright installed** — no config, no E2E test files
- **Root `test:e2e` script** already exists but is a TODO stub: `"test:e2e": "npm -w src/web run test:e2e"` (root delegates to web workspace)
- **Web `test:e2e` script** is a TODO stub: `"echo \"TODO: add Playwright e2e tests\""`
- **`db:reset` script** exists in API workspace: `npm -w src/api run db:reset` — runs `tsx scripts/reset-todos.ts` which truncates the `todos` table
- **Dev servers**: `npm run dev` starts both web (Vite at `:5173`) and API (Fastify at `:3001`) concurrently
- **Vite proxy**: `/todos` requests proxied from `:5173` to `:3001` (configured in `src/web/vite.config.ts`)
- **31 existing tests** (21 web + 10 API) — must remain passing

### Architecture Guardrails

- **Playwright version:** `1.58.2` (from architecture version matrix) [Source: architecture.md#Version Matrix]
- **E2E location:** `src/web/e2e/` — contains `playwright.config.ts` and spec files [Source: architecture.md#Project Directory Structure]
- **Spec file:** `src/web/e2e/todo-flows.spec.ts` [Source: architecture.md#Project Directory Structure]
- **Browser:** Chromium only for MVP (keep E2E fast)
- **DB reset approach:** Run the existing `db:reset` script before the Playwright suite via `globalSetup`. Do NOT create a public reset API endpoint [Source: architecture.md#Test & Local Data Reset]
- **E2E philosophy:** Keep E2E small but representative — validate system wiring (web ↔ API ↔ DB) rather than re-test every edge case already covered by unit/integration tests [Source: architecture.md#Task-by-Task Testing Strategy]

### Playwright Config Guidance

```ts
// src/web/e2e/playwright.config.ts
import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: '.',
  use: {
    baseURL: 'http://localhost:5173',
  },
  webServer: [
    {
      command: 'npm run dev:api',
      port: 3001,
      cwd: '../../',            // project root
      reuseExistingServer: !process.env.CI,
    },
    {
      command: 'npm run dev:web',
      url: 'http://localhost:5173',
      cwd: '../../',            // project root
      reuseExistingServer: !process.env.CI,
    },
  ],
  globalSetup: './global-setup.ts',
})
```

**Key decisions:**
- `webServer` array orchestrates both API and web dev servers — Playwright starts/stops them automatically
- `cwd: '../../'` because config lives in `src/web/e2e/` (two levels from root)
- `reuseExistingServer: !process.env.CI` — reuse running servers in local dev, fresh servers in CI
- `globalSetup` runs `db:reset` before the entire suite

### Global Setup for DB Reset

```ts
// src/web/e2e/global-setup.ts
import { execSync } from 'node:child_process'

export default function globalSetup() {
  execSync('npm -w src/api run db:reset', {
    cwd: new URL('../../..', import.meta.url).pathname, // project root
    stdio: 'inherit',
  })
}
```

### Test Patterns

- Use Playwright's `page.route()` to intercept network requests for simulating API failures (load failure test)
- Use `page.getByRole()`, `page.getByText()`, `page.getByPlaceholder()` for resilient selectors (accessibility-friendly)
- Each test should be independent — the DB is reset at suite start, and create tests build on the empty state
- Order tests so that create tests run after the empty-state check (use Playwright's default serial mode within a file)
- `MAX_TODO_TEXT_LENGTH` = 200 (from shared constants) — use this for the too-long validation test

### UX Details for Assertions

- **Empty state:** text content indicating no todos (verify the empty-state message renders)
- **Add form:** input field + submit button; validation errors appear inline below the input
- **Todo list ordering:** newest todo appears first (API returns `ORDER BY created_at DESC`)
- **Error banner:** global error banner with retry button appears on load failure
- **Pending state:** submit button is disabled while create request is in-flight

### Previous Story Intelligence (Story 1.7)

- `AddTodoForm` component handles inline validation (empty, whitespace, max length)
- `useTodos` hook in `src/web/src/hooks/useTodos.ts` manages all todo state and API calls
- `GlobalErrorBanner` component renders load errors with a retry button
- State-based focus coordination pattern via `useEffect` + `shouldFocus` flag
- Validation error text: check the actual rendered text in the component for exact assertions
- Mocked `fetch` approach in unit tests — E2E uses real servers instead

### Files Expected to Be Created

- `src/web/e2e/playwright.config.ts` — Playwright configuration
- `src/web/e2e/global-setup.ts` — DB reset before suite
- `src/web/e2e/todo-flows.spec.ts` — Epic 1 E2E specs

### Files Expected to Be Modified

- `src/web/package.json` — update `test:e2e` script, add `@playwright/test` devDependency
- Root `package.json` — verify/update `test:e2e` delegation (should already be correct)

### Project Structure Notes

- E2E files go in `src/web/e2e/` per architecture spec — NOT in a root-level `e2e/` folder
- `playwright.config.ts` lives inside `src/web/e2e/`, not at web workspace root
- This matches the directory tree in architecture.md [Source: architecture.md#Project Directory Structure]

### References

- [Source: epics.md#Story 1.8] — Acceptance criteria and context
- [Source: architecture.md#Version Matrix] — Playwright 1.58.2
- [Source: architecture.md#Canonical npm Scripts] — test:e2e script definition
- [Source: architecture.md#Testing Strategy & Tooling] — Web E2E: Playwright
- [Source: architecture.md#Test & Local Data Reset] — DB reset approach, no public reset API
- [Source: architecture.md#Task-by-Task Testing Strategy] — E2E philosophy (small but representative)
- [Source: architecture.md#Project Directory Structure] — `src/web/e2e/` location
- [Source: epic-1-retro] — Story 1.8 rationale, E2E should accompany feature development
- [Source: project-context.md] — Testing practices, coding conventions

### Review Findings

- [x] [Review][Decision] Pre-commit hook now runs full E2E suite — kept as-is per user decision. [package.json:33]
- [x] [Review][Patch] Global setup hardcodes DATABASE_URL and bypasses `db:reset` script — fixed: now uses `db:reset` with DATABASE_URL loaded from `src/api/.env` via `loadEnvFile`. [src/web/e2e/global-setup.ts]
- [x] [Review][Defer] Pre-commit hook missing `npm run` prefix for first command — deferred, pre-existing [package.json:33]

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6 (1M context)

### Debug Log References

- DB reset targeted wrong database (bmad_todo_test instead of bmad_todo) — fixed by passing DATABASE_URL env var to global setup
- Empty-state test: list element not rendered when no todos exist — adjusted first test to assert heading + input instead of list role
- @testing-library/dom missing (pre-existing issue) — added as explicit devDependency

### Completion Notes List

- Installed @playwright/test@1.58.2 in web workspace with Chromium browser binary
- Created playwright.config.ts with dual webServer orchestration (API + Web), globalSetup for DB reset, and baseURL config
- Created global-setup.ts that resets the dev database (bmad_todo) via the existing reset-todos.ts script, overriding DATABASE_URL to target the correct DB
- Created e2e/tsconfig.json for proper type checking of E2E files
- Wrote 7 E2E specs covering all Epic 1 flows: app load, empty state, todo creation (single + ordering), inline validation (empty + max length), and load failure with retry
- Fixed pre-existing issue: added missing @testing-library/dom peer dependency
- Added test-results to .gitignore
- All validation gates pass: type:check, biome:check, test:ci (31 tests), test:e2e (7 tests)

### File List

**Created:**
- src/web/e2e/playwright.config.ts
- src/web/e2e/global-setup.ts
- src/web/e2e/todo-flows.spec.ts
- src/web/e2e/tsconfig.json

**Modified:**
- src/web/package.json (test:e2e script, type:check script, @playwright/test + @testing-library/dom devDeps)
- src/web/tsconfig.json (added e2e tsconfig reference)
- package-lock.json (dependency changes)
- .gitignore (added test-results)

### Change Log

- 2026-03-29: Implemented story 1.8 — Playwright E2E infrastructure and Epic 1 flow coverage (7 specs)
