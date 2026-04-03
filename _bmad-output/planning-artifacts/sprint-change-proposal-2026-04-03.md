# Sprint Change Proposal — 2026-04-03

## Issue Summary

A brainstorming session and product discussion identified the need to split the single `text` field on todos into a required `title` (short, ≤100 chars) and optional `text` (description, ≤500 chars). This emerged before Epic 3 starts, making it an ideal time to introduce the change with zero rollback risk.

**Category:** New requirement from stakeholder
**Evidence:** Brainstorming session (brainstorming-session-2026-04-03-001.md) + product discussion

## Impact Analysis

### Epic Impact

- **Epic 1 (done):** No changes — story 3.0 handles migration of existing data
- **Epic 2 (done):** No changes — existing CRUD behavior preserved with expanded fields
- **Epic 3 (backlog):** New story 3.0 inserted before 3.1. Stories 3.1–3.3 unchanged structurally; their scope implicitly covers the new fields since they reference "MVP flows"

### Artifact Conflicts

| Artifact | Sections Affected | Severity |
|----------|-------------------|----------|
| PRD | FR2, FR3, FR6, FR7 — "text" references expand to "title and text" | Low |
| Architecture | Data model, constants, API contracts, shared Todo type | Medium |
| UX Design | AddTodoForm (textarea), TodoItem (visual hierarchy), edit mode (Ctrl+Enter) | Medium |
| Epics | Add story 3.0, update Epic 3 description | Low |
| Sprint Status | Add story entry | Low |

## Recommended Approach

**Direct Adjustment** — Insert story 3.0 at the beginning of Epic 3.

**Rationale:** Epic 3 is still in backlog. The change is well-scoped (single vertical slice), has clear design decisions already made, and benefits from being implemented before the testing stories which will then automatically validate the new fields.

**Effort:** Medium | **Risk:** Low | **Timeline impact:** +1 story to Epic 3

## Detailed Change Proposals

### Epic 3: Add Story 3.0

**OLD:** Epic 3 starts with Story 3.1 (API integration tests)

**NEW:** Epic 3 starts with Story 3.0 (Add title field), then proceeds to 3.1–3.3

### Story 3.0: Add title field to todos with text as optional description

As a user,
I want each todo to have a distinct title and optional description text,
So that I can quickly scan my todo list by title and add details when needed.

**Acceptance Criteria:**

Given the existing todos table with a `text` column
When the migration runs
Then the `text` column is renamed to `title` and a nullable `text` column is added

Given a user creates a todo via the single textarea input
When they type content and submit
Then the first line becomes the required title (≤100 chars) and remaining lines become optional text (≤500 chars)

Given a todo is displayed in the list
When it has both title and text
Then the title is rendered with primary visual weight and the text below it with secondary (smaller, muted) styling

Given a user edits a todo inline
When the textarea opens
Then it is pre-populated with title on the first line and text on subsequent lines, and Ctrl+Enter/Cmd+Enter saves while Enter inserts newlines

Given the API contract
When POST /todos is called
Then the body accepts `{ title: string, text?: string }` with title required (1-100 chars) and text optional (1-500 chars)

Given the API contract
When PATCH /todos/:id is called
Then the body accepts optional `{ title?, text?, completed? }` with the same length constraints

Given the shared Todo type
When any package references it
Then `title` is a required string and `text` is `string | null`

**Technical notes:**
- DB migration: `ALTER TABLE todos RENAME COLUMN "text" TO "title"; ALTER TABLE todos ADD COLUMN "text" text;`
- Constants: `MAX_TODO_TITLE_LENGTH = 100`, `MAX_TODO_TEXT_LENGTH = 500`
- Text stored as plain string — no constraints blocking future markdown/formatting support
- All existing tests updated to reflect the new schema

### PRD Updates

**FR2:** "Users can create a todo by submitting text" → "Users can create a todo by submitting a title and optional description text"

**FR3:** "Users can edit the text of an existing todo" → "Users can edit the title and description text of an existing todo"

**FR6:** "Users receive inline validation when attempting to create or edit a todo with empty/whitespace-only text" → "...with empty/whitespace-only title"

**FR7:** "Users receive inline validation when todo text violates length constraints" → "...when todo title or text violates length constraints"

### Architecture Updates

- Data model: `text` column → `title` (NOT NULL) + `text` (nullable)
- Constants: `MAX_TODO_TITLE_LENGTH = 100`, `MAX_TODO_TEXT_LENGTH = 500`
- Shared Todo type: add `title` (required string), `text` (string | null)
- API POST body: `{ title: string, text?: string }`
- API PATCH body: `{ title?: string, text?: string, completed?: boolean }`

### UX Design Updates

- AddTodoForm: Replace input with textarea; first line = title, remaining = text
- TodoItem read mode: Title at current size/weight (primary), text smaller and muted (secondary)
- TodoItem edit mode: Textarea with Ctrl+Enter/Cmd+Enter to save, Enter for newlines
- Future-proofing: plain text storage, no constraints blocking markdown rendering later

## Implementation Handoff

**Scope: Minor** — Direct implementation by development team.

| Role | Responsibility |
|------|----------------|
| Scrum Master | Create story 3.0 file, update sprint status |
| Developer | Implement story 3.0 (DB migration → shared types → API → UI → tests) |

**Success criteria:** All existing tests pass with updated schema; new fields validated end-to-end; visual hierarchy visible in UI.
