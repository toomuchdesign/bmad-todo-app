# Sprint Change Proposal — 2026-04-07

## Issue Summary

After Story 3.0 introduced the `text` (description) field alongside `title`, the edit trigger UX was not updated to account for the new field. Currently, only the title is wrapped in a `<button>` that triggers edit mode. The description renders as a plain `<span>` — not clickable for editing — creating a confusing dead zone in the UI.

Additionally, the focus-on-enter-edit logic is fully imperative (useEffect + ref.focus). This proposal also replaces it with declarative `autoFocus` on the conditionally-rendered inputs.

**Category:** Gap from Story 3.0 implementation — edit trigger not extended to new field
**Evidence:** Visual inspection of TodoItem read mode; description text is not interactive

## Impact Analysis

### Epic Impact

- **Epic 1 (done):** No changes
- **Epic 2 (done):** No changes — existing edit behavior preserved, extended to description
- **Epic 3 (in-progress):** No new stories. Change is a UX fix within existing scope

### Artifact Conflicts

| Artifact | Sections Affected | Severity |
|----------|-------------------|----------|
| PRD | None — FR3 already expects both fields editable | None |
| Architecture | None — no API/data model changes | None |
| UX Design | "Tap/click todo text to enter edit mode" — change makes implementation match intent | None |
| Epics | Story 2.2 AC: "tap/click the todo text" — now covers description too | None |

## Recommended Approach

**Direct Adjustment** — Small, self-contained UX fix within existing completed stories. No rollback, no MVP scope change.

**Effort:** Low | **Risk:** Low | **Timeline impact:** None

## Detailed Change Proposals

### 1. `useTodoEdit.ts` — Add focus target to edit state

Add `EditFocusTarget = "title" | "text"` type and `focusTarget` field to `TodoEditState`. Update `startEdit()` to accept `{ focusTarget }` parameter (defaults to `"title"`).

### 2. `TodoItem.tsx` — Declarative focus + clickable description

- Description `<span>` becomes a `<button>` for incomplete todos (same pattern as title button)
- Completed todos keep `<span>` for both title and description (no edit trigger)
- Replace imperative `useEffect` focus-on-enter-edit with `autoFocus` prop on inputs:
  - Title input: `autoFocus={todoEdit.focusTarget === "title"}`
  - Textarea: `autoFocus={todoEdit.focusTarget === "text"}`
- Each button independently calls `startEdit({ focusTarget: "title" | "text" })`

### 3. `TodoItem.module.css` — Description button style

Add `.descriptionButton` with `all: unset`, `cursor: pointer`, and focus-visible outline. Combined with existing `.description` class for visual styling.

### 4. `TodoItem.test.tsx` — Test coverage

- Description renders as clickable button for incomplete todos
- Description renders as non-clickable span for completed todos
- Clicking description enters edit mode with textarea focused

## Implementation Handoff

**Scope: Minor** — Direct implementation by development team.

| Role | Responsibility |
|------|----------------|
| Developer | Implement all four changes (hook, component, CSS, tests) |

**Success criteria:** All existing tests pass; new tests pass; clicking description enters edit mode with textarea focused; clicking title still focuses title input; completed todos remain non-editable.
