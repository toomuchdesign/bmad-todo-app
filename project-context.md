# Project Context

This file captures project conventions and non-obvious rules that should stay consistent over time.

## Testing Practices

- All Vitest tests must use nested `describe` → `it` blocks.
  - No top-level `it(...)` or `test(...)`.
- Prefer describing the unit under test in the outer `describe` (module/component/route), and the behavior in `it`.
- Keep tests deterministic and avoid relying on network/external state.

## Testing Memory (Team-Specific)

Use this section for persistent test rules that should apply to every future task unless explicitly overridden.

### Mandatory Test Rules

- All test files must use Vitest with nested `describe` → `it` blocks.
- Every implementation task must include or update focused tests for changed behavior.
- Before considering a task complete, run and pass:
  - `npm run type:check`
  - `npm run biome:check`
  - `npm run test:ci`
- API changes must keep API integration tests passing in `src/api/test`.
- Web changes must keep component/unit tests passing in `src/web/src`.

### Preferred Test Patterns

All tests must follow the AAA pattern:

- **Arrange**: Set up the test context — initialize objects, define inputs, configure mocks and stubs, and establish any preconditions.
- **Act**: Execute the single behavior under test — one action, one call.
- **Assert**: Verify the outcome — check return values, state changes,
  or side effects. One logical assertion group per test.

Each section should be visually separated by a blank line.
If the Arrange block grows large, extract it into a helper or factory. A test that cannot be cleanly split into these three sections is a signal the unit under test needs refactoring.

- Assertion style: use explicit `expect(...)` checks that verify observable behavior.
- In case of structured input/output comparison: use the `actual` vs `expected` const definitions
- API test style: prefer integration tests with `fastify.inject()` (no real HTTP network).
- Web test style: use React Testing Library with `@testing-library/jest-dom` matchers.
- Keep tests deterministic and isolated from external services.
- Use CI/non-watch execution for validation gates (`test:ci`) and watch mode only during local iteration.

### Test Anti-Patterns To Avoid

- No top-level `it(...)` / `test(...)` outside nested `describe` blocks.
- No dependency on real external network calls in unit/component tests.
- No flaky timing assumptions (implicit sleeps/timeouts without need).
- No merging changes with only targeted tests run; always run full `test:ci` before completion.

## Error Recovery Instructions (Persistent)

If `npm run source:check` fails try to fix automatically with: `npm run source:fix`.

If the error persist call separately the source:check sub tasks:

- `npm run biome:check`: it means styling/formatting errors
- `npm run type:check`: TypeScript types check errors
