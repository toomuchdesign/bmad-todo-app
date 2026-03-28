# Story 1.4: Implement GET /todos with ordering, soft-delete filtering, and error contract

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a user,
I want my todos to load when I open the app,
so that I can immediately see what I need to do.

## Acceptance Criteria

1. **Given** the API is running and the database contains active and soft-deleted todos  
   **When** I call `GET /todos`  
   **Then** the response is `200` with `{ todos: Todo[] }`  
   **And** the returned todos are ordered by `createdAt` descending  
   **And** todos with `deletedAt` set are excluded

2. **Given** the API receives a request  
   **When** it responds (success or error)  
   **Then** it includes an `x-request-id` response header

3. **Given** the API encounters an unexpected failure  
   **When** it responds with an error  
   **Then** the JSON body follows `ApiErrorResponse` with a stable `code` and displayable `message`  
   **And** `requestId` is present in the error body when available

## Tasks / Subtasks

- [x] Implement DB-backed `GET /todos` route behavior in `src/api/src/routes/todos.ts` (AC: 1)
  - [x] Replace temporary `501 NOT_IMPLEMENTED` response
  - [x] Query `todos` from Postgres via Drizzle, filtering out soft-deleted rows (`deleted_at IS NULL`)
  - [x] Enforce newest-first sort (`created_at DESC`)
  - [x] Return `200` body shape as `{ todos: Todo[] }` (no array root, no extra envelope)

- [x] Wire API runtime DB access pattern in API workspace (AC: 1)
  - [x] Add a DB client module under `src/api/src/db` (or equivalent existing pattern) and consume validated config
  - [x] Keep DB naming (`snake_case`) mapped to API JSON (`camelCase`) without leaking DB fields
  - [x] Ensure timestamp fields returned to API clients are serialized as strings compatible with shared `Todo`

- [x] Implement request ID propagation for all responses (AC: 2)
  - [x] Add/register request-id handling so every response includes `x-request-id`
  - [x] Reuse inbound `x-request-id` when provided, otherwise generate one
  - [x] Keep behavior centralized (plugin/hook), not duplicated per route

- [x] Implement centralized unexpected-error mapping to shared error contract (AC: 3)
  - [x] Add/register error handling that emits stable `ApiErrorResponse`
  - [x] Map unexpected errors to `500` with `code = INTERNAL_ERROR` and user-displayable `message`
  - [x] Include `requestId` in error body when available

- [x] Align route schemas and OpenAPI generation with implemented behavior (AC: 1, 2, 3)
  - [x] Update route response schema for `GET /todos` to `200: { todos: Todo[] }`
  - [x] Add error schemas/statuses needed for this story (at minimum `500` shared error contract)
  - [x] Keep `@fastify/type-provider-json-schema-to-ts` type inference consistent with runtime response
  - [x] Regenerate and commit `src/api/openapi.json`

- [x] Add/upgrade integration tests for API contract and behavior (AC: 1, 2, 3)
  - [x] Replace temporary `501` test with green-path `200` contract test for `{ todos: Todo[] }`
  - [x] Add test proving soft-deleted rows are excluded
  - [x] Add test proving newest-first ordering by `createdAt`
  - [x] Add test proving `x-request-id` header exists on success and on error
  - [x] Add test proving unexpected failure returns stable `ApiErrorResponse` including `requestId`
  - [x] Keep Vitest style nested `describe` → `it` and AAA structure

- [x] Validate and gate quality before handoff (supports AC: 1, 2, 3)
  - [x] Run `npm run type:check`
  - [x] Run `npm run biome:check`
  - [x] Run `npm run test:ci`
  - [x] Run `npm run build:openapi`
  - [x] Ensure generated contract artifacts are committed

### Review Findings

- [x] [Review][Patch] Document `x-request-id` response headers in route/OpenAPI contract [src/api/src/routes/schemas.ts:29]
- [x] [Review][Patch] Add error-path test for generated `x-request-id` when inbound header is absent [src/api/test/todos.get.test.ts:95]

## Dev Notes

### Story Scope and Intent

- This story is API-only and establishes the first production-ready `/todos` read path.
- It must replace placeholder behavior while preserving architecture invariants for future stories (`POST`, `PATCH`, `DELETE`).
- Keep scope tight: do not implement mutation endpoints here.

### Current Baseline (from existing code)

- `GET /todos` currently returns `501` with `{ code: "NOT_IMPLEMENTED", message: "Not implemented" }`.
- Route schema for `GET /todos` currently advertises `200` as an array root, but required shape is `{ todos: Todo[] }`.
- No request-id plugin/hook is currently visible in API runtime.
- No centralized error-handler plugin is currently visible in API runtime.
- DB schema already exists with `deletedAt`, `createdAt`, `updatedAt` mappings.

### Architecture Compliance Guardrails (must follow)

- API response shape rules:
  - `GET /todos` must return `{ todos: Todo[] }`.
  - No `{ data: ... }` envelope.
- Naming rules:
  - DB columns/tables are `snake_case`.
  - API JSON contracts are `camelCase`.
- Error contract:
  - Use shared `ApiErrorResponse` shape (`code`, `message`, optional `requestId`, optional `details`).
  - For unexpected failures, return `500` + stable machine code + displayable message.
- Request-id rule:
  - `x-request-id` must be present in every response (success and error).
- Contract synchronization:
  - API route schemas are the contract source of truth.
  - Any schema change requires regenerated `src/api/openapi.json` in the same change set.

### Implementation Hints for Fast, Correct Delivery

- Prefer centralized request-id + error handling registration in app bootstrap (`buildApp`) rather than per-route logic.
- Route handler should focus on query + mapping only:
  - Filter `deleted_at IS NULL`
  - Order by `created_at DESC`
  - Return mapped rows in shared `Todo` shape
- Keep generated OpenAPI stable and deterministic by relying on route schemas only.

### Previous Story Intelligence (Story 1.3)

- Shared contracts already exist and should be reused (`Todo`, `ApiErrorResponse`) instead of redefining local types.
- Story 1.3 updated API route/schema setup and shared dependency links; continue that pattern.
- Contract artifacts are already integrated into workflow (`build:openapi`, `build:api-types`), so this story must keep them synchronized.

### Git Intelligence Summary (recent commits)

- `fix: shared dep version`: workspace dependency alignment changed in API/web package manifests.
- `refactor: add @fastify/type-provider-json-schema-to-ts`: route schema typing approach was recently standardized.
- `feat: implement story 1.3`: shared contracts and route contract groundwork were introduced.

**Implication:** do not bypass shared types or type-provider-based route schemas.

### File Structure Requirements

Primary files likely touched:

- `src/api/src/app.ts`
- `src/api/src/routes/todos.ts`
- `src/api/src/routes/schemas.ts`
- `src/api/src/db/*` (new client/query helpers as needed)
- `src/api/test/todos.get.test.ts`
- `src/api/openapi.json`

Potential new plugin files (if created):

- `src/api/src/plugins/request-id.ts`
- `src/api/src/plugins/error-handler.ts`

### Testing Requirements

- API tests should use `fastify.inject()` and remain deterministic.
- Test setup should use DB reset conventions already established (no public reset endpoint).
- Assertions should verify observable contract behavior, not internal implementation details.
- Mandatory project rule: nested `describe` → `it`, with clear AAA sections.

### Cross-Story Dependencies

- Story 1.6 (web load states + retry) depends directly on this endpoint returning stable `200 { todos: Todo[] }` and stable error payloads.
- Story 1.7 (create flow) and Epic 2 mutation flows depend on request-id/error conventions established here.

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story 1.4: Implement GET /todos with ordering, soft-delete filtering, and error contract]
- [Source: _bmad-output/planning-artifacts/architecture.md#API & Communication Patterns]
- [Source: _bmad-output/planning-artifacts/architecture.md#Implementation Patterns & Consistency Rules]
- [Source: _bmad-output/planning-artifacts/architecture.md#Project Structure & Boundaries]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#States & Behaviors]
- [Source: _bmad-output/implementation-artifacts/1-3-implement-shared-contracts-todo-type-constants-apierrorresponse.md#Completion Notes List]
- [Source: project-context.md#Testing Practices]

## Dev Agent Record

### Agent Model Used

GPT-5.3-Codex

### Debug Log References

- `npm -w src/api run test:ci`
- `npm run build:openapi`
- `npm run type:check`
- `npm run biome:check`
- `npm run source:fix`
- `npm run test:ci`

### Completion Notes List

- Replaced placeholder `GET /todos` handler with DB-backed implementation returning `{ todos: Todo[] }`.
- Added DB client/query modules to fetch non-deleted todos ordered by `created_at DESC` and map DB timestamps to API ISO strings.
- Implemented centralized request-id propagation and centralized unexpected error mapping in app bootstrap, producing `500` `ApiErrorResponse` with `INTERNAL_ERROR` and `requestId`.
- Updated route schemas and regenerated `src/api/openapi.json` to reflect `200 { todos: Todo[] }` and shared `500` error contract.
- Reworked API integration tests to verify success contract, soft-delete filtering, ordering, request-id behavior on success/error, and stable unexpected-error mapping.
- Ran and passed all quality gates: `npm run type:check`, `npm run biome:check`, `npm run test:ci`, and `npm run build:openapi`.

### File List

- \_bmad-output/implementation-artifacts/1-4-implement-get-todos-with-ordering-soft-delete-filtering-and-error-contract.md
- \_bmad-output/implementation-artifacts/sprint-status.yaml
- src/api/openapi.json
- src/api/src/app.ts
- src/api/src/db/client.ts
- src/api/src/db/todos.ts
- src/api/src/plugins/error-handler.ts
- src/api/src/plugins/request-id.ts
- src/api/src/routes/schemas.ts
- src/api/src/routes/todos.ts
- src/api/test/todos.get.test.ts

## Change Log

- 2026-03-28: Implemented Story 1.4 API read path and cross-cutting contracts (DB-backed `GET /todos`, request-id propagation, centralized error contract), updated OpenAPI, and passed all validation gates.
