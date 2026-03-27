# Story 1.1: Initialize monorepo workspaces and tooling

Status: ready-for-dev

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a maintainer,
I want a scaffolded monorepo with web, api, and shared workspaces,
so that development can start consistently with the agreed architecture.

## Acceptance Criteria

1. **Given** an empty repo state (no `src/web`, `src/api`, `src/shared` yet)
   **When** I scaffold the workspaces using the selected starters (Vite React TS, Fastify TS)
   **Then** the repository contains `src/web`, `src/api`, and `src/shared` workspaces wired via npm workspaces
   **And** root scripts exist for `dev:web`, `dev:api`, `test`, `test:ci`, `test:e2e`, `build`, `type:check`, `biome:check`, `biome:fix`, `source:check`, `build:openapi`, and `build:api-types` (even if some are initially stubs)

2. **Given** the repo is scaffolded
   **When** I run `npm install`
   **Then** dependency installation succeeds with a single root lockfile

## Tasks / Subtasks

- [ ] Convert repo to npm workspaces (AC: 1)
  - [ ] Update root `package.json` to be workspace root:
    - `private: true`
    - `workspaces: ["src/*"]`
    - add root scripts per architecture contract: `dev:web`, `dev:api`, `test`, `test:ci`, `test:e2e`, `build`, `type:check`, `biome:check`, `biome:fix`, `source:check`
    - add contract scripts per architecture contract: `build:openapi`, `build:api-types`
    - prefer running workspace scripts via `npm -w src/web run ...` / `npm -w src/api run ...`
  - [ ] Add/record Node + npm expectations (engines or `.nvmrc`) so the repo matches the architecture’s runtime baseline

- [ ] Set up contract automation hooks (supports Epic 1; AC: 1)
  - [ ] Add `simple-git-hooks` and root `prepare` script to enable hooks
  - [ ] Configure `pre-commit` to run `build:openapi` and `build:api-types` and stage generated artifacts

- [ ] Scaffold the web workspace at `src/web` (AC: 1)
  - [ ] Create via Vite `react-ts` template (per architecture) and keep TypeScript-only
  - [ ] Ensure `src/web/package.json` exposes at least: `dev`, `build`, `test`, `test:ci`, `test:e2e`, `type:check`
  - [ ] Keep styling minimal and compatible with later CSS Modules usage (no UI kit)

- [ ] Scaffold the API workspace at `src/api` (AC: 1)
  - [ ] Generate Fastify TypeScript project (per architecture)
  - [ ] Ensure `src/api/package.json` exposes at least: `dev`, `build`, `start`, `test`, `test:ci`, `type:check`
  - [ ] Ensure the API can boot locally (even before DB work in Story 1.2)

- [ ] Create the shared workspace skeleton at `src/shared` (AC: 1)
  - [ ] Create `src/shared/package.json` + TypeScript config so other workspaces can depend on it
  - [ ] Add a minimal build/typecheck path (can be stubbed, but must not break installs)

- [ ] Establish repo-wide tooling guardrails (AC: 1)
  - [ ] Add Biome config and scripts that run at root
  - [ ] Add TypeScript configs that enforce `allowJs: false` across workspaces

- [ ] Prove the toolchain with smoke tests (supports Epic 3; AC: 1)
  - [ ] Web: add one minimal test that renders the App via React Testing Library
  - [ ] API: add one minimal test that boots the Fastify app instance (e.g., `await app.ready()`), without introducing extra public endpoints beyond `/todos`

- [ ] Verification checklist (AC: 2)
  - [ ] `npm install` succeeds and produces a single root lockfile
  - [ ] `npm run type:check` succeeds
  - [ ] `npm run biome:check` succeeds (or is present as a stub with clear TODO)
  - [ ] `npm test` runs web + api non-E2E tests

## Dev Notes

### Hard Requirements / Guardrails

- Workspaces layout is fixed for MVP: `src/web`, `src/api`, `src/shared`. Avoid introducing additional top-level packages or tooling unless required by the architecture.
- Keep dev scripts minimal: run `dev:web` and `dev:api` in separate terminals; do not add `concurrently` for MVP.
- Tooling contract is considered stable: keep script names exactly as documented, even if underlying commands evolve.
- Contract artifacts must be committed and kept in sync: `src/api/openapi.json` and web generated API types/client.
- TypeScript-only: enforce `allowJs: false` in all workspace `tsconfig.json`.

### Suggested High-Level Implementation Shape

- Root:
  - `package.json` (workspaces + scripts)
  - `biome.json` (or `biome.jsonc`) at repo root
  - `tsconfig.base.json` shared by workspaces (recommended)
- `src/web`:
  - Vite React TS app; Vitest + RTL setup
- `src/api`:
  - Fastify TS app; Vitest integration test setup
- `src/shared`:
  - TS project emitting types and/or ESM build as needed; keep it simple now (Story 1.3 will add actual exports)

### Common Pitfalls to Avoid

- Don’t hardcode duplicated constants in web/api; `src/shared` is the single-source-of-truth location (actual constants come in Story 1.3).
- Don’t add a root-level test runner that bypasses workspace scripts; prefer orchestration via `npm -w ...`.
- Don’t introduce extra libraries (Redux/React Query/UI kits) during scaffolding.

### References

- Epic story definition and acceptance criteria: [Source: _bmad-output/planning-artifacts/epics.md#Story 1.1]
- Monorepo + script contract, starter commands, and TS/Biome policies: [Source: _bmad-output/planning-artifacts/architecture.md#Starter Template Evaluation], [Source: _bmad-output/planning-artifacts/architecture.md#Development Tooling (Formatting/Linting)], [Source: _bmad-output/planning-artifacts/architecture.md#Canonical npm scripts (contract)]
- Version matrix / baseline package versions: [Source: _bmad-output/planning-artifacts/architecture.md#Version Matrix (verified at architecture time)]

## Dev Agent Record

### Agent Model Used

GPT-5.2

### Debug Log References

-

### Completion Notes List

-

### File List

-
