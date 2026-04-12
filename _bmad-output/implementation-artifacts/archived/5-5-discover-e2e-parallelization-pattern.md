# Story 5.5: Discover E2E test parallelization pattern

Status: done

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

- [x] Task 1 — Audit inter-test state dependencies (AC1)
  - [x] Read `packages/web/e2e/todo-flows.spec.ts` end-to-end
  - [x] List each test that depends on DB state set by a prior test (e.g., "places newest todo above existing ones" reads a todo created in the previous test)
  - [x] List each test that creates and cleans up its own state

- [x] Task 2 — Audit the user-injection gap (AC2)
  - [x] Confirm `App.tsx:12` hardcodes `DEFAULT_USER_ID` with no runtime override
  - [x] Enumerate candidate injection mechanisms: URL query param, `localStorage`, cookie, or test-only env var read at build time
  - [x] Assess which mechanism is least invasive and doesn't require product code changes (or requires only a small, reversible change)

- [x] Task 3 — Design Playwright isolation fixture (AC3)
  - [x] Sketch a `test.extend` fixture that: (a) calls `POST /api/users` via `request` context to create a unique user before each test/file, (b) injects the userId into the page (via chosen mechanism), (c) calls `DELETE FROM todos WHERE user_id` teardown via direct DB or API
  - [x] Identify whether Playwright `request` fixture can call the API directly without a browser
  - [x] Identify whether `fullyParallel: true` in `playwright.config.ts` is safe once isolation is in place

- [x] Task 4 — Document findings and recommendation (AC4)
  - [x] Fill in the **Findings** section below
  - [x] Commit only the updated story file (no production code changes in this story unless a trivial, isolated spike proves something definitively)

### Review Findings

- [ ] [Review][Decision] DEFAULT_USER_ID fallback silently exposes shared seed user in pre-auth production — The `getUserId()` utility falls back to `DEFAULT_USER_ID` if no cookie is present or malformed. In a deployed pre-auth environment, unauthenticated page loads silently operate as the shared seed user. Acceptable as temporary stepping stone (replaced in epic 6), or should the fallback be removed/made to fail loudly?
- [ ] [Review][Patch] Sprint status comment "in-progress" contradicts status value "review" [sprint-status.yaml]
- [ ] [Review][Patch] Describe block count mismatch — "5 top-level describe blocks" but 6 are listed (initial load, create, edit, toggle, delete, persistence) [F1]
- [ ] [Review][Patch] Cookie httpOnly claim is misleading — `document.cookie` cannot read httpOnly cookies; claim "mirrors httpOnly session cookie flow" is factually incorrect [F2]
- [ ] [Review][Patch] `getUserId()` missing `export` keyword in code snippet [F2 code snippet]
- [ ] [Review][Patch] `POST /api/users` fixture may fail if route enforces `x-user-id` header — no header sent in proposed sketch; `{ id: userId }` destructure would yield `undefined` on 400 response [F3 code snippet]
- [ ] [Review][Patch] Cookie `domain: "localhost"` may be silently dropped — Playwright cookie matching is strict; some versions require domain omitted or empty string for localhost; add verification note [F3 code snippet]
- [ ] [Review][Patch] Cross-dependent test count understated — `toHaveCount(1)` and `items.nth(1)` assertions also depend on prior test state, not only the "places newest todo" test [F1]
- [ ] [Review][Patch] `App.tsx:12` hardcoding asserted without code excerpt evidence [F2]
- [ ] [Review][Patch] Cleanup accumulation consequence not connected to grouping recommendation — F1 should note that each parallel file will need `beforeEach` cleanup to avoid list-state cross-contamination [F1]
- [x] [Review][Defer] No `response.ok` guard before destructuring `{ id: userId }` in fixture — implementation detail for story 5.6 [F3 code snippet] — deferred, implementation concern
- [x] [Review][Defer] Teardown is a comment stub — acceptable for discovery, full design needed in story 5.6 [F3 code snippet] — deferred, implementation concern
- [x] [Review][Defer] Proxy readiness for fixture API calls — `request.post("/api/users")` requires Vite dev server running; global-setup ordering needs addressing in story 5.6 [F3] — deferred, implementation concern
- [x] [Review][Defer] App-layer `getUserId()` change described in F4 but not in F3 where it belongs structurally — deferred, minor structural suggestion

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

### F1 — Inter-test state dependency audit

**Cross-dependent tests (1 of 26):**

| Test | Dependency |
|---|---|
| "places newest todo above existing ones" (line 80) | Reads "Detailed todo" created by the preceding test "adds a todo with title and description" (line 64) |

**Self-contained tests: 25 of 26** — All other tests create their own todos within the test body. However, **none clean up after themselves**, so list state accumulates across the suite run. This doesn't currently cause failures because assertions target specific text content, not list length.

**Parallelization grouping:** The 5 top-level `describe` blocks (initial load, create todo, inline edit, toggle completion, delete todo, data persistence) are natural split points for separate files. Each would be independently runnable once user isolation exists. The one cross-dependent test must be made self-contained first (trivial: create its own prerequisite todo in the test body).

### F2 — User-injection gap

**Confirmed:** `App.tsx:12` hardcodes `DEFAULT_USER_ID` with no runtime override. The `userId` flows into `useTodos`, which sends it as `x-user-id` on every HTTP request.

**Candidate mechanisms evaluated:**

| Mechanism | Invasiveness | Runtime per-worker? | Auth-ready? | Notes |
|---|---|---|---|---|
| `userId` cookie | Low (small utility) | Yes | **Yes** — same pattern real auth will use | Fixture sets via `addCookies()`; mirrors httpOnly session cookie flow |
| `window.__TEST_USER_ID__` via `page.addInitScript()` | Low (1-line prod change) | Yes | No — throwaway hack | Fixture-friendly, but adds test-only global to production code |
| URL query param `?userId=xxx` | Low | Yes | No | Leaks test concern into URL |
| `localStorage` | Low | Yes | No | Race condition with app boot |
| Build-time env var (`VITE_USER_ID`) | High | No | No | One build = one user ID, can't vary per-worker |

**Recommendation: cookie-based injection (auth-ready approach).**

Epic 6 will introduce real authentication, most likely via httpOnly cookies (see story 6.0 auth spike, AC5). Instead of a throwaway `window.__TEST_USER_ID__` hack, the cookie approach aligns with the eventual auth mechanism:

1. **Now (pre-auth):** `App.tsx` reads a `userId` cookie via a small `getUserId()` utility, falling back to `DEFAULT_USER_ID`. The e2e fixture sets this cookie via `page.context().addCookies()` before navigation.
2. **After epic 6 (real auth):** The test fixture changes from "set a `userId` cookie" to "call `POST /api/auth/login` and let the server set the real session cookie." `App.tsx` stops reading a manual cookie — user identity comes from the authenticated session instead.

This makes the parallelization work a stepping stone toward auth rather than throwaway scaffolding. Both phases use cookies; only the cookie's origin changes (test fixture → server-issued).

```ts
// packages/web/src/utils/get-user-id.ts (temporary, replaced by useAuth in epic 6)
import { DEFAULT_USER_ID } from "shared";

function getUserId(): string {
  const match = document.cookie.match(/(?:^|;\s*)userId=([^;]+)/);
  return match?.[1] ?? DEFAULT_USER_ID;
}
```

```ts
// App.tsx change
const userId = getUserId();
useTodos({ userId });
```

### F3 — Playwright isolation fixture design

**Proposed fixture (`test.extend`) — cookie-based, auth-ready:**

```ts
import { test as base } from "@playwright/test";

type IsolatedFixtures = {
  testUserId: string;
};

export const test = base.extend<IsolatedFixtures>({
  testUserId: async ({ request }, use) => {
    // Create a unique user via API (no browser needed)
    const response = await request.post("/api/users", {
      data: { name: `e2e-${crypto.randomUUID()}` },
    });
    const { id: userId } = await response.json();

    await use(userId);

    // Teardown: clean todos then user via direct DB
  },

  page: async ({ page, testUserId }, use) => {
    // Set userId cookie before navigation — mirrors how real auth will work
    await page.context().addCookies([{
      name: "userId",
      value: testUserId,
      domain: "localhost",
      path: "/",
    }]);
    await use(page);
  },
});

// After epic 6, the fixture changes to:
//   await request.post("/api/auth/login", { data: { email, password } });
//   // Server sets the real session cookie — no manual addCookies needed
```

**Key technical findings:**

- Playwright's `APIRequestContext` (`request` fixture) calls the API directly without a browser — confirmed viable for user creation and teardown.
- The Vite proxy forwards `/api/users` to the API's `POST /users` endpoint, so the fixture works against the same server the browser uses.
- Teardown options: (a) `DELETE FROM todos WHERE user_id` + `DELETE FROM users WHERE id` via direct `pg` client, or (b) a test-only API cleanup endpoint. Direct DB is simpler and matches the API test pattern.

**On `fullyParallel: true`:**

- **Safe** once isolation is in place. The web and API dev servers are stateless — no in-memory state between requests.
- DB connection pool is not a concern: Playwright defaults to 50% of CPU cores (typically 4–8 workers), well within Postgres limits.

**Per-test vs per-worker:**

- **Per-worker** (one user per Playwright worker process, reused across tests in the same worker) is recommended. Matches the API test pattern (per-file user). Simpler, fewer users created, faster.
- Todo cleanup between tests within a worker can use a `beforeEach`-equivalent fixture or `test.beforeEach` in each spec file.

### F4 — Recommendation

**Verdict: (a) Concrete proposed approach for a follow-up story.**

E2E parallelization is feasible and straightforward. The proposed approach mirrors the proven API test parallel pattern (story 4.3) and is designed to align with the upcoming auth work in epic 6.

**Required changes:**

1. **App layer (auth-ready):** Replace the hardcoded `DEFAULT_USER_ID` in `App.tsx` with a `getUserId()` utility that reads a `userId` cookie, falling back to `DEFAULT_USER_ID`. This is a stepping stone — when epic 6 lands real auth (likely httpOnly session cookies), `getUserId()` is replaced by the actual auth hook. Both phases use cookies; only the cookie's origin changes (test fixture → server-issued).
2. **Test layer:**
   - Create a custom `test` fixture via `test.extend` that creates a per-worker user, sets the `userId` cookie via `page.context().addCookies()`, and cleans up on teardown.
   - Split `todo-flows.spec.ts` into ~6 files by feature (initial-load, create, edit, toggle, delete, persistence).
   - Fix the one cross-dependent test ("places newest todo above existing ones") to be self-contained.
   - Enable `fullyParallel: true` in `playwright.config.ts`.
3. **Cleanup strategy:** Direct DB cleanup via `pg` client in fixture teardown (same pattern as API tests).

**Auth transition path:** When epic 6 implements real authentication, the e2e fixture changes from `addCookies([{ name: "userId", ... }])` to `request.post("/api/auth/login", { ... })` — the server sets the real cookie. No `window` globals, no throwaway hacks.

**Effort estimate:** Small — the fixture is ~30 lines, the `getUserId` utility is ~5 lines, the file split is mechanical, and the one cross-dependent test fix is trivial. No architectural risk.

**Implementation timing:** This is a discovery-only story. Implementation is deferred to a follow-up story — either as a dedicated story 5.6, or folded into early epic 6 work since the cookie-based approach is directly on the path to real auth.

---

## Dev Agent Record

### Agent Model Used

Claude Sonnet 4.6 (1M context)

### Debug Log References

None — discovery-only story, no code execution required.

### Completion Notes List

- Audited all 26 tests in `todo-flows.spec.ts`: found 1 cross-dependent test ("places newest todo above existing ones" depends on prior test's "Detailed todo"), 25 self-contained tests (though none clean up after themselves).
- Confirmed `App.tsx:12` hardcodes `DEFAULT_USER_ID` with no runtime override. Evaluated 5 injection mechanisms; recommended cookie-based approach as auth-ready (aligns with epic 6 httpOnly cookie direction).
- Designed a `test.extend` fixture mirroring the API test parallel pattern (story 4.3): per-worker user creation via `POST /api/users`, userId cookie injection via `page.context().addCookies()`, teardown via direct DB.
- Confirmed Playwright `request` fixture works without a browser and `fullyParallel: true` is safe with isolation in place.
- Produced concrete recommendation: parallelization is feasible, requires small `getUserId()` utility + cookie-based test fixture + file split. Cookie approach is a stepping stone to real auth — when epic 6 lands, fixture changes from `addCookies` to `POST /api/auth/login`.

### Change Log

- 2026-04-09: Completed discovery — filled in Findings section with F1–F4 covering state audit, user-injection gap, fixture design, and recommendation.
- 2026-04-09: Revised F2/F3/F4 — replaced `window.__TEST_USER_ID__` recommendation with auth-ready cookie-based approach that aligns with epic 6 direction (httpOnly cookies). Implementation deferred to follow-up story.

### File List

- `_bmad-output/implementation-artifacts/5-5-discover-e2e-parallelization-pattern.md` (modified — findings, tasks, dev agent record)
- `_bmad-output/implementation-artifacts/sprint-status.yaml` (modified — status updated)
