---
name: CSS tokens minimal approach
description: Keep design tokens minimal and grow incrementally — don't over-abstract upfront
type: feedback
---

Keep shared CSS tokens at the minimum. Don't overdo abstraction — extend the token system step by step as real needs arise. The goal is better-organized styles that make future development easier and more obvious, not comprehensive coverage.

**Why:** User prefers incremental, pragmatic approach over comprehensive upfront design systems. Over-abstraction adds complexity without immediate benefit.

**How to apply:** When creating or extending CSS tokens, only tokenize values that are genuinely shared across multiple components or that serve theming (dark mode). Leave component-specific values as plain CSS. When in doubt, don't tokenize — it can always be promoted later.
