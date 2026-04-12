# UI Design Overview

This document is the entry point for all visual design documentation.

---

## Design System

[`docs/mockups/design-system.html`](mockups/design-system.html) — self-contained reference rendered from the actual design tokens.

Sections:
1. **Colors** — primitive palette + semantic tokens (text, bg, border, interactive)
2. **Typography** — 9-level scale from app title (32px) to metadata (11px)
3. **Spacing** — token-based scale (2px → 48px)
4. **Atoms** — Input, Button variants, NavLink, Checkbox
5. **Molecules** — FormField, AuthForm, AddTodoCard, TodoItem, GlobalErrorBanner
6. **Layout** — AppShell structure, AppHeader (authenticated / unauthenticated)
7. **State Matrix** — every component × every state it can exist in

Screenshot: [`docs/mockups/screenshots/design-system.png`](mockups/screenshots/design-system.png)

---

## Screen Mockups

| File | Screens | Screenshot |
|------|---------|------------|
| [`auth-ui.html`](mockups/auth-ui.html) | Login (default, error, pending) · Register (default, error) · Desktop + Mobile | [`auth-ui-all-screens.png`](mockups/screenshots/auth-ui-all-screens.png) |
| [`todo-list.html`](mockups/todo-list.html) | Empty · Loading · Populated list · Add form (collapsed, expanded, error) · Inline edit · Global error · Desktop + Mobile | [`todo-list-all-screens.png`](mockups/screenshots/todo-list-all-screens.png) |
| [`add-form-alternatives.html`](mockups/add-form-alternatives.html) | Four layout options (A–D) for the add-todo form at desktop + mobile | [`add-form-alternatives.png`](mockups/screenshots/add-form-alternatives.png) |

---

## Design Decisions (ADRs)

| ADR | Decision |
|-----|----------|
| [`adr-auth-strategy.md`](decisions/adr-auth-strategy.md) | JWT auth, token storage, session handling |
| [`adr-auth-ui-layout.md`](decisions/adr-auth-ui-layout.md) | AppHeader shared across auth + app, nav underline pattern, form alignment |
| [`adr-add-todo-card.md`](decisions/adr-add-todo-card.md) | AddTodoCard: Option C card layout, `expandOnFocus` feature flag for A/B testing |

---

## Key Design Tokens

All tokens live in `packages/web/src/tokens/`:

| File | Purpose |
|------|---------|
| `primitives.css` | Raw color/font values |
| `semantic.css` | Semantic aliases (`--s-*`) used by all components |

Mockup HTML files inline these tokens verbatim — no build step needed to render them.

---

## Conventions

- Mockup files are self-contained HTML (no build required)
- Screenshots are committed alongside the HTML source
- One HTML file per feature area — no merging unrelated screens
- To re-screenshot: copy to `packages/web/public/`, run `npm run dev`, navigate, screenshot, remove temp copy
- All debugging screenshots go to `.debug/` (git-ignored)
