# Story 1.5: Implement POST /todos with validation and stable validation errors

Status: ready-for-dev

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a user,
I want to add a new todo,
so that I can capture tasks quickly.

## Acceptance Criteria

1. **Given** the API is running  
   **When** I call `POST /todos` with valid text  
   **Then** it returns `200` (or `201`) with the created `Todo`  
   **And** server-assigned timestamps are present

2. **Given** the request text is empty or whitespace-only  
   **When** I call `POST /todos`  
   **Then** it returns `400` with `code = VALIDATION_ERROR`  
   **And** the `message` is suitable for user display  
   **And** the error `details` can include the field and limits

3. **Given** the request text exceeds `MAX_TODO_TEXT_LENGTH`  
   **When** I call `POST /todos`  
   **Then** it returns `400` with `code = VALIDATION_ERROR`  
   **And** the error `details` include `max = 200` (or the configured max)

## Tasks / Subtasks

- [ ] Implement `POST /todos` route contract in `src/api/src/routes/todos.ts` (AC: 1, 2, 3)
  - [ ] Add route registration and schema for `POST /todos` using the existing type-provider pattern
  - [ ] Accept JSON body with `text` field and return direct `Todo` resource (no `{ data: ... }` envelope)
  - [ ] Return success status (`201`) with server-assigned fields

- [ ] Add validation and stable error mapping for create payloads (AC: 2, 3)
  - [ ] Validate via route json schema rules and use native fastify validation error handling and messages
  - [ ] Extend `errorHandlerPlugin` to handle validation errors, return `400` with `code: "VALIDATION_ERROR"`
  - [ ] Trim `text` before persistence
  - [ ] Include user-displayable `message` and structured `details` (at minimum `field: "text"`, and `max: 200` for length failures)

- [ ] Add DB create helper with API-safe mapping in `src/api/src/db/todos.ts` (AC: 1)
  - [ ] Insert todo row with app-generated `id` and server-assigned timestamps (`created_at`, `updated_at`)
  - [ ] Keep DB naming (`snake_case`) internal and map outgoing JSON to shared `Todo` (`camelCase`)
  - [ ] Ensure `deletedAt` is returned as `null` for newly created rows

- [ ] Extend route schemas in `src/api/src/routes/schemas.ts` for `POST /todos` (AC: 1, 2, 3)
  - [ ] Add request-body schema for create payload
  - [ ] Add success response schema (`Todo`) and validation error schema (`400` using stable `ApiErrorResponse` shape)
  - [ ] Keep `x-request-id` header in success and error response schemas

- [ ] Add integration tests for create happy path and validation failures (AC: 1, 2, 3)
  - [ ] Create `src/api/test/todos.post.test.ts`
  - [ ] Verify valid create returns created `Todo` with server timestamps and expected shape
  - [ ] Verify empty/whitespace payload returns `400` + `VALIDATION_ERROR` + user-displayable message
  - [ ] Verify too-long payload returns `400` + `VALIDATION_ERROR` + `details.max = MAX_TODO_TEXT_LENGTH`
  - [ ] Verify `x-request-id` behavior remains correct (echo provided ID and generate when omitted)
  - [ ] Keep nested `describe` → `it` structure and clear AAA blocks

- [ ] Synchronize and verify API contract artifacts (supports AC: 1, 2, 3)
  - [ ] Regenerate `src/api/openapi.json` from route schemas
  - [ ] Ensure generated contract matches new `POST /todos` success/error shapes
  - [ ] Confirm no unrelated contract drift is introduced

- [ ] Run project validation gates before handoff
  - [ ] `npm run type:check`
  - [ ] `npm run biome:check`
  - [ ] `npm run test:ci`
  - [ ] `npm run build:openapi`

## Dev Notes

### Story Scope and Intent

- This story is API-focused and introduces the first mutation endpoint (`POST /todos`) for create behavior.
- It should build directly on Story 1.4 patterns (central request-id/error plugins, shared contract usage, deterministic API tests).
- Do not implement UI add flow here (that belongs to Story 1.7).

### Current Baseline (from existing code)

- `GET /todos` is already DB-backed and returns `{ todos: Todo[] }`.
- Request ID propagation and centralized unexpected error handling are already registered in `buildApp`.
- Route schema utilities already define reusable `apiErrorResponseSchema` and response header schema with `x-request-id`.
- Shared constants/types exist in `@bmad-todo/shared`, including `MAX_TODO_TEXT_LENGTH` and `ApiErrorResponse`.

### Architecture Compliance Guardrails (must follow)

- Keep API success response shape as direct resource (`Todo`) for `POST /todos`.
- Keep API JSON fields `camelCase`; do not leak DB `snake_case` fields.
- Keep validation contract stable: `400` + `code: "VALIDATION_ERROR"` + displayable `message` + optional `details`.
- Reuse shared constant `MAX_TODO_TEXT_LENGTH` from `src/shared`; do not duplicate `200` in multiple places except test assertions that intentionally verify behavior.
- Preserve `x-request-id` propagation by relying on existing plugin behavior, not per-route duplication.

### Implementation Hints for Fast, Correct Delivery

- Add a dedicated create helper in `src/api/src/db/todos.ts` to keep route handlers thin and consistent with existing list helper style.
- Reuse existing timestamp conversion helper(s) to keep output `createdAt`/`updatedAt` RFC 3339-compatible.
- For validation failures, return explicit reply in the route handler (expected domain error) rather than throwing unexpected errors.
- Keep schema-first contract: define request/response JSON schema first, then implement route logic to match.

### Previous Story Intelligence (Story 1.4)

- Story 1.4 established centralized request-id + error plugins and should remain the cross-cutting mechanism for this story.
- DB query logic and camelCase mapping patterns in `src/api/src/db/todos.ts` should be reused/extended rather than rewritten.
- API tests already validate request-id behavior on success/error paths; follow the same structure in new POST tests.

### Git Intelligence Summary (recent commits)

- `feat: implement story 1.4`: DB-backed GET route, request-id propagation, and stable unexpected-error mapping are now baseline.
- `refactor: add @fastify/type-provider-json-schema-to-ts`: route/schema typing has been standardized and should be preserved.
- `fix: shared dep version`: workspace dependency alignment recently changed; avoid package-level churn unless required.

**Implication:** implement POST by extending established patterns, not by introducing parallel abstractions.

### File Structure Requirements

Primary files expected to change:

- `src/api/src/routes/todos.ts`
- `src/api/src/routes/schemas.ts`
- `src/api/src/db/todos.ts`
- `src/api/test/todos.post.test.ts` (new)
- `src/api/openapi.json`

Potentially related support files (only if needed):

- `src/api/src/definitions/todo.ts` (if schema reuse needs expansion)
- `src/api/test/test-utils/todos.ts` (if helper additions are needed for assertions)

### Testing Requirements

- API tests must use `fastify.inject()` and remain deterministic (no external HTTP/network dependency).
- Follow project convention from `project-context.md`: nested `describe` → `it` with explicit Arrange/Act/Assert sections.
- Add focused tests for both validation failure categories (empty/whitespace and max length).
- Keep test DB cleanup centralized via existing global setup unless a local override is strictly required.

### Cross-Story Dependencies

- Story 1.7 (add form behavior, pending state, and safe failure handling) depends on this endpoint’s stable success payload and validation error shape.
- Story 2.1 (`PATCH /todos/:id`) should reuse the same validation semantics and error details conventions established here.

### Latest Technical Information

- Continue using the architecture-pinned stack/version baseline (Fastify 5.x, Drizzle ORM 0.45.x, TypeScript 6.x, shared contracts via npm workspaces).
- Keep JSON schema and OpenAPI generation aligned with route definitions to avoid drift between runtime and contract artifacts.

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story 1.5: Implement POST /todos with validation and stable validation errors]
- [Source: _bmad-output/planning-artifacts/architecture.md#API & Communication Patterns]
- [Source: _bmad-output/planning-artifacts/architecture.md#Data Architecture]
- [Source: _bmad-output/planning-artifacts/architecture.md#Architectural Boundaries]
- [Source: _bmad-output/planning-artifacts/architecture.md#Requirements → Structure Mapping]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Create Todo]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Length constraint handling (architecture-aligned)]
- [Source: _bmad-output/implementation-artifacts/1-4-implement-get-todos-with-ordering-soft-delete-filtering-and-error-contract.md#Completion Notes List]
- [Source: project-context.md#Testing Practices]

## Dev Agent Record

### Agent Model Used

GPT-5.3-Codex

### Debug Log References

- `N/A (story context created; implementation not started)`

### Completion Notes List

- Story context created with exhaustive architecture + epic + prior-story analysis.
- Implementation guardrails for `POST /todos` validation and stable error contract captured.
- Recommended task plan, file targets, and quality gates defined.
- Ready for `dev-story` execution.

### File List

- \_bmad-output/implementation-artifacts/1-5-implement-post-todos-with-validation-and-stable-validation-errors.md

## Change Log

- 2026-03-28: Created Story 1.5 comprehensive implementation context and marked as `ready-for-dev`.
