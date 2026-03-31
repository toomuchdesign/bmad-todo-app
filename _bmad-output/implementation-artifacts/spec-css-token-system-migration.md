---
title: "Migrate frontend CSS to 2-tier token system"
type: "refactor"
created: "2026-03-30"
status: "done"
baseline_commit: "7eb86ade"
context:
  - _bmad-output/planning-artifacts/architecture.md
  - project-context.md
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Current CSS uses ad-hoc custom properties in `index.css` with inconsistent naming, and component modules duplicate dark-mode media queries and hard-coded fallback values. This makes theming fragile and scattered.

**Approach:** Extract all raw values into a primitives file (`--p-*` prefix), map them to purpose-driven semantic tokens (`--s-*` prefix), then update `index.css` and all component modules to consume only semantic tokens. Dark mode moves entirely to `semantic.css`. Visual output must remain identical.

## Boundaries & Constraints

**Always:**

- Preserve a similar visual appearance — same general look, colors, and layout; minor tweaks acceptable
- Follow the 2-tier token architecture: primitives (`--p-*`) in `tokens/primitives.css`, semantic (`--s-*`) in `tokens/semantic.css`
- Shared design decisions (palette, spacing scale, typography, radii) flow through tokens; component-specific values that don't benefit from abstraction can remain as plain CSS values in their `.module.css`
- All `prefers-color-scheme: dark` media queries live exclusively in `tokens/semantic.css`
- No `var()` fallback values on token references

**Ask First:**

- Introducing semantic tokens for entirely new design concepts not present in the current UI

**Never:**

- Modify any `.tsx` component files (pure CSS refactor)
- Add CSS preprocessors, tooling, or dependencies
- Force every value through a token — only abstract what benefits from shared control

</frozen-after-approval>

## Code Map

- `packages/web/src/tokens/primitives.css` -- NEW: Tier 1 raw palette (colors, spacing, typography, radii)
- `packages/web/src/tokens/semantic.css` -- NEW: Tier 2 purpose-driven aliases + dark mode overrides
- `packages/web/src/index.css` -- MODIFY: replace inline variables with token imports, keep global resets/base styles
- `packages/web/src/App.module.css` -- MODIFY: replace hard-coded values with `--s-*` tokens
- `packages/web/src/components/AddTodoForm.module.css` -- MODIFY: replace all values + remove dark mode block
- `packages/web/src/components/TodoList.module.css` -- MODIFY: replace hard-coded values with `--s-*` tokens
- `packages/web/src/components/GlobalErrorBanner.module.css` -- MODIFY: replace all values + remove dark mode block

## Tasks & Acceptance

**Execution:**

- [x]`packages/web/src/tokens/primitives.css` -- Create with all raw palette values extracted from current CSS (colors, spacing, font stacks, sizes, radii) using `--p-*` naming
- [x]`packages/web/src/tokens/semantic.css` -- Create with semantic aliases mapping `--p-*` to purpose-driven `--s-*` names; include the single `prefers-color-scheme: dark` override block for all dark-mode remappings
- [x]`packages/web/src/index.css` -- Replace inline `:root` variables with `@import` of token files; keep global resets and base typography referencing `--s-*` tokens
- [x]`packages/web/src/App.module.css` -- Use `--s-*` tokens for shared design values; component-specific layout values (gap, padding) may stay as plain CSS if not part of the spacing scale
- [x]`packages/web/src/components/AddTodoForm.module.css` -- Use `--s-*` tokens for colors/borders/focus; remove the `@media (prefers-color-scheme: dark)` block; component-specific values (transition durations, local sizing) stay as plain CSS
- [x]`packages/web/src/components/TodoList.module.css` -- Use `--s-*` tokens for shared design values; component-specific values stay as plain CSS
- [x]`packages/web/src/components/GlobalErrorBanner.module.css` -- Use `--s-*` tokens for error colors/borders; remove the `@media (prefers-color-scheme: dark)` block; component-specific values stay as plain CSS

**Acceptance Criteria:**

- Given the app is loaded in a browser, when comparing before/after, then the visual appearance is similar (same general look and feel in both light and dark modes)
- Given any `.module.css` file, when searching for `prefers-color-scheme`, then zero matches are found
- Given `tokens/primitives.css` exists, when inspecting it, then all values use `--p-*` naming and contain only raw values (no `var()` references)
- Given `tokens/semantic.css` exists, when inspecting it, then all values use `--s-*` naming and reference `--p-*` primitives
- Given any `.module.css` file, when it uses a design-system value (palette color, spacing from the scale, font stack), then it references an `--s-*` token; component-specific values (e.g. a local gap, opacity, transition) may remain as plain CSS

## Design Notes

Token mapping reference (current → new):

| Current              | Primitive         | Semantic            |
| -------------------- | ----------------- | ------------------- |
| `--text` (#6b6375)   | `--p-gray-500`    | `--s-text`          |
| `--text-h` (#08060d) | `--p-gray-900`    | `--s-text-heading`  |
| `--bg` (#fff)        | `--p-white`       | `--s-bg`            |
| `--border` (#e5e4e7) | `--p-gray-border` | `--s-border`        |
| `--accent` (#aa3bff) | `--p-purple-600`  | `--s-accent`        |
| `--accent-bg`        | (rgba)            | `--s-bg-accent`     |
| `--accent-border`    | (rgba)            | `--s-border-accent` |

Component-local dark overrides (in `AddTodoForm`, `GlobalErrorBanner`) must be consolidated into `semantic.css`. New semantic tokens needed for error and focus states currently defined only inside component modules.

## Verification

**Commands:**

- `npm run type:check` -- expected: no type errors
- `npm run biome:check` -- expected: no lint/format errors
- `npm run test:ci` -- expected: all tests pass (no visual tests, but no regressions in component tests)
- `npm run test:e2e` -- expected: all tests pass (no visual tests, but no regressions in component tests)

**Manual checks:**

- Start dev servers (`npm run dev`), open `http://localhost:5173`, visually confirm identical appearance in light and dark modes

## Suggested Review Order

**Token definitions**

- Raw palette values — the foundation everything else builds on
  [`primitives.css:1`](../../packages/web/src/tokens/primitives.css#L1)

- Purpose-driven aliases + centralized dark mode overrides
  [`semantic.css:1`](../../packages/web/src/tokens/semantic.css#L1)

**Global entry point**

- Imports tokens, replaces old inline variables with `--s-*` references
  [`index.css:1`](../../packages/web/src/index.css#L1)

**Component migrations**

- Form inputs/button — most tokens consumed, dark mode block removed
  [`AddTodoForm.module.css:1`](../../packages/web/src/components/AddTodoForm.module.css#L1)

- Error banner — error tokens consumed, dark mode block removed
  [`GlobalErrorBanner.module.css:1`](../../packages/web/src/components/GlobalErrorBanner.module.css#L1)

- Todo list — straightforward var rename, no dark mode to remove
  [`TodoList.module.css:1`](../../packages/web/src/components/TodoList.module.css#L1)

- Unchanged — component-specific layout only, no shared tokens needed
  [`App.module.css:1`](../../packages/web/src/App.module.css#L1)
