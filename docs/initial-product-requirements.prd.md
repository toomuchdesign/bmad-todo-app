---
title: Todo App PRD (MVP)
date: 2026-03-26
status: draft
sourceRequirements: docs/initial-product-requirements.md
---

# Todo App — Product Requirements Document (MVP)

## Executive Summary

Build a simple full-stack todo application for a single user to manage personal tasks.

Users can create, view, edit, complete/uncomplete, and delete todos. Todos persist across sessions via a backend API.

## Success Criteria (Measurable)

- **Core task success rate:** In a usability test (≥5 participants), ≥80% can (1) add a todo, (2) edit it, (3) mark it complete, (4) delete it, without reading documentation.
- **Time to first value:** A new user can add their first todo within **≤30 seconds** of first app load.
- **Perceived responsiveness:** After a user action (add/edit/complete/delete), the UI reflects the new state within **≤200ms** under normal conditions.
- **Initial load:** The initial screen becomes usable within **≤2 seconds p95** on a typical developer laptop and a modern mobile device on a normal network.
- **Durability:** Todos persist across page refresh and browser restart for the same user/device.

## Product Scope

### MVP In Scope

- Create todo with short text description
- View list of todos immediately on app open
- Edit todo text
- Toggle completion status
- Delete a todo (soft delete)
- Persist todos across sessions
- Sensible **empty**, **loading**, and **error** states
- Responsive UI (desktop and mobile)

### Explicitly Out of Scope (MVP)

- Authentication, user accounts, multi-user support
- Collaboration/sharing
- Priority, due dates, reminders/notifications
- Tags, projects, recurring tasks
- Search, sorting controls, filters (beyond basic default ordering)
- Rich text, attachments
- Offline-first mode (create/edit while offline, background sync)

## Assumptions & Constraints

- Single-user MVP with no authentication.
- The backend exposes a small, well-defined API responsible for persisting and retrieving todo data. The API supports basic CRUD operations and ensures data consistency and durability across user sessions.
- Offline-first mode is out of scope for MVP, but architecture must not prevent adding it later.
- Default list ordering is **newest created first** (`createdAt` descending).
- Max expected todo count for MVP: **1,000**.
- No specific compliance standard is required for MVP.

## User Journeys

### UJ-1: First Use (Empty State → First Todo)

1. User opens the app.
2. User sees an empty state explaining there are no todos and how to add one.
3. User enters todo text and submits.
4. New todo appears in the list as **active**.

### UJ-2: Edit a Todo

1. User edits the text of an existing todo.
2. The todo updates in the list.
3. `updatedAt` changes.

### UJ-3: Complete / Uncomplete a Todo

1. User toggles one todo to completed.
2. Completed todo becomes visually distinct from active todos.
3. User can toggle it back to active.

### UJ-4: Delete a Todo (Soft Delete)

1. User deletes a todo.
2. The todo disappears from the list.
3. The backend marks the todo as deleted (soft delete) so data can be retained.

### UJ-5: Refresh / Return Later

1. User refreshes the page or closes/reopens the browser.
2. The existing todo list loads and matches the last saved state.

## Functional Requirements (FR)

### Todo Data Model

- **FR-1 (Todo fields):** Each todo includes:
  - `id` (unique identifier)
  - `text` (1–200 characters after trimming)
  - `completed` (boolean)
  - `createdAt` (timestamp)
  - `updatedAt` (timestamp)
  - `deletedAt` (timestamp | undefined) to support soft delete

### Core Capabilities

- **FR-2 (List on load):** Users can view their todo list immediately on app open.
- **FR-3 (Create):** Users can create a todo by submitting text.
- **FR-4 (Edit):** Users can edit the text of an existing todo.
- **FR-5 (Validation):** The system rejects empty/whitespace-only todos and displays an inline validation message.
- **FR-6 (Toggle complete):** Users can mark a todo complete and uncomplete it.
- **FR-7 (Delete, soft):** Users can delete a todo; deletion is implemented as a soft delete.

### Persistence and Consistency

- **FR-8 (Persist across sessions):** Todos persist across refresh and browser restart.
- **FR-9 (Consistency on failure):** If a create/update/delete request fails, the UI communicates the failure and ends in a consistent state (no “ghost” todos, no silent rollback).

### API Contract (Backend)

- **FR-10 (CRUD API):** The backend exposes a minimal HTTP API supporting CRUD for todos.
- **FR-11 (Routes):** The backend provides at minimum:
  - `GET /todos` — list todos (excludes deleted)
  - `POST /todos` — create todo
  - `PATCH /todos/:id` — update fields (`text`, `completed`)
  - `DELETE /todos/:id` — soft delete (sets `deletedAt`)
- **FR-12 (Ordering):** `GET /todos` returns todos ordered by `createdAt` descending (newest created first).
- **FR-12 (Soft delete semantics):**
  - `DELETE /todos/:id` sets `deletedAt`.
  - `GET /todos` does not return deleted items.
- **FR-13 (Error shape):** API error responses use a stable machine-readable error code and a human-readable message suitable for display.

#### Suggested Error Response Shape

Use a single, consistent JSON structure:

```json
{
  "error": {
    "code": "TODO_VALIDATION_FAILED",
    "message": "Todo text must be between 1 and 200 characters.",
    "details": {
      "field": "text",
      "minLength": 1,
      "maxLength": 200
    },
    "requestId": "<optional>"
  }
}
```

Suggested baseline status codes:

- `400` validation errors
- `404` not found
- `409` conflict (optional; e.g., if later adding concurrency controls)
- `500` unexpected server errors

## UX Requirements

- **UX-1 (Completed distinction):** Completed todos are visually distinguishable from active todos.
- **UX-2 (Empty state):** Empty state includes a clear call to action to add the first todo.
- **UX-3 (Loading state):** While fetching todos, show a loading state that prevents confusing empty-state flashes.
- **UX-4 (Global error element):** Network/server errors are presented via a global UI element (e.g., banner/toast area) with clear text and a retry action where applicable.
- **UX-5 (Responsive):** Usable at mobile widths (down to ~320px) and desktop.
- **UX-6 (Accessibility):** Keyboard operable for core actions; buttons have accessible names; focus behavior is predictable after add/delete.
- **UX-7 (Metadata display):** Each todo displays its last update time (based on `updatedAt`).

## Non-Functional Requirements (NFR)

- **NFR-1 (Performance):** The system supports up to **1,000 todos** without degraded basic interactions in normal conditions.
- **NFR-2 (API latency target):** API operations return within **≤300ms p95** in the MVP environment under normal load.
- **NFR-3 (Perceived responsiveness):** UI reflects user actions within **≤200ms** under normal conditions.
- **NFR-4 (Reliability):** No data loss on refresh; failed requests do not corrupt local UI state.
- **NFR-5 (Maintainability):** Codebase remains small and understandable; avoid unnecessary abstractions.

## Architecture Guardrails (for Future Offline Support)

- Keep the API and data model compatible with later sync (stable IDs, clear timestamps).
- Prefer idempotent updates where reasonable (e.g., `PATCH` updates identified by `id`).
- Avoid UX patterns that require always-online assumptions (errors must be recoverable).

## Future Considerations (Not in MVP)

- Offline-first mode (local queue + background sync)
- Authentication and multi-user todos
- Collaboration
- Priorities, due dates, notifications
- Search and filtering
