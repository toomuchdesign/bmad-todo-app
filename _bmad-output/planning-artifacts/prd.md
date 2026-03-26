---
stepsCompleted:
  - step-01-init
  - step-02-discovery
  - step-02b-vision
  - step-02c-executive-summary
  - step-03-success
  - step-04-journeys
  - step-05-domain
  - step-06-innovation
  - step-07-project-type
  - step-08-scoping
  - step-09-functional
  - step-10-nonfunctional
  - step-11-polish
  - step-12-complete
workflowType: "prd"
inputDocuments:
  - docs/initial-product-requirements.md
  - docs/initial-product-requirements.prd.md
documentCounts:
  productBriefs: 0
  research: 0
  brainstorming: 0
  projectDocs: 2
classification:
  projectType: web_app
  domain: general
  complexity: low
  projectContext: brownfield
---

# Product Requirements Document - bmad-todo

**Author:** Andrea
**Date:** 2026-03-26

## Executive Summary

This PRD defines an MVP full-stack todo **web app** for a **single user** to manage personal tasks with a clean, lightweight experience and durable persistence via a small backend API.

The MVP covers the core loop: create todos, edit text, toggle completion, and soft delete. The UX is mobile-first and resilience-first: clear states (empty/loading/error), predictable recovery when the API is down, and no silent failures.

### What Makes This Special

The MVP differentiator is restraint: “just enough” task management with no frills and minimal product opinionation. This is an internal learning project and a stable baseline; more opinionated decisions come later.

## Project Classification

- **Project Type:** web_app (SPA)
- **Domain:** general
- **Complexity:** low
- **Project Context:** brownfield (built from existing requirements/PRD drafts)

## Success Criteria

### User Success

- **Core loop quality:** All CRUD actions work reliably and feel smooth: create todo, list todos on load, edit text, toggle complete/uncomplete, soft delete.
- **Time to first value:** A first-time user can create their first todo within **≤30 seconds** of first app load (modern browser, normal network).

### Business Success

- **Delivery target (solo, part-time):** **2–3 calendar weeks** from start (2026-03-26) → target window **2026-04-09 to 2026-04-16**.
  - If actual time is closer to ~30–60 minutes/day, expect **3–4 weeks**.
- **Learning goals achieved:** CRUD API + UI state management + global error handling + tests shipped with features.

### Quality (Tests)

- **All current MVP user flows are covered by automated tests** (flow-level coverage):
  - List-on-load (success)
  - List-on-load (failure → global error + retry)
  - Create (success + validation failure)
  - Edit (success + failure)
  - Toggle complete (success + failure)
  - Delete/soft-delete (success + failure)

### Technical Success

- **API performance:** p95 API response time **≤300ms** under normal dev conditions.
- **UI responsiveness:** UI reflects user actions within **≤200ms** under normal conditions.
- **Reliability:** No data loss across refresh; basic CRUD is consistent (no ghost items, no silent drop of edits).

### Measurable Outcomes

- Green test suite covering all MVP flows + a short acceptance checklist.

## Product Scope

### MVP - Minimum Viable Product

- Full CRUD for todos with persistence via backend API
- Newest created first ordering (`createdAt` desc)
- Soft delete (deleted items not returned by default)
- Empty/loading/error states + global error surface for network/server failures
- Modern browsers support

### Growth Features (Post-MVP)

- Search / filter
- Offline-first (queued mutations + sync)
- Bin page (view/restore deleted items)

### Vision (Future)

- More radical/opinionated decisions once baseline is validated

## User Journeys

### Journey 1 — Primary User (Happy Path): Capture a task immediately

**Persona:** Sam, casual user managing day-to-day reminders.

**Opening scene:** Sam is on their phone and remembers something they must do soon. They want to capture it without thinking.

**Rising action:**

- Sam opens the app and immediately sees their todo list (or an empty state with a clear add call to action).
- Sam types a short task and submits.
- The new todo appears instantly as active.
- Sam repeats this a few times, building a small list.

**Climax (value moment):** Capturing tasks feels frictionless; the list becomes a reliable external brain.

**Resolution:** Sam leaves and returns later; the list is still there and correct.

**What could go wrong + recovery:**

- If the list is still loading, Sam sees a loading state (not a misleading empty state).
- If the initial load fails, Sam sees a global error with a retry action.

### Journey 2 — Primary User (Validation Edge Case): Try to add junk / fix it fast

**Opening scene:** Sam is rushing and hits submit with an empty field (or whitespace).

**Rising action:**

- Sam submits an empty/whitespace todo.
- The UI blocks creation and shows an inline validation message near the input.
- Sam types a valid task and resubmits.

**Climax:** The app clearly tells Sam what’s wrong without breaking flow.

**Resolution:** Sam successfully creates the todo and continues.

**What could go wrong + recovery:**

- If text exceeds limits (e.g., >200 chars), the UI shows validation guidance and preserves typed text.

### Journey 3 — Primary User (API Down): Keep control when the backend fails

**Opening scene:** Sam opens the app on mobile, but the backend is down (or network is flaky).

**Rising action:**

- App attempts to load todos.
- The load fails.
- Sam sees a global error element with a clear message and a retry button.
- Sam retries; either it succeeds and the list loads, or it fails again with consistent messaging.

**Climax:** Even when things break, the app stays predictable: no phantom items, no silent failures.

**Resolution:** When the API comes back, Sam can resume normal usage.

**What could go wrong + recovery:**

- If create/edit/toggle/delete fails mid-action, a global error appears and the UI ends in a consistent state (no ghost todos; no silent loss of edits).

### Journey 4 — Maintainer (Internal): Verify the MVP is shippable

**Persona:** Maintainer validating the learning project quality bar.

**Opening scene:** The maintainer wants confidence that CRUD + error handling works before calling it done.

**Rising action:**

- Run the automated test suite.
- Confirm all current MVP user flows are covered and green (load success/failure, create validation, CRUD success/failure).
- Spot-check on a phone-sized viewport.

**Climax:** A green suite plus a quick manual spot-check makes regressions obvious.

**Resolution:** Maintainer can demo and iterate without fear of breaking core flows.

### Journey Requirements Summary

- Mobile-first UI layout and touch-friendly controls
- Empty/loading/error states that don’t confuse users
- Inline validation for input errors (empty/too long)
- Global error element for network/server failures + retry
- Consistent state on failed mutations (no ghosts / no silent loss)
- Persistence across refresh and return
- Automated tests covering the listed MVP flows

## Innovation & Novel Patterns

### Detected Innovation Areas

- **Intentional minimalism ("anti-feature" design):** The MVP differentiates by being “just enough” for the core loop. It explicitly avoids feature accumulation and opinionated workflows in v1, creating a clean baseline for iterative learning.
- **Resilience-first interaction contract:** Failure handling is a first-class product behavior, not an afterthought. When the API is down or a mutation fails, the UI must remain consistent (no ghost items, no silent loss) and provide clear recovery via global error messaging and retry.
- **Mobile-first one-thumb usage:** The primary UX is designed for casual users on mobile. Core CRUD actions should be fast and comfortable on small screens with touch-friendly controls and no onboarding.

### Market Context & Competitive Landscape

Many todo tools optimize for power users and accumulate features over time. This product intentionally optimizes for low cognitive load, predictable behavior under failure, and mobile-first usability, while leaving advanced and opinionated decisions for post-MVP iterations.

### Validation Approach

- **Minimalism:** Verify the MVP remains focused (no new feature categories beyond CRUD + states), while still meeting “core loop completeness.”
- **Resilience:** Run failure-mode acceptance checks (API down; load failures; validation errors; mutation failures) and confirm consistent UI state + clear recovery.
- **Mobile-first:** Validate on phone-sized viewport that the core loop can be completed comfortably (create/edit/complete/delete) without layout friction.

### Risk Mitigation

- **Risk:** “Minimalism” becomes “missing basics.”
  - **Mitigation:** Treat core loop completeness (CRUD + loading/empty/error states + persistence) as non-negotiable.
- **Risk:** Resilience adds complexity or delays delivery.
  - **Mitigation:** Standardize error handling via one global pattern; keep offline-first and advanced recovery mechanics out of MVP.
- **Risk:** Mobile-first compromises desktop usability.
  - **Mitigation:** Ensure responsive layout supports desktop without adding extra concepts (same flows, same rules).

## Web App Specific Requirements

### Project-Type Overview

- **Application type:** Single Page Application (SPA).
- **SEO:** Not required for MVP.
- **Primary UX:** Mobile-first, casual users, zero onboarding.

### Browser Matrix (Modern Browsers)

Support “modern browsers” defined as:

- Latest stable Chrome, Edge, Firefox, Safari (desktop)
- Latest stable iOS Safari (and iOS Chrome as a WebKit wrapper)
- Latest stable Android Chrome

Explicitly out of scope for MVP:

- Legacy browsers and enterprise-locked old versions.

### Responsive Design

- Mobile-first layout that remains usable at ~320px width and scales up to desktop.
- Core CRUD actions must be touch-friendly.

### Accessibility (Best-Effort, MVP)

- Keyboard operable for core actions.
- Buttons/controls have accessible names.
- Focus behavior remains predictable after add/edit/delete.
- No formal compliance target in MVP.

### Real-Time / Sync

- No real-time requirements in MVP (no collaboration, no live sync across clients).
- Offline-first is post-MVP.

## Project Scoping & Delivery Notes

### MVP Strategy & Philosophy

**MVP Approach:** Problem-solving MVP + Experience MVP

- Prove the core loop is useful (CRUD + persistence).
- Prove the experience is clean/light and resilience-first (clear states, predictable recovery).

### Constraints & Boundaries

- Solo, spare-time delivery; schedule risk is driven by reliability polish and covering all MVP flows with tests.
- No additional features beyond what’s already in this PRD.

### Risk Mitigations

- Use vertical slices (list → create → validation → edit → toggle → delete), each completed with error handling and tests.
- Standardize error handling into a single global pattern.

## Functional Requirements

### Todo Management

- **FR1:** Users can view a list of todos on app load.
- **FR2:** Users can create a todo by submitting text.
- **FR3:** Users can edit the text of an existing todo.
- **FR4:** Users can mark a todo as completed and uncompleted.
- **FR5:** Users can delete a todo (soft delete).

### Input Validation

- **FR6:** Users receive inline validation when attempting to create or edit a todo with empty/whitespace-only text.
- **FR7:** Users receive inline validation when todo text violates length constraints.
- **FR8:** The system preserves user-entered text when validation fails (no silent clearing).

### Persistence & Consistency

- **FR9:** Todos persist across page refresh and returning later.
- **FR10:** The system maintains a consistent UI state when a create/edit/toggle/delete request fails (no ghost todos; no silent loss of changes).

### Ordering & Visibility Rules

- **FR11:** Users see todos ordered by newest created first by default.
- **FR12:** Deleted todos are excluded from the default todo list.

### Error Handling & Recovery

- **FR13:** Users see a global error element when the initial todo load fails, with a retry action.
- **FR14:** Users see a global error element when a network/server error occurs during create/edit/toggle/delete.
- **FR15:** Users can retry failed operations (at minimum: retry load; retry on subsequent action attempts).

### API Capability Contract

- **FR16:** The system exposes an HTTP API that supports CRUD for todos.
- **FR17:** The API supports listing todos (`GET /todos`).
- **FR18:** The API supports creating a todo (`POST /todos`).
- **FR19:** The API supports updating a todo (`PATCH /todos/:id`) for text and completion status.
- **FR20:** The API supports soft deleting a todo (`DELETE /todos/:id`).
- **FR21:** The API does not return soft-deleted todos in `GET /todos`.
- **FR22:** API error responses include a stable machine-readable error code and a human-readable message suitable for display.
- **FR23:** API error responses can optionally include structured details for validation errors (e.g., field + limits) and a requestId for debugging.

### Testability (Flow Coverage)

- **FR24:** Automated tests cover all current MVP flows, including success and failure cases for load and CRUD actions.

## Non-Functional Requirements

### Performance

- **NFR1 (Initial load):** Initial screen becomes usable within **≤2s p95** on modern mobile devices and a typical developer laptop on a normal network.
- **NFR2 (API latency):** API operations respond within **≤300ms p95** under normal dev conditions.
- **NFR3 (UI responsiveness):** UI reflects user actions within **≤200ms** under normal conditions (optimistic UI allowed if consistency is preserved).

### Reliability

- **NFR4 (Durability):** No data loss across refresh and return later (same user/device).
- **NFR5 (Consistency on failure):** Failed API operations do not leave the UI in an inconsistent state (no ghost todos; no silent loss of edits).

### Security (Baseline)

- **NFR6 (Input safety):** User-provided todo text is handled safely (no client-side injection issues; safe rendering).
- **NFR7 (Transport):** API communication uses TLS in any deployed environment.

### Accessibility (Best-Effort, MVP)

- **NFR8 (Operability):** Core actions are keyboard-operable and controls have accessible names.
- **NFR9 (No formal target):** No WCAG compliance target is required for MVP, but regressions that block basic usage are treated as bugs.
