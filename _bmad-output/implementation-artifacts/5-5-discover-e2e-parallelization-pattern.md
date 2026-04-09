# Story 5.5: Discover E2E test parallelization pattern

Status: ready-for-dev

## Story

As a developer,
I want to investigate whether and how the Playwright e2e suite can be parallelized,
So that we can decide whether to implement test isolation (and how) in a follow-up story.

## Acceptance Criteria

### AC1 — Audit current inter-test state dependencies

**Given** the single `todo-flows.spec.ts` file
**When** I review each test
**Then** I document which tests depend on state created by a prior test in the same describe block
**And** I note which tests are already self-contained and how such tests could be grouped in parallel independent test files/batches.

### AC2 — Identify the user-isolation blocker

**Given** `App.tsx` hardcodes `DEFAULT_USER_ID` via `useTodos({ userId: DEFAULT_USER_ID })`
**When** I reason about running tests in parallel with separate browser contexts
**Then** I document whether the app needs a runtime user-injection mechanism (URL param, localStorage, cookie, or fixture-injected page state) to support per-test/per-worker isolation

### AC3 — Evaluate feasibility of per-file isolation via Playwright fixtures

**Given** the API test pattern (per-file user creation via `createTestUser`, per-test todo cleanup via `cleanupUserTodos`)
**When** I design an equivalent Playwright fixture or `beforeAll` flow
**Then** I document what changes are needed in both the app layer and the test layer to support it

### AC4 — Produce a findings + recommendation document

**Given** the analysis from AC1–AC3
**When** the investigation is complete
**Then** a findings section is added to this story's Dev Notes
**And** it includes one of: (a) a concrete proposed approach for Story 5.6, (b) a "not worth it" conclusion with rationale, or (c) a partial approach worth pursuing

## Tasks / Subtasks

- [ ] Task 1 — Audit inter-test state dependencies (AC1)
  - [ ] Read `packages/web/e2e/todo-flows.spec.ts` end-to-end
  - [ ] List each test that depends on DB state set by a prior test (e.g., "places newest todo above existing ones" reads a todo created in the previous test)
  - [ ] List each test that creates and cleans up its own state

- [ ] Task 2 — Audit the user-injection gap (AC2)
  - [ ] Confirm `App.tsx:12` hardcodes `DEFAULT_USER_ID` with no runtime override
  - [ ] Enumerate candidate injection mechanisms: URL query param, `localStorage`, cookie, or test-only env var read at build time
  - [ ] Assess which mechanism is least invasive and doesn't require product code changes (or requires only a small, reversible change)

- [ ] Task 3 — Design Playwright isolation fixture (AC3)
  - [ ] Sketch a `test.extend` fixture that: (a) calls `POST /api/users` via `request` context to create a unique user before each test/file, (b) injects the userId into the page (via chosen mechanism), (c) calls `DELETE FROM todos WHERE user_id` teardown via direct DB or API
  - [ ] Identify whether Playwright `request` fixture can call the API directly without a browser
  - [ ] Identify whether `fullyParallel: true` in `playwright.config.ts` is safe once isolation is in place

- [ ] Task 4 — Document findings and recommendation (AC4)
  - [ ] Fill in the **Findings** section below
  - [ ] Commit only the updated story file (no production code changes in this story unless a trivial, isolated spike proves something definitively)

## Dev Notes

### Scope — Discovery Only

No production code changes are required to complete this story. The deliverable is the filled-in **Findings** section below. If a tiny spike is needed to validate a hypothesis (e.g., a throwaway Playwright fixture), it is acceptable but must not be committed to production files.

### Current E2E State

- **One spec file**: `packages/web/e2e/todo-flows.spec.ts` (720 lines, 26 tests)
- **Playwright config**: `packages/web/e2e/playwright.config.ts` — no `fullyParallel`, no explicit `workers` setting; default is 50% of CPU cores but all tests are in one file so they run sequentially within the file
- **Global setup**: `global-setup.ts` runs `npm -w api run db:reset` once before the suite — no per-test cleanup
- **User**: `App.tsx` hardcodes `DEFAULT_USER_ID` from `shared`; all tests share one user's todo list
- **Test utilities**: only `createDeferred` — no DB helpers, no user creation

### Known Inter-Test State Dependencies

The test "places newest todo above existing ones" (line ~80) explicitly assumes "Detailed todo" exists in the list, having been created by the immediately preceding test. This is the clearest example of cross-test coupling that must be resolved before parallelization.

All other tests appear to create their own todos within the test body — but they do not clean up after themselves, so list state accumulates across the suite run.

### API Test Parallel Pattern (Reference)

Story 4.3 achieved API test parallelism by:

1. Each file calls `POST /users` in `beforeAll` to create a unique user
2. All API calls in that file use that user's `x-user-id` header
3. `beforeEach` calls `DELETE FROM todos WHERE user_id = $testUserId`
4. `fileParallelism: true` in vitest config

The e2e analog requires the browser to send a different `x-user-id` header per test/worker. Since `App.tsx` builds the header from the `userId` prop passed to `useTodos`, the only way to vary it at e2e level is to vary what `App.tsx` reads as the user ID.

### Key Open Questions for Investigation

1. Can the `x-user-id` value be injected via `page.addInitScript()` (sets a `window` global before app boots) without modifying production code?
2. Is `fullyParallel: true` safe with isolation, or do shared web/API servers become a bottleneck?
3. Should isolation be per-test or per-worker? Per-worker is simpler (one user per worker process, reused across tests in the same worker).

---

## Findings

> **To be filled in by the dev agent implementing this story.**

---

## Dev Agent Record

### Agent Model Used

### Debug Log References

### Completion Notes List

### File List
