# Story 1.2: Provision local Postgres + Drizzle baseline and Todos schema

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a maintainer,
I want a local database and migrations in place for todos,
So that the API can persist data durably and deterministically.

## Acceptance Criteria

1. **Given** the repo has an API workspace
   **When** I start the local database (e.g., via `docker-compose.yml`)
   **Then** Postgres is reachable using `DATABASE_URL`

2. **Given** Drizzle schema is implemented
   **When** I generate and apply migrations
   **Then** a `todos` table exists with `id`, `text`, `completed`, `created_at`, `updated_at`, and `deleted_at`
   **And** soft delete is represented by `deleted_at` being null/non-null

3. **Given** local development and automated tests need deterministic resets
   **When** I run the DB reset utility
   **Then** it truncates the `todos` table via a script (not an API endpoint)
   **And** it is exposed via an API workspace script (e.g., `db:reset`)

## Tasks / Subtasks

- [x] Add root-level `docker-compose.yml` that provisions Postgres for local dev (AC: 1)
- [x] Document/standardize `DATABASE_URL` format for local dev (AC: 1)
- [x] Add Drizzle ORM + Drizzle Kit baseline to `src/api` (AC: 2)
- [x] Implement Drizzle schema for `todos` with required columns (AC: 2)
- [x] Add migration generation + migration apply scripts (AC: 2)
- [x] Add DB reset script (`db:reset`) that truncates `todos` (AC: 3)
- [x] Smoke-check: build + typecheck + tests still pass (supports ACs)

## Dev Notes

- No public reset endpoint.
- DB naming must be `snake_case`; JSON stays `camelCase`.

## Dev Agent Record

### Agent Model Used

GPT-5.2
