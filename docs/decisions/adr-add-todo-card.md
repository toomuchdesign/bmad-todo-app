# ADR: AddTodoCard Layout and expandOnFocus Feature Flag

**Date:** 2026-04-12
**Status:** Accepted — pending implementation

## Problem

The existing add-todo form places the "Add" button to the right of the input stack, top-aligned with the title input only. This creates a visually orphaned relationship: the button floats next to the title while the description textarea below it has no clear associated action.

On mobile the layout is even worse — the button and inputs compete for horizontal space with no natural reading path.

## Options Considered

Four layout alternatives were explored and documented in [`docs/mockups/add-form-alternatives.html`](../mockups/add-form-alternatives.html):

| Option | Description | Verdict |
|--------|-------------|---------|
| A | Stacked inputs, button bottom-right | Better but still asymmetric on small screens |
| B | Progressive disclosure (title → textarea on fill) | Good but two interaction modes adds complexity |
| **C** | **Card with footer button** | **Selected — clear container, action always visible** |
| D | Borderless/underline inputs | Lightweight feel but low discoverability |

## Decision

**Option C — card form with footer button**, extended with an `expandOnFocus` behaviour.

### Card structure

```
┌─────────────────────────────────────────┐  ← .add-card
│  What needs to be done?                 │  ← title input (borderless inside card)
│                                         │
│  Add details… (optional)               │  ← textarea (collapsed state: hidden)
├─────────────────────────────────────────┤  ← .add-card-footer (collapsed state: hidden)
│                           Cancel   Add  │  ← right-aligned actions
└─────────────────────────────────────────┘
```

- **Border radius:** `--s-radius-lg` (8px)
- **Collapsed border:** `1px solid --s-border` (quiet)
- **Expanded border:** `1px solid --s-border-accent` (purple tint) + `box-shadow: 0 2px 16px rgba(100,60,160,0.1)`
- **Footer background:** `rgba(170,59,255,0.04)` — anchors the Add action to all card content
- **Title input:** borderless inside the card; inherits card container as its visual boundary
- **Textarea:** `1px solid --s-border`, `background: rgba(170,59,255,0.02)`, `border-radius: --s-radius-sm`

### expandOnFocus behaviour

When `expandOnFocus={true}` (the default):

| State | Visible elements |
|-------|-----------------|
| **Blur / idle** | Card with title input only. Quiet border. No footer. |
| **Title focused** | Card expands: textarea appears, footer appears. Border shifts to accent. |
| **Blur with empty title** | Card collapses back to title-only. |
| **Blur with title content** | Card stays expanded (user has started an entry). |
| **Cancel clicked** | Fields cleared, card collapses. |
| **Add clicked** | Fields cleared on success, card collapses. |

When `expandOnFocus={false}`:

Card always renders in the expanded layout (textarea + footer always visible). Equivalent to the base Option C without progressive disclosure.

### Feature flag — A/B testing rationale

`expandOnFocus` is exposed as a **boolean prop** on `AddTodoCard` so that both variants can be rendered in production traffic simultaneously and compared via analytics:

- **Hypothesis:** collapsed default reduces visual noise and keeps the list as the primary focus, while still being fast to invoke.
- **Counter-hypothesis:** always-expanded is more discoverable for new users who may not know a description field exists.
- **Measure:** time-to-first-todo, description field usage rate, form abandonment rate.

```tsx
// Default (collapsed, expands on focus)
<AddTodoCard expandOnFocus />

// A/B variant (always expanded)
<AddTodoCard expandOnFocus={false} />
```

## Consequences

- The `AddTodoForm` component is renamed to `AddTodoCard` to reflect its card nature.
- The component gains two internal states: `collapsed` and `expanded` (controlled by focus events and title content).
- CSS changes: remove the old flex-row layout; introduce `.add-card`, `.add-card-body`, `.add-card-footer` structure.
- The `btn-add` button is replaced by `btn-save` (footer context) and a companion `btn-cancel`.
- On mobile the card is full-width within its `margin: 0 --s-space-4` container — no layout changes needed for smaller screens.

## Mockups

- Source: [`docs/mockups/todo-list.html`](../mockups/todo-list.html)
- Alternatives: [`docs/mockups/add-form-alternatives.html`](../mockups/add-form-alternatives.html)
- Screenshots: [`docs/mockups/screenshots/todo-list-all-screens.png`](../mockups/screenshots/todo-list-all-screens.png)

Frames A4/B4 ("Add form — expanded") and A5/B5 ("Add form — validation error") document the expanded state with the `expandOnFocus` badge. Frames A1/B1 ("Empty state") document the collapsed default.
