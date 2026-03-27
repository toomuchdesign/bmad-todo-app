# Project Context

This file captures project conventions and non-obvious rules that should stay consistent over time.

## Testing Practices

- All Vitest tests must use nested `describe` → `it` blocks.
  - No top-level `it(...)` or `test(...)`.
- Prefer describing the unit under test in the outer `describe` (module/component/route), and the behavior in `it`.
- Keep tests deterministic and avoid relying on network/external state.
