# Story 1.3: Implement shared contracts (Todo type, constants, ApiErrorResponse)

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a developer,
I want shared types and constants used by both API and web,
So that validation and contracts stay consistent.

## Acceptance Criteria

1. **Given** the `src/shared` workspace exists
   **When** I add shared exports for `MAX_TODO_TEXT_LENGTH`, `Todo`, and `ApiErrorResponse`
   **Then** both `src/api` and `src/web` can import these without Node/DOM coupling
   **And** `MAX_TODO_TEXT_LENGTH` is set to 200 and used as the single source of truth

## Tasks / Subtasks

- [x] Add dedicated shared contract modules in `src/shared/src` (AC: 1)
  - [x] Create `constants.ts` exporting `MAX_TODO_TEXT_LENGTH = 200`
  - [x] Create `types.ts` exporting `Todo` and `ApiErrorResponse`
  - [x] Ensure types model API JSON fields in `camelCase` (`createdAt`, `updatedAt`, `deletedAt`)
  - [x] Ensure `ApiErrorResponse` supports stable machine code + display message + optional `requestId` + optional structured `details`

- [x] Wire stable package exports from `src/shared/src/index.ts` (AC: 1)
  - [x] Re-export `MAX_TODO_TEXT_LENGTH`, `Todo`, `ApiErrorResponse` from `index.ts`
  - [x] Keep exports type-safe (`export type` for type-only exports)
  - [x] Avoid runtime side effects in shared package entrypoints

- [x] Consume shared contracts in API workspace (AC: 1)
  - [x] Add package dependency linkage from `src/api` to `@bmad-todo/shared`
  - [x] Replace local/inline contract definitions with imports from shared workspace
  - [x] Keep Fastify route schema/output behavior aligned with shared contracts (no `{ data: ... }` wrapper)

- [x] Consume shared contracts in web workspace (AC: 1)
  - [x] Add package dependency linkage from `src/web` to `@bmad-todo/shared`
  - [x] Ensure existing generated API types/helpers can interoperate with shared contract types
  - [x] Use `MAX_TODO_TEXT_LENGTH` from shared package (no duplicated constants)

- [x] Validate workspace/build/test integration (supports AC: 1)
  - [x] `npm -w src/shared run build` succeeds and emits expected artifacts
  - [x] `npm run type:check` succeeds across workspaces
  - [x] `npm test` / `npm run test:ci` remains green after shared contract adoption

- [x] Preserve contract automation expectations (supports downstream Stories 1.4/1.5)
  - [x] Keep `src/api/openapi.json` as generated/committed contract artifact
  - [x] Keep web generated API artifacts in sync when API schemas evolve

## Dev Notes

### Story Intent and Scope Boundary

- This story defines and centralizes **shared contract primitives only** (`MAX_TODO_TEXT_LENGTH`, `Todo`, `ApiErrorResponse`).
- Do **not** implement GET/POST route behavior here (that belongs to Stories 1.4 and 1.5).
- Keep this as a low-risk contract foundation to reduce duplication and drift before API/web features expand.

### Current Codebase Intelligence (Important)

- `src/shared/src/index.ts` currently exports nothing (`export {}`), so shared contracts are not yet available.
- API currently has placeholder `/todos` route returning `501` and not-yet-final response schema.
- OpenAPI currently includes `/todos` with default `501` response only; later stories will harden this.
- Drizzle `todos` schema already exists with `createdAt`, `updatedAt`, `deletedAt` model fields and snake_case DB mapping.

### Contract Definitions to Standardize in Shared

- **`MAX_TODO_TEXT_LENGTH`**
  - Value: `200`
  - Source-of-truth for both web and API validation semantics.

- **`Todo`** (API JSON-facing)
  - Required: `id`, `text`, `completed`, `createdAt`, `updatedAt`
  - Optional/nullable: `deletedAt`
  - Keep JSON fields `camelCase` to match API contract.

- **`ApiErrorResponse`**
  - Required: `code`, `message`
  - Optional: `requestId`
  - Optional: `details[]` object entries with keys such as `field`, `min`, `max`, `reason`
  - Error shape must remain stable for UX/global error handling and validation rendering.

### Architecture and Implementation Guardrails

- TypeScript-only remains mandatory (`allowJs: false` already configured at base level).
- Shared workspace must remain platform-agnostic (no Node-only APIs, no DOM-only types).
- Keep API JSON contract style: direct resources and stable error bodies; no extra envelope.
- DB remains snake_case but API/shared contracts remain camelCase.
- Avoid introducing external state/data libraries or unrelated dependencies in this story.

### Suggested File Targets

- `src/shared/src/constants.ts`
- `src/shared/src/types.ts`
- `src/shared/src/index.ts`
- `src/shared/package.json` (only if export map/types/build references need alignment)
- `src/api/package.json` and `src/web/package.json` (workspace dependency on `@bmad-todo/shared`)
- API/web source files that currently duplicate or locally define these contracts

### Testing and Validation Requirements

- Keep tests deterministic; do not introduce network dependence.
- Follow project convention: Vitest tests should use nested `describe` → `it` blocks.
- At minimum, verify type/build integrity after refactor:
  - shared build
  - workspace typecheck
  - existing test suites still pass

### Cross-Story Context (Why This Matters)

- Story 1.4 depends on `Todo` + `ApiErrorResponse` for GET `/todos` response/error contract.
- Story 1.5 depends on `MAX_TODO_TEXT_LENGTH` + `ApiErrorResponse` for POST validation/error details.
- Getting these contracts right now prevents drift and regression across subsequent API/web implementation stories.

### Risks to Avoid

- Duplicating `MAX_TODO_TEXT_LENGTH` locally in API or web.
- Defining `Todo` with DB naming (`created_at`) instead of API naming (`createdAt`).
- Creating shared types that import Fastify/React/Node runtime-specific symbols.
- Expanding scope into endpoint behavior or UI implementation in this story.

### References

- Epic story definition and AC: [Source: _bmad-output/planning-artifacts/epics.md#Story 1.3: Implement shared contracts (Todo type, constants, ApiErrorResponse)]
- Downstream dependency context: [Source: _bmad-output/planning-artifacts/epics.md#Story 1.4: Implement GET /todos with ordering, soft-delete filtering, and error contract], [Source: _bmad-output/planning-artifacts/epics.md#Story 1.5: Implement POST /todos with validation and stable validation errors]
- Shared constants and API contract guidance: [Source: _bmad-output/planning-artifacts/architecture.md#Data Architecture], [Source: _bmad-output/planning-artifacts/architecture.md#API & Communication Patterns]
- Error contract and request ID propagation: [Source: _bmad-output/planning-artifacts/architecture.md#Error response contract (stable `code` + displayable `message`)], [Source: _bmad-output/planning-artifacts/architecture.md#requestId propagation:]
- Existing implementation baseline and project conventions: [Source: _bmad-output/implementation-artifacts/1-2-provision-local-postgres-drizzle-baseline-and-todos-schema.md#Dev Notes], [Source: project-context.md#Testing Practices]

## Dev Agent Record

### Agent Model Used

GPT-5.3-Codex

### Debug Log References

- `npm -w src/shared run build`
- `npm run source:check`
- `npm run test:ci`
- `npm run build:openapi`
- `npm run build:api-types`

### Completion Notes List

- Added shared contract modules with `MAX_TODO_TEXT_LENGTH = 200`, `Todo`, `ApiErrorDetail`, and `ApiErrorResponse`.
- Kept shared exports type-safe via `src/shared/src/index.ts` and aligned shared package export metadata for built artifacts.
- Linked API and web workspaces to `@bmad-todo/shared` and consumed shared contracts in both workspaces.
- Updated API `/todos` placeholder schema/response to use stable error body (`code`, `message`, optional `requestId`, optional `details`) and aligned API test expectations.
- Added web contract adapter module and used shared max length constant in UI, with updated web test assertion.
- Regenerated contract artifacts (`src/api/openapi.json`, `src/web/src/api/generated/index.ts`) and validated build, lint, typecheck, and CI tests.

### File List

- \_bmad-output/implementation-artifacts/1-3-implement-shared-contracts-todo-type-constants-apierrorresponse.md
- \_bmad-output/implementation-artifacts/sprint-status.yaml
- src/api/openapi.json
- src/api/package.json
- src/api/src/routes/todos.ts
- src/api/test/todos.get.test.ts
- src/shared/package.json
- src/shared/src/constants.ts
- src/shared/src/index.ts
- src/shared/src/types.ts
- src/shared/tsconfig.build.json
- src/web/package.json
- src/web/src/App.test.tsx
- src/web/src/App.tsx
- src/web/src/contracts.ts

## Change Log

- 2026-03-28: Implemented shared contract foundation for Story 1.3, adopted contracts in API and web, regenerated contract artifacts, and passed validation gates (`source:check`, `test:ci`).
