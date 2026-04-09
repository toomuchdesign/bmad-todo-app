# Sprint Change Proposal — 2026-04-09

## Issue Summary

With Epic 5 (Dockerization) nearing completion, the project is ready to plan its next phase.
The current auth model — a hardcoded `x-user-id` header and a default user seeded by migration
— is a placeholder that cannot support real user-facing authentication.

Adding user authentication is a natural next step building directly on Epic 4's foundation
(users table, user creation endpoint, per-user todo scoping). The PRD explicitly deferred auth
as post-MVP; this proposal formalizes it as Epic 6.

**Change type:** New post-MVP epic (additive)
**Discovery context:** End-of-Epic-5 planning, following deployment readiness milestone.

## Impact Analysis

### Epic Impact

| Epic                    | Status      | Change required                                                                                                                    |
| ----------------------- | ----------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| Epic 1–4                | done        | None                                                                                                                               |
| Epic 5 (Deployment)     | in-progress | **None** — completes as planned. Docker setup should finish first (informs cookie domain, CORS, and token handling in production). |
| Epic 6 (Authentication) | —           | **New epic to add**                                                                                                                |

### Story Impact

No existing stories modified. Epic 6 is purely additive and begins after Epic 5 is done.

### Artifact Conflicts

| Artifact      | Impact                                                                                                                                                                  | Severity                          |
| ------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------- |
| PRD           | Auth was explicitly deferred. Add it to Growth Features (Post-MVP) to acknowledge the extension.                                                                        | Low                               |
| Architecture  | Existing "Authentication & Security" section states "none (single-user MVP)". Needs update: flag as pending with Epic 6 placeholder and shortlist of evaluated options. | High                              |
| Epics         | Add Epic 6 definition with Story 6.0 (design spike). Implementation stories created after ADR approval.                                                                 | Additive                          |
| Sprint Status | Add `epic-6` block and `6-0-auth-design-spike` entry.                                                                                                                   | Additive                          |
| UX Design     | Auth introduces new screens (login, register, session state). A UX pass is needed as part of implementation stories.                                                    | Moderate (deferred to Story 6.1+) |
| OpenAPI       | New auth routes (`/api/auth/login`, `/api/auth/register`) will need schema definitions and generated types.                                                             | Medium (deferred to Story 6.1+)   |

### Technical Impact

- The `x-user-id` header pattern (Epic 4) will be replaced or evolved once auth is in place.
- The `users` table (Epic 4) already provides the identity foundation; auth will extend it (e.g., `email`, `password_hash` columns or delegate identity to an external provider).
- No application source changes required until the design spike selects an approach.

## Recommended Approach

**Direct Adjustment** — Add Epic 6 with a design-first structure. No rollback needed. No MVP scope change (MVP is complete and deploying via Epic 5).

**Effort:** Low–Medium | **Risk:** Low | **Timeline impact:** Post-Epic 5

**Rationale:** Epic 4 already introduced the user entity and per-user scoping.
Authentication is the logical evolution. Starting with a design spike (Story 6.0) prevents
locking into a library or service prematurely — a decision that is hard to reverse.

## Auth Options Shortlist (for Story 6.0 Evaluation)

| Option                                                         | Approach                                                                   | Pros                                                                   | Cons                                                            |
| -------------------------------------------------------------- | -------------------------------------------------------------------------- | ---------------------------------------------------------------------- | --------------------------------------------------------------- |
| **A — DIY JWT** (`@fastify/jwt` + bcrypt)                      | Email/password → signed JWT (Authorization header or httpOnly cookie)      | Full control, no vendor lock-in, maximum learning value, zero cost     | You own the full security surface (expiry, refresh, revocation) |
| **B — Better Auth** (library)                                  | TS-first auth library with Drizzle adapter; email/password + OAuth support | Type-safe, integrates with existing Drizzle schema, handles edge cases | Newer library (~1yr), smaller community                         |
| **C — Clerk** (external service)                               | Clerk issues JWTs; API verifies via JWKS endpoint; pre-built React UI      | Best DX, zero auth code to maintain, free tier generous (10k MAU)      | Vendor lock-in, less learning value for auth internals          |
| **D — Session-based** (`@fastify/session` + `@fastify/cookie`) | Server-side sessions in Postgres or memory                                 | Simple mental model, browser handles cookies                           | Stateful — needs session store; less portable horizontally      |

**Recommendation for Story 6.0:** Evaluate Options A and B as primary candidates (stack-native, no vendor lock-in). Evaluate Option C if speed-to-value outweighs learning goals.

## Detailed Change Proposals

### Change 1 — `prd.md`: Add Epic 6 to Growth Features

**Section:** Growth Features (Post-MVP)

**OLD:**

```
- Search / filter
- Offline-first (queued mutations + sync)
- Bin page (view/restore deleted items)
```

**NEW:**

```
- User authentication (register/login, replacing x-user-id placeholder — Epic 6)
- Search / filter
- Offline-first (queued mutations + sync)
- Bin page (view/restore deleted items)
```

**Rationale:** Explicitly documents that auth is a planned post-MVP extension, not out-of-scope.

---

### Change 2 — `architecture.md`: Update Authentication & Security section

**Section:** Authentication & Security

**OLD:**

```
- **Authentication (MVP):** none (single-user MVP, no user auth)
- **API guard:** none (no static API key)
```

**NEW:**

```
- **Authentication (MVP):** none (single-user MVP — `x-user-id` header placeholder)
- **Authentication (Epic 6):** strategy TBD — see Story 6.0 ADR in `docs/decisions/`.
  Options evaluated: DIY JWT (`@fastify/jwt` + bcrypt), Better Auth (Drizzle adapter),
  Clerk (external service), session-based (`@fastify/session`).
  Decision and implementation details will be appended here after ADR approval.
- **API guard:** none (no static API key)
```

**Rationale:** Acknowledges the planned evolution without locking in an approach prematurely.

---

### Change 3 — `epics.md`: Add Epic 6 definition

**Added after Epic 5 entry in the Epic List section and as a full Epic 6 section.**

---

### Change 4 — `sprint-status.yaml`: Add epic-6 block

```yaml
epic-6: backlog
6-0-auth-design-spike: backlog
```

## Implementation Handoff

**Scope: Minor** — Additive epic. Direct implementation pathway. No PM/Architect escalation required.

| Role                | Responsibility                                                                 |
| ------------------- | ------------------------------------------------------------------------------ |
| Scrum Master        | Create Story 6.0 file via `bmad-create-story` after Epic 5 completes           |
| Developer/Architect | Execute Story 6.0: evaluate auth options, produce ADR in `docs/decisions/`     |
| Scrum Master        | After ADR approved: create implementation stories 6.1+ via `bmad-create-story` |

**Success criteria for Story 6.0 (design spike):**

- Auth strategy evaluated against: learning value, complexity, vendor risk, Drizzle + Fastify + Docker compatibility
- ADR written and committed in `docs/decisions/adr-auth-strategy.md`
- UX implications noted (login/register screens, session persistence)
- Implementation stories 6.1+ drafted and ready for dev

**Success criteria for Epic 6 completion:**

- A real user can register with email + password (or equivalent via chosen strategy)
- A real user can log in and receive a session/token
- All todo endpoints require authenticated identity; `x-user-id` header removed
- Existing test patterns extended to cover auth flows (API integration + E2E)
