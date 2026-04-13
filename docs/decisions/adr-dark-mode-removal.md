# ADR: Dark Mode Removal

**Date:** 2026-04-13
**Status:** Accepted
**Story:** 6.5 — UI Component Architecture Refactor

---

## Problem

The initial design token setup included a `@media (prefers-color-scheme: dark)` block in
`src/tokens/semantic.css` and a corresponding set of dark-mode primitive tokens
(`--p-dark-bg`, `--p-dark-surface`, `--p-dark-border`, `--p-gray-100`, `--p-gray-400`,
`--p-indigo-400`, `--p-purple-400`) in `src/tokens/primitives.css`.

These dark-mode values were added speculatively and were never visually validated or
tested. The design system work in Story 6.5 introduced a structured visual language
(elevated app shell, lavender page background, typography hierarchy) that was only
designed for light mode.

---

## Options Considered

**Option A — Keep dark mode, update tokens to match new design**
Would require designing and validating a full dark palette for the new visual system.
Out of scope for Story 6.5.

**Option B — Remove dark mode, lock to light**
Removes untested, unvalidated dark-mode tokens. Eliminates the risk of a broken dark
appearance being shipped. Simplifies the token surface.

---

## Decision

**Option B — dark mode removed.**

`color-scheme` is locked to `light` in `src/index.css`. The
`@media (prefers-color-scheme: dark)` block and all dark primitive tokens are deleted.

This is an explicit descoping decision: the current product is light-mode only.

---

## Consequences

- Users with a dark OS preference receive the light theme. No visual corruption —
  the app is consistently styled; it simply does not honour the system preference.
- Re-introducing dark mode requires: (1) designing a validated dark palette,
  (2) adding dark semantic tokens under a `@media (prefers-color-scheme: dark)` block,
  (3) verifying all components against the dark palette.
- The primitive token set is smaller and contains only tokens that are actively
  referenced by semantic tokens.
