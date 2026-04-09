---
stepsCompleted: [1, 2, 3, 4, "epic4-step1", "epic4-step2", "epic4-step3", "epic4-step4"]
lastStep: 4
workflowType: "epics"
inputDocuments:
  - _bmad-output/planning-artifacts/prd.md
  - _bmad-output/planning-artifacts/ux-design-specification.md
  - _bmad-output/planning-artifacts/architecture.md
---

# bmad-todo - Epic Breakdown

## Overview

This document provides the complete epic and story breakdown for bmad-todo, decomposing the requirements from the PRD, UX Design, and Architecture into implementable stories.

## Requirements Inventory

### Functional Requirements

FR1: Users can view a list of todos on app load.
FR2: Users can create a todo by submitting text.
FR3: Users can edit the text of an existing todo.
FR4: Users can mark a todo as completed and uncompleted.
FR5: Users can delete a todo (soft delete).
FR6: Users receive inline validation when attempting to create or edit a todo with empty/whitespace-only text.
FR7: Users receive inline validation when todo text violates length constraints.
FR8: The system preserves user-entered text when validation fails (no silent clearing).
FR9: Todos persist across page refresh and returning later.
FR10: The system maintains a consistent UI state when a create/edit/toggle/delete request fails (no ghost todos; no silent loss of changes).
FR11: Users see todos ordered by newest created first by default.
FR12: Deleted todos are excluded from the default todo list.
FR13: Users see a global error element when the initial todo load fails, with a retry action.
FR14: Users see a global error element when a network/server error occurs during create/edit/toggle/delete.
FR15: Users can retry failed operations (at minimum: retry load; retry on subsequent action attempts).
FR16: The system exposes an HTTP API that supports CRUD for todos.
FR17: The API supports listing todos (GET /todos).
FR18: The API supports creating a todo (POST /todos).
FR19: The API supports updating a todo (PATCH /todos/:id) for text and completion status.
FR20: The API supports soft deleting a todo (DELETE /todos/:id).
FR21: The API does not return soft-deleted todos in GET /todos.
FR22: API error responses include a stable machine-readable error code and a human-readable message suitable for display.
FR23: API error responses can optionally include structured details for validation errors (e.g., field + limits) and a requestId for debugging.
FR24: Automated tests cover all current MVP flows, including success and failure cases for load and CRUD actions.
FR25: The system stores a `users` table with `id` (UUID), `name` (text), `created_at`, `updated_at`.
FR26: A default user is seeded via migration, every todo belongs to a user via `user_id` FK, all todo queries and the web app are scoped by a required `x-user-id` header (web uses `DEFAULT_USER_ID`).
FR30: The API exposes `POST /users` to create a new user (accepts `{ name }`, returns the created user).

### NonFunctional Requirements

NFR1: Initial screen becomes usable within ≤2s p95 on modern mobile and a typical developer laptop on a normal network.
NFR2: API operations respond within ≤300ms p95 under normal dev conditions.
NFR3: UI reflects user actions within ≤200ms under normal conditions (optimistic UI allowed if consistency is preserved).
NFR4: No data loss across refresh and return later (same user/device).
NFR5: Failed API operations do not leave the UI inconsistent (no ghost todos; no silent loss of edits).
NFR6: User-provided todo text is handled safely (no client-side injection issues; safe rendering).
NFR7: API communication uses TLS in any deployed environment.
NFR8: Core actions are keyboard-operable and controls have accessible names.
NFR9: No formal WCAG target is required for MVP, but regressions that block basic usage are bugs.
NFR10: API test files run in parallel (`fileParallelism: true`) with each file using a distinct user for DB isolation.

### Additional Requirements

- Monorepo using npm workspaces: `src/web` (Vite React TS), `src/api` (Fastify TS), `src/shared` (shared constants/types).
- Postgres persistence with Drizzle ORM + Drizzle Kit migrations.
- Todo DB model includes: `id` uuid, `text`, `completed`, `created_at`, `updated_at`, `deleted_at` (soft delete).
- Default list semantics: exclude deleted (`deleted_at is null`), order newest-first (`created_at desc`).
- Shared constant: `MAX_TODO_TEXT_LENGTH = 200` used by both API and web.
- API response rules: no `{ data: ... }` envelope; success shapes are direct resources; `DELETE` returns `204`.
- API error contract: stable `code` + displayable `message`, optional `requestId`.
- `x-request-id` propagation: API always returns `x-request-id` header; error bodies include `requestId`.
- Retry semantics: explicit UI retry for initial load; mutations are not auto-retried.
- Web state management: React built-ins + custom hooks; no Redux/Zustand/React Query for MVP.
- Styling: CSS + CSS Modules; no UI kit; keep global base styles small.
- Tooling: Biome for lint/format; TypeScript-only (`allowJs: false`).
- API contract sharing: OpenAPI is generated from API route schemas and committed as `src/api/openapi.json`.
- Contract automation: root scripts include `build:openapi` and `build:api-types`; changes to API schemas update OpenAPI and derived web client/types in the same PR.
- Git hooks: use `simple-git-hooks` to keep contract artifacts in sync at commit time.
- CI enforcement: CI regenerates OpenAPI + web types and fails if `git diff --exit-code` shows uncommitted contract artifacts.
- Testing: API integration tests via `fastify.inject()`; web tests via Vitest + React Testing Library; E2E via Playwright.
- Determinism: DB reset via scripts/DB truncation; no public reset endpoint.

### UX Design Requirements

UX-DR1: Single-screen Todo List view with title, global error region, add form, and list region.
UX-DR2: Loading state shown during initial load; do not show empty state while loading.
UX-DR3: Empty state copy communicates no todos yet and prompts to add.
UX-DR4: Global error banner for load and mutation failures; includes retry for load failures; message is user-friendly.
UX-DR5: Add form supports inline validation for empty/whitespace-only and too-long input; preserves typed text on validation failure.
UX-DR6: After successful add, focus returns to the add input.
UX-DR7: Todo rows provide per-row pending indication for saving (create/edit/toggle/delete) when applicable.
UX-DR8: Inline edit by tapping/clicking todo text; Enter saves; Escape cancels; editing does not navigate.
UX-DR9: Toggle complete is one-tap checkbox; optimistic feedback with rollback on failure; completed items are visually distinct.
UX-DR10: Delete is one tap; no confirmation dialog in MVP; delete is not optimistic (row removed only after API success).
UX-DR11: Keyboard operability for all core actions with sensible Tab order; controls have accessible names.
UX-DR12: Error announcements and focus behavior remain predictable (errors visible without breaking flow).

### FR Coverage Map

FR1: Epic 1 - Load and display todos.
FR2: Epic 1 - Create todos from the main screen.
FR3: Epic 2 - Inline edit todo text.
FR4: Epic 2 - Toggle completion status.
FR5: Epic 2 - Soft delete todos.
FR6: Epic 1 - Inline validation (empty/whitespace).
FR7: Epic 1 - Inline validation (length constraints).
FR8: Epic 1 - Preserve input on validation failure.
FR9: Epic 1 - Durable persistence via API + DB.
FR10: Epic 1 & Epic 2 - Consistent UI on failed load/mutations.
FR11: Epic 1 - Newest-first ordering.
FR12: Epic 2 - Exclude deleted from list.
FR13: Epic 1 - Global error on load failure + retry.
FR14: Epic 1 & Epic 2 - Global error on mutation failures.
FR15: Epic 1 - Retry load; Epic 2 - user reattempt patterns.
FR16: Epic 1 - Implement API foundations.
FR17: Epic 1 - GET /todos.
FR18: Epic 1 - POST /todos.
FR19: Epic 2 - PATCH /todos/:id.
FR20: Epic 2 - DELETE /todos/:id.
FR21: Epic 2 - Server excludes soft-deleted.
FR22: Epic 1 - Stable error contract.
FR23: Epic 1 - requestId propagation on error responses.
FR24: Epic 3 - Automated test coverage (success/failure flows).
FR25: Epic 4 - Users table with id, name, timestamps.
FR26: Epic 4 - User-scoped todos (migration, FK, x-user-id header, query scoping, web default).
FR30: Epic 4 - POST /users route for user creation.
NFR10: Epic 4 - Parallel test execution via per-user isolation.

## Epic List

### Epic 1: First Usable Todo List (Load + Create)

A user can open the app, see their current todos, add a new todo with clear validation, and recover cleanly from load/create failures.
**FRs covered:** FR1, FR2, FR6, FR7, FR8, FR9, FR10, FR11, FR13, FR14, FR15, FR16, FR17, FR18, FR22, FR23

### Epic 2: Manage Existing Todos (Edit + Complete + Delete)

A user can maintain their list by editing text, marking todos complete/incomplete, and removing items via soft delete with consistent failure handling.
**FRs covered:** FR3, FR4, FR5, FR10, FR12, FR14, FR19, FR20, FR21

### Epic 3: Shippable Quality Bar (Tests + Accessibility)

A maintainer can validate the MVP is shippable via automated tests for all required flows, plus baseline accessibility/operability checks.
**FRs covered:** FR24 (and supports NFR1–NFR9)

### Epic 4: User Ownership (Multi-User Foundation + Parallel Tests)

A user's todos are scoped to their identity. The system supports multiple users at the DB/API level, with the web app using a hidden default user. API tests run in parallel with per-user isolation.
**FRs covered:** FR25, FR26, FR30, NFR10

### Epic 5: Deployment (Dockerize API and Web)

A maintainer can deploy the full stack (web + API + Postgres) as Docker containers with a single `docker compose` command, with zero local Node.js required. Begins with a cleanup story to resolve all tracked deferred action points before first deployment.
**NFRs covered:** NFR7 (TLS-ready — TLS terminated by upstream reverse proxy in production)

### Epic 6: User Authentication

A real user can register an account and log in. Todos are scoped to their authenticated identity. The `x-user-id` placeholder header (introduced in Epic 4) is replaced by a proper auth flow. Auth strategy is selected in Story 6.0 (design spike + ADR) before implementation begins.
**Begins after:** Epic 5 complete

## Epic 1: First Usable Todo List (Load + Create)

Deliver a vertical slice where the app can be started locally, persists todos via API + DB, loads list on open with clear states, and supports creating new todos with validation and predictable recovery.

### Story 1.1: Initialize monorepo workspaces and tooling

As a maintainer,
I want a scaffolded monorepo with web, api, and shared workspaces,
So that development can start consistently with the agreed architecture.

**Acceptance Criteria:**

**Given** an empty repo state (no `src/web`, `src/api`, `src/shared` yet)
**When** I scaffold the workspaces using the selected starters (Vite React TS, Fastify TS)
**Then** the repository contains `src/web`, `src/api`, and `src/shared` workspaces wired via npm workspaces
**And** root scripts exist for `dev:web`, `dev:api`, `test`, `test:ci`, `test:e2e`, `build`, `type:check`, `biome:check`, `biome:fix`, `source:check`, `build:openapi`, and `build:api-types` (even if some are initially stubs)

**Given** the repo is scaffolded
**When** I run `npm install`
**Then** dependency installation succeeds with a single root lockfile

### Story 1.2: Provision local Postgres + Drizzle baseline and Todos schema

As a maintainer,
I want a local database and migrations in place for todos,
So that the API can persist data durably and deterministically.

**Acceptance Criteria:**

**Given** the repo has an API workspace
**When** I start the local database (e.g., via `docker-compose.yml`)
**Then** Postgres is reachable using `DATABASE_URL`

**Given** Drizzle schema is implemented
**When** I generate and apply migrations
**Then** a `todos` table exists with `id`, `text`, `completed`, `created_at`, `updated_at`, and `deleted_at`
**And** soft delete is represented by `deleted_at` being null/non-null

**Given** local development and automated tests need deterministic resets
**When** I run the DB reset utility
**Then** it truncates the `todos` table via a script (not an API endpoint)
**And** it is exposed via an API workspace script (e.g., `db:reset`)

### Story 1.3: Implement shared contracts (Todo type, constants, ApiErrorResponse)

As a developer,
I want shared types and constants used by both API and web,
So that validation and contracts stay consistent.

**Acceptance Criteria:**

**Given** the `src/shared` workspace exists
**When** I add shared exports for `MAX_TODO_TEXT_LENGTH`, `Todo`, and `ApiErrorResponse`
**Then** both `src/api` and `src/web` can import these without Node/DOM coupling
**And** `MAX_TODO_TEXT_LENGTH` is set to 200 and used as the single source of truth

### Story 1.4: Implement GET /todos with ordering, soft-delete filtering, and error contract

As a user,
I want my todos to load when I open the app,
So that I can immediately see what I need to do.

**Acceptance Criteria:**

**Given** the API is running and the database contains active and soft-deleted todos
**When** I call `GET /todos`
**Then** the response is `200` with `{ todos: Todo[] }`
**And** the returned todos are ordered by `createdAt` descending
**And** todos with `deletedAt` set are excluded

**Given** the API receives a request
**When** it responds (success or error)
**Then** it includes an `x-request-id` response header

**Given** the API encounters an unexpected failure
**When** it responds with an error
**Then** the JSON body follows `ApiErrorResponse` with a stable `code` and displayable `message`
**And** `requestId` is present in the error body when available

### Story 1.5: Implement POST /todos with validation and stable validation errors

As a user,
I want to add a new todo,
So that I can capture tasks quickly.

**Acceptance Criteria:**

**Given** the API is running
**When** I call `POST /todos` with valid text
**Then** it returns `200` (or `201`) with the created `Todo`
**And** server-assigned timestamps are present

**Given** the request text is empty or whitespace-only
**When** I call `POST /todos`
**Then** it returns `400` with `code = VALIDATION_ERROR`
**And** the `message` is suitable for user display
**And** `requestId` is present in the error body when available

**Given** the request text exceeds `MAX_TODO_TEXT_LENGTH`
**When** I call `POST /todos`
**Then** it returns `400` with `code = VALIDATION_ERROR`
**And** the `message` is suitable for user display

### Story 1.6: Build the Todo List screen with load states and retry

As a user,
I want to see a clear loading/empty/list state on one screen,
So that I always understand what’s happening.

**Acceptance Criteria:**

**Given** I open the app
**When** the initial todo load is in progress
**Then** the UI shows a loading indicator in the list region
**And** it does not show the empty state while loading

**Given** the initial todo load succeeds with an empty list
**When** the UI renders
**Then** it shows an empty state message prompting me to add my first todo

**Given** the initial todo load fails
**When** the UI renders
**Then** it shows a global error banner with a clear message
**And** it includes a Retry action that attempts the load again

### Story 1.7: Add todo form with inline validation, optimistic/pending behavior, and safe failure handling

As a user,
I want to add a todo from the main screen with immediate feedback,
So that capturing tasks feels frictionless.

**Acceptance Criteria:**

**Given** the add input is visible
**When** I submit empty/whitespace-only text
**Then** the UI shows an inline validation message near the input
**And** the input value is preserved

**Given** I submit text longer than the max
**When** validation runs
**Then** the UI shows an inline validation message indicating the length constraint
**And** the input value is preserved

**Given** I submit valid text
**When** the create request is in flight
**Then** the UI shows a pending state (either a temporary row or a saving indicator)

**Given** the create request succeeds
**When** the response returns
**Then** the new todo appears in the list (newest-first)
**And** focus returns to the add input

**Given** the create request fails due to network/server error
**When** the failure is received
**Then** the UI shows a global error banner describing that the change didn’t save
**And** the UI does not leave a ghost todo in the list
**And** the user-entered text is preserved for retry

### Story 1.8: Set up Playwright E2E infrastructure and cover Epic 1 flows

As a maintainer,
I want E2E tests covering the current load and create flows,
So that regressions are caught early as new features are added.

**Acceptance Criteria:**

**Given** no Playwright infrastructure exists yet
**When** I set up E2E testing
**Then** Playwright is configured with a `test:e2e` root script
**And** dev servers (web + API) are orchestrated for E2E runs
**And** DB is reset via the existing `db:reset` script before each test or suite

**Given** the E2E suite runs
**When** it exercises Epic 1 flows
**Then** it covers: app loads and shows the todo list, empty state is displayed when no todos exist, creating a todo with valid text adds it to the list (newest-first), inline validation prevents empty/whitespace and too-long submissions, load failure shows error banner with working retry

**Given** E2E tests exist for current features
**When** Epic 2 stories are implemented
**Then** each story adds E2E cases for its feature alongside unit tests (E2E coverage grows incrementally with the codebase)

**Context:** Added during Epic 1 retrospective. Establishes the E2E regression safety net before Epic 2 mutations land. Story 3.3 in Epic 3 becomes a consolidation and gap-filling pass rather than building E2E from scratch.

## Epic 2: Manage Existing Todos (Edit + Complete + Delete)

Deliver the remaining CRUD actions with correct API behavior and UX patterns: inline editing, completion toggles, and soft delete, all with predictable rollback and error handling.

### Epic 1 Retrospective Learnings (apply throughout Epic 2)

- **Extend `useTodos` incrementally** — add one mutation per story (`updateTodo`, `toggleTodo`, `deleteTodo`), following the same pattern established in Epic 1: clear error → fire request → update state on success → set error on failure. Extract private internal functions into separate modules only if the hook grows too large.
- **Optimistic vs server-confirms-first coexist** — Story 2.3 (toggle) uses optimistic UI with rollback; Story 2.5 (delete) waits for server confirmation. Both patterns live in the same `useTodos` hook.
- **Focus management requires state-based coordination** — React 18 batches state updates, so direct `ref.focus()` calls after state changes are unreliable. Use `useEffect` + state flag pattern established in Story 1.7.
- **Keep vitest `globals: false`** — explicit `cleanup()` in test files is intentional; do not change this convention.

### Story 2.1: Implement PATCH /todos/:id for text and completion updates

As a user,
I want to update an existing todo,
So that I can correct it and reflect completion status.

**Acceptance Criteria:**

**Given** an existing todo
**When** I call `PATCH /todos/:id` with a new valid `text`
**Then** the API returns `200` with the updated `Todo`
**And** `updatedAt` is advanced

**Given** an existing todo
**When** I call `PATCH /todos/:id` with `completed` changed
**Then** the API returns `200` with the updated `Todo`

**Given** the new text is empty/whitespace-only or too long
**When** I call `PATCH /todos/:id`
**Then** the API returns `400` with `code = VALIDATION_ERROR` and a user-displayable `message`

**Given** the `:id` does not exist
**When** I call `PATCH /todos/:id`
**Then** the API returns `404` with `code = NOT_FOUND`

**Retro-driven additions (Epic 1 retro):**

- Fix retry debounce: pass `loading` state to `GlobalErrorBanner` and disable the Retry button while a request is in-flight. Update the existing retry test to assert the button is disabled during fetch.
- Update pre-commit hook: run `source:fix` then `source:check` before `test:ci` to eliminate recurring Biome formatting friction.

### Story 2.2: Inline edit todo text in the UI with Enter/Escape behavior

As a user,
I want to edit a todo inline,
So that I can adjust wording without leaving the list.

**Acceptance Criteria:**

**Given** a todo item is visible
**When** I tap/click the todo text
**Then** it enters edit mode with the current text in an input

**Given** I am editing
**When** I press Enter
**Then** the UI sends the update request and shows a per-row pending indicator

**Given** I am editing
**When** I press Escape
**Then** edit mode is canceled and the original text is shown

**Given** the save fails due to network/server error
**When** the response returns
**Then** the UI shows a global error banner
**And** the UI remains consistent (no silent loss of edits)

**Retro-driven additions (Epic 1 retro):**

- Install `@testing-library/user-event` as a dev dependency in `src/web`. Use it for keyboard interaction tests (Enter/Escape) in this story. Existing `fireEvent`-based tests in Stories 1.6/1.7 do not need migration.
- Apply the state-based focus coordination pattern from Story 1.7 for focus transitions: into edit input, out on Enter/save, out on Escape/discard.
- Click-outside behavior: save (same as Enter) — most forgiving UX.

### Story 2.3: Toggle completion with optimistic UI and rollback on failure

As a user,
I want to mark todos complete and incomplete,
So that I can track progress.

**Acceptance Criteria:**

**Given** a todo item is visible
**When** I toggle its checkbox
**Then** the UI immediately reflects the new state with a per-row pending indicator

**Given** the API update succeeds
**When** the response returns
**Then** the UI shows the final saved state

**Given** the API update fails
**When** the response returns
**Then** the UI reverts the checkbox to the previous state
**And** a global error banner is shown

### Story 2.4: Implement DELETE /todos/:id as soft delete and confirm it’s excluded from list

As a user,
I want to remove a todo,
So that my list stays tidy.

**Acceptance Criteria:**

**Given** an existing todo
**When** I call `DELETE /todos/:id`
**Then** the API returns `204 No Content`
**And** the todo is soft-deleted (sets `deletedAt` / `deleted_at`)

**Given** I subsequently call `GET /todos`
**When** the response returns
**Then** the deleted todo is not present

**Given** the `:id` does not exist
**When** I call `DELETE /todos/:id`
**Then** the API returns `404` with `code = NOT_FOUND`

### Story 2.5: Delete from the UI without optimistic removal (remove only on success)

As a user,
I want to delete a todo with predictable behavior,
So that I don’t lose items due to transient failures.

**Acceptance Criteria:**

**Given** a todo item is visible
**When** I click/tap Delete
**Then** the UI shows a per-row pending indicator
**And** the row remains visible until the API confirms deletion

**Given** the API delete succeeds
**When** the response returns
**Then** the todo is removed from the list

**Given** the API delete fails
**When** the response returns
**Then** the todo remains visible
**And** the UI shows a global error banner

### Story 2.6 (Optional): Per-item AbortController map for mutation concurrency

As a user,
I want concurrent mutations on different todos to work independently,
So that rapid interactions don't cause race conditions or corrupt state.

**Acceptance Criteria:**

**Given** the `useTodos` hook manages mutations
**When** I refactor to use a per-item AbortController map
**Then** a `Map<string, AbortController>` ref tracks in-flight mutations keyed by todo ID
**And** a new mutation for the same todo ID aborts the previous in-flight request
**And** mutations on different todo IDs run concurrently without interference

**Given** the initial `GET /todos` fetch
**When** it is in-flight
**Then** it uses a separate AbortController ref (not the per-item map)
**And** component unmount aborts the fetch

**Given** a mutation is aborted due to a superseding request
**When** the abort occurs
**Then** the aborted request does not update state or trigger error banners
**And** only the latest request's result is applied

**Context:** This story addresses deferred tech debt from Epic 1 (Story 1.6). It is optional because the mutation patterns in Stories 2.1–2.5 work correctly without it under normal usage. It becomes valuable when users interact rapidly (e.g., toggling the same checkbox multiple times quickly). By placing it after all mutation stories, the refactoring has full context of all patterns.

## Epic 3: Shippable Quality Bar (Tests + Accessibility)

Deliver the required automated coverage of MVP flows (success and failure), plus baseline accessibility/operability and deterministic dev/test ergonomics. Begins with a data model enhancement (title + text fields) before test coverage stories.

### Story 3.0: Add title field to todos with text as optional description

As a user,
I want each todo to have a distinct title and optional description text,
So that I can quickly scan my todo list by title and add details when needed.

**Acceptance Criteria:**

**Given** the existing todos table with a `text` column
**When** the migration runs
**Then** the `text` column is renamed to `title` and a nullable `text` column is added

**Given** a user creates a todo via a single input form consisting of a text field (title ≤100 chars) and a text area (tetx ≤500 chars)
**When** they type title and content and submit
**Then** the todo gets saved and rendered in the todo list

**Given** a todo is displayed in the list
**When** it has both title and text
**Then** the title is rendered with primary visual weight and the text below it with secondary (smaller, muted) styling

**Given** a user edits a todo inline
**When** the todo input form opens
**Then** it is pre-populated with title and text, and Ctrl+Enter/Cmd+Enter saves while Enter inserts newlines

**Given** the API contract
**When** POST /todos is called
**Then** the body accepts `{ title: string, text?: string }` with title required (1-100 chars) and text optional (1-500 chars)

**Given** the API contract
**When** PATCH /todos/:id is called
**Then** the body accepts optional `{ title?, text?, completed? }` with the same length constraints

**Given** the shared Todo type
**When** any package references it
**Then** `title` is a required string and `text` is `string | null`

**Technical notes:**

- DB migration: `ALTER TABLE todos RENAME COLUMN "text" TO "title"; ALTER TABLE todos ADD COLUMN "text" text;`
- Constants: `MAX_TODO_TITLE_LENGTH = 100`, `MAX_TODO_TEXT_LENGTH = 500`
- Title and text stored as plain string — no constraints blocking future markdown/formatting support
- All existing tests updated to reflect the new schema

### Story 3.1: API integration tests for todos endpoints (success + failure)

As a maintainer,
I want fast API integration tests against a deterministic database,
So that API behavior stays correct as the UI evolves.
Make sure we integrate tests with existing ones. Most of this story requirements might be already implemented.

**Acceptance Criteria:**

**Given** a dedicated test database configuration
**When** I run the API test suite
**Then** tests cover `GET /todos`, `POST /todos`, `PATCH /todos/:id`, and `DELETE /todos/:id`
**And** tests include validation failures, not-found failures, and requestId/error-shape assertions

**Given** tests run repeatedly
**When** each test starts
**Then** DB state is reset via truncation (not via a public reset endpoint)

### Story 3.2: Web unit/component tests for load/create and error handling

As a maintainer,
I want web tests for the core screen states and interactions,
So that regressions in UX and failure handling are caught early.
Make sure we integrate tests with existing ones. Most of this story requirements might be already implemented.

**Acceptance Criteria:**

**Given** MSW intercepts HTTP requests at the network boundary
**When** I run web tests
**Then** tests cover: initial load success, initial load failure with Retry, empty state, create validation, create success, and create failure showing global error

### Story 3.3: Accessibility and focus behavior baseline

As a keyboard user,
I want the app to be operable via keyboard with predictable focus,
So that I can complete the core loop without a mouse.

**Acceptance Criteria:**

**Given** I navigate the page with Tab
**When** I use the add form and list controls
**Then** all interactive controls have accessible names and are keyboard operable

**Given** I successfully add a todo
**When** the UI updates
**Then** focus returns to the add input

**Given** an error banner appears
**When** it is rendered
**Then** it is announced without breaking user flow (e.g., via an aria-live region)

## Epic 4: User Ownership (Multi-User Foundation + Parallel Tests)

Deliver user scoping across the full stack: DB schema, API routes, web client, and test infrastructure. After this epic, every todo belongs to a user, the API requires user identification, and API tests run in parallel.

### Story 4.1: User entity, default user seed, and creation route

As a developer,
I want a users table, a seeded default user, and a route to create new users,
So that the system has user identities before scoping todos to them.

**Acceptance Criteria:**

**Given** the database has no `users` table
**When** the Drizzle migration runs
**Then** a `users` table exists with `id` (UUID PK), `name` (text, NOT NULL), `created_at` (timestamptz), `updated_at` (timestamptz)
**And** a default user row is inserted with the fixed `DEFAULT_USER_ID`

**Given** the `shared` package
**When** any package imports `DEFAULT_USER_ID`
**Then** it receives a fixed UUID string constant

**Given** the API is running
**When** I call `POST /users` with `{ name: "Alice" }`
**Then** it returns `201` with the created user (`id`, `name`, `createdAt`, `updatedAt`)

**Given** the API is running
**When** I call `POST /users` with an empty or whitespace-only name
**Then** it returns `400` with `code = VALIDATION_ERROR`

**Given** the API receives a `POST /users` request
**When** it responds (success or error)
**Then** it includes an `x-request-id` response header

**Technical notes:**

- Destructive migration (no production data to preserve)
- `DEFAULT_USER_ID` exported from `shared` alongside existing constants
- No changes to todos table or routes in this story — existing tests must keep passing
- API integration tests for `POST /users` (success + validation failure + request-id)

### Story 4.2: Scope todos by user across API, web, and tests

As a user,
I want my todos to belong to me and be invisible to other users,
So that the system supports isolated multi-user data.

**Acceptance Criteria:**

**Given** the Drizzle migration runs
**When** the `todos` table is updated
**Then** it has a `user_id` column (UUID, NOT NULL, FK → `users.id`)

**Given** a valid `x-user-id` header is present
**When** I call any `/todos` endpoint
**Then** the request is scoped to that user's todos only

**Given** the `x-user-id` header is missing or references a non-existent user
**When** I call any `/todos` endpoint
**Then** the API returns `401` with a clear error code and message

**Given** user A creates a todo
**When** user B calls `GET /todos`
**Then** user A's todo is not in user B's response

**Given** the web app makes any API request
**When** the request is sent
**Then** it includes the `x-user-id: DEFAULT_USER_ID` header

**Given** the web component tests
**When** they mock API calls
**Then** they include the `x-user-id` header in assertions or mock setup

**Given** E2E tests
**When** they run
**Then** they work with the user-scoped API (via the web app's default user header)

**Technical notes:**

- `x-user-id` validation via a shared Fastify preHandler hook on todo routes
- Web: add the header in the existing fetch wrapper / API client
- Consider `401 Unauthorized` for missing/invalid user ID (not `403` — there's no auth yet, this signals "identify yourself")
- All existing API integration tests, web component tests, and E2E tests updated to pass with user-scoped routes

### Story 4.3: Enable parallel API test execution with per-user isolation

As a developer,
I want API tests to run in parallel using per-file user isolation,
So that the test suite runs faster without DB concurrency issues.

**Acceptance Criteria:**

**Given** each API test file
**When** it sets up test data
**Then** it creates its own user via `POST /users` and uses that user's ID for all requests
**And** cleanup is scoped to `DELETE FROM todos WHERE user_id = $testUserId`

**Given** the API vitest config
**When** tests run
**Then** `fileParallelism` is `true` and all test files pass concurrently

**Given** any two test files running in parallel
**When** both create and query todos
**Then** neither file sees the other's data

**Technical notes:**

- Remove global `TRUNCATE TABLE todos` from `vitest.setup.ts`, replace with per-user cleanup
- Each test file's `beforeAll` creates a user via the API; `beforeEach` deletes that user's todos
- No product code changes — purely test infrastructure

## Epic 5: Deployment (Dockerize API and Web)

Package the API and web as production-ready Docker images and provide a Docker Compose configuration that brings up the full stack (web + API + Postgres) with zero local Node.js required.

### Story 5.0: Pre-deployment cleanup — resolve deferred action points

As a maintainer,
I want all tracked open deferred items resolved or explicitly accepted,
So that known bugs and convention violations do not ship into the first deployed build.

**Acceptance Criteria:**

**UX bug: stale list on retry failure**

**Given** the initial todo load succeeded and the list is showing
**When** a retry-after-error fetch fails (e.g. network flaps)
**Then** the stale todo list is cleared (or visually marked as outdated) and only the error banner is shown
**And** the retry action is still available

**UX bug: 404 on already-deleted todo**

**Given** a todo exists in the UI
**When** delete or update returns `404` (item already removed server-side)
**Then** the UI treats the response as success and removes the item from the list
**And** no error banner is shown

**UX bug: stale mutation refs after fetchTodos retry**

**Given** a mutation (edit, toggle, delete) is in-flight
**When** `fetchTodos` is triggered (e.g. user retries) and succeeds
**Then** all in-flight mutations are aborted
**And** `pendingFields`, `snapshots`, and `mutationControllers` refs are cleared
**And** the fresh server data is the new source of truth

**API schema gap: PATCH accepts empty body**

**Given** the `PATCH /todos/:id` route schema
**When** I call `PATCH /todos/:id` with an empty body `{}`
**Then** the API returns `400` with `code = VALIDATION_ERROR` (no silent `updatedAt` bump for no-op requests)

**Code convention: default export in todosRoutes**

**Given** `packages/api/src/routes/todos/` uses `export default`
**When** I open the file
**Then** it uses a named export (per project-context.md: "named exports only — no default exports")

**CSS: hardcoded values in TodoItem.module.css**

**Given** `packages/web/src/components/TodoItem.module.css`
**When** I inspect spacing, font-size, and border-radius values
**Then** they reference semantic tokens (`--s-*`) rather than hardcoded values
**And** any required new tokens are added to `tokens/semantic.css` (and primitives if needed)

**Minor UX: focusTodoId never cleared**

**Given** `focusTodoId` is set in App.tsx to trigger focus after a todo action
**When** the focus effect fires
**Then** `focusTodoId` is reset to `null` immediately after to prevent stale re-focus on remount

**Technical notes:**

- Open items from `deferred-work.md` addressed here: Story 1.6 stale list, Story 2.5 404 loop, Story 2.6 stale refs, Story 3.0 PATCH empty body, Story 3.0 default export, Story 2.2 CSS values, Story 3.4 focusTodoId
- Items remaining accepted (do NOT fix here): `createTodo`/`updateTodo` clearing each other's errors (low impact), pre-commit `source:fix` staged file mutation, concurrent multi-item edit (intentional), `validateUserPlugin` caching (future auth story), 401 web client handling (future auth story)
- All tests must remain green; update any affected tests alongside code changes

### Story 5.1: Dockerize the API

As a maintainer,
I want the Fastify API to run as a Docker container,
So that it can be deployed without a local Node.js installation.

**Acceptance Criteria:**

**Given** a `packages/api/Dockerfile` exists
**When** I build the image from the monorepo root
**Then** the build succeeds via a multi-stage build (builder → runtime)
**And** the runtime image is based on `node:22-alpine` with only production dependencies
**And** the image runs `node dist/server.js` as its entrypoint

**Given** the container starts
**When** `DATABASE_URL`, `API_PORT`, and `WEB_ORIGIN` are provided as env vars
**Then** the API reads config from those env vars (no hardcoded values)

**Given** the migrations have not been applied
**When** the container starts
**Then** it runs `node dist/db/migrate.js` (programmatic drizzle `migrate()`) before starting the server
**And** the `drizzle/` folder with migration SQL files is included in the image

**Given** a `.dockerignore` at project root
**When** the Docker build context is sent
**Then** `node_modules/`, `*.test.ts`, `.debug/`, and other non-production files are excluded

**Technical notes:**

- Multi-stage: `builder` stage installs all deps + compiles; `runtime` stage copies `dist/`, `drizzle/`, and `node_modules` pruned to prod-only via `npm ci --omit=dev`
- The monorepo root is the build context (needed for `packages/shared` dependency)
- Add `packages/api/src/db/migrate.ts` — a standalone script that calls drizzle-orm's programmatic `migrate(db, { migrationsFolder: './drizzle' })`
- The container entrypoint runs: `node dist/db/migrate.js && node dist/server.js` (via a shell script or CMD array)

### Story 5.2: Dockerize the Web (Nginx SPA + API proxy)

As a maintainer,
I want the Vite SPA to be served via an Nginx container that also proxies API requests,
So that the web app works in production without any source code changes.

**Acceptance Criteria:**

**Given** a `packages/web/Dockerfile` exists
**When** I build the image from the monorepo root
**Then** the build succeeds via a multi-stage build (builder → nginx runtime)
**And** the runtime image is based on `nginx:alpine` serving the Vite `dist/` output

**Given** the Nginx container is running
**When** a request arrives at `/todos` or `/users`
**Then** Nginx proxies the request to the `api` service

**Given** the Nginx container is running
**When** a request arrives for any non-API path (including SPA deep links)
**Then** Nginx falls back to `index.html` (SPA routing)

**Given** a `packages/web/nginx.conf` exists
**When** I inspect its contents
**Then** it proxies `/todos` and `/users` to `http://api:${API_PORT}` and serves the SPA for all other routes

**Technical notes:**

- Nginx listens on port 80 inside the container (host port mapped in Compose)
- The API upstream address uses the Docker Compose internal service name `api`; port is configurable via `envsubst` at container startup
- No changes to `packages/web/src/` — relative paths (`/todos`, `/users`) already work with the proxy

### Story 5.3: Docker Compose production orchestration

As a maintainer,
I want a single `docker-compose.prod.yml` that brings up the full stack,
So that I can run the deployed app locally or on a server with one command.

**Acceptance Criteria:**

**Given** `docker-compose.prod.yml` at the project root
**When** I run `docker compose -f docker-compose.prod.yml up`
**Then** three services start: `db` (Postgres 16 Alpine), `api` (Fastify), `web` (Nginx)

**Given** the `db` service
**When** it starts
**Then** a named volume provides data persistence across container restarts
**And** a health check confirms Postgres is ready before the API starts

**Given** the `api` service
**When** it starts
**Then** it depends on `db` being healthy and reads `DATABASE_URL`, `API_PORT`, and `WEB_ORIGIN` from `.env.prod` (git-ignored)

**Given** the `web` service
**When** it starts
**Then** it depends on `api` and proxies API requests to it via the Docker Compose internal network

**Given** an `.env.prod.example` at project root
**When** I inspect it
**Then** it documents all required environment variables with placeholder values (no real secrets committed)

**Technical notes:**

- `.env.prod` is git-ignored; `.env.prod.example` is committed as documentation
- `docker-compose.yml` (existing dev Postgres setup) is unchanged
- Update `README.md` with a "Deployment" section covering the `docker-compose.prod.yml` workflow and required env vars
- Optional convenience root scripts: `docker:build` (`docker compose -f docker-compose.prod.yml build`) and `docker:up` (`docker compose -f docker-compose.prod.yml up`)

## Epic 6: User Authentication

Replace the `x-user-id` placeholder header with a real authentication flow. A user can register an account, log in, and have their todos scoped to their authenticated identity.

Auth strategy is selected via a design spike (Story 6.0) before any implementation begins.

### Story 6.0: Auth design spike — evaluate and decide auth strategy

As a maintainer,
I want a documented, evaluated decision on the authentication approach,
So that implementation stories are built on a well-reasoned foundation with no surprise pivots.

**Acceptance Criteria:**

**Given** the four candidate approaches (DIY JWT, Better Auth, Clerk, session-based)
**When** the design spike is complete
**Then** an ADR exists at `docs/decisions/adr-auth-strategy.md` covering:
  - Problem statement and constraints (stack: Fastify, Drizzle, Postgres, React; Docker; learning goals)
  - Each option evaluated: implementation effort, security surface, vendor risk, DX
  - Selected approach with explicit rationale
  - How the `x-user-id` placeholder will be replaced
  - DB schema changes required (e.g. `email`, `password_hash` on `users`, or external provider mapping)
  - API surface sketch: new routes (e.g. `POST /api/auth/register`, `POST /api/auth/login`, `POST /api/auth/logout`)
  - Web client changes: how the token/session is stored and attached to requests
  - UX implications: login/register screens, session persistence, redirect behavior

**Technical notes:**

- Options to evaluate:
  - **A — DIY JWT** (`@fastify/jwt` + bcrypt): full control, max learning value, zero cost — own the security surface
  - **B — Better Auth**: TS-first library with Drizzle adapter, email/password + OAuth support
  - **C — Clerk**: external service, pre-built React UI, verifies JWTs via JWKS — best DX, vendor lock-in
  - **D — Session-based** (`@fastify/session` + `@fastify/cookie`): simple, stateful, needs session store
- Primary candidates: A and B (stack-native, no vendor lock-in)
- Consider Option C only if speed-to-value outweighs learning goals
- After ADR is approved, create implementation stories 6.1+ via `bmad-create-story`
