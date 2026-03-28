---
stepsCompleted: [1, 2, 3, 4]
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

## Epic 2: Manage Existing Todos (Edit + Complete + Delete)

Deliver the remaining CRUD actions with correct API behavior and UX patterns: inline editing, completion toggles, and soft delete, all with predictable rollback and error handling.

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

## Epic 3: Shippable Quality Bar (Tests + Accessibility)

Deliver the required automated coverage of MVP flows (success and failure), plus baseline accessibility/operability and deterministic dev/test ergonomics.

### Story 3.1: API integration tests for todos endpoints (success + failure)

As a maintainer,
I want fast API integration tests against a deterministic database,
So that API behavior stays correct as the UI evolves.

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

**Acceptance Criteria:**

**Given** MSW intercepts HTTP requests at the network boundary
**When** I run web tests
**Then** tests cover: initial load success, initial load failure with Retry, empty state, create validation, create success, and create failure showing global error

### Story 3.3: End-to-end tests covering all PRD MVP flows (success and failure)

As a maintainer,
I want E2E tests that exercise the real app,
So that the MVP flows are validated end-to-end.

**Acceptance Criteria:**

**Given** the app can run locally
**When** I run Playwright E2E tests
**Then** the suite covers: load success, load failure + retry, create with validation failure, create success, edit success/failure, toggle success/failure, delete success/failure

**Given** E2E tests must be deterministic
**When** the Playwright suite starts
**Then** the todos table is reset via the DB reset script (not via a public reset API endpoint)

### Story 3.4: Accessibility and focus behavior baseline

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
