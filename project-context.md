# General project Context

This file captures project conventions and non-obvious rules that should stay consistent over time.

## Coding Practices

### Functions

- Use arrow functions only for inline use
- Any other function with a name should use function declaration (`function myFunctionName(){}`)
- Complex functions and exported functions (even non public ones) should come with a brief jsdoc comment
- Always prefer named arguments when function accepts 2+ arguments

### Code structure

- Only exports from modules when there is an importer
- Organize `utils` or `test-utils` as domain modules with a barrel index

### Typescript

- Do not use `any` type. Use `unknown` is an entity is actually not known
- Never force type inference. Type must always flow naturally
- If something cannot be properly typed use `// @ts-expect-error error description/motivation`

## Testing Practices

- Every implementation task must include or update focused tests for changed behavior.
- All tests must use nested `describe` → `it` blocks.
- Assertion style: use explicit `expect(...)` checks that verify observable behavior.
- Prefer a single assertion against the whole entity/object when manageable for clarity, even at the cost of some repetition.
- If tests are repetitive and expected objects are large, it is acceptable to assert specific properties instead of the full object.
- In case of structured input/output comparison: use the `actual` vs `expected` const definitions
- Use multiple nested `describe` blocks if necessary: `describe` must contain the subject or the tested condition, `it` must contain the outcome/expectation
  - If `it` statements contain elements like "when"/"if"/"on" it means that there is a condition to be expressed as a `describe` block
  - Condition should be expressed in an imperative mode
- Keep tests deterministic and avoid relying on network/external state.
- Abstract shared test utilities in local `test-utils` folders
- File-wide setup/teardown hooks should be top-level (outside root `describe`) to keep structure consistent.

### Preferred Test Patterns

All tests must follow the AAA pattern:

- **Arrange**: Set up the test context — initialize objects, define inputs, configure mocks and stubs, and establish any preconditions.
- **Act**: Execute the single behavior under test — one action, one call.
- **Assert**: Verify the outcome — check return values, state changes, or side effects. One logical assertion group per test.

Each section should be visually separated by a blank line. If the Arrange block grows large, extract it into a helper or factory. A test that cannot be cleanly split into these three sections is a signal the unit under test needs refactoring.

### Test Anti-Patterns To Avoid

- No top-level `it(...)` / `test(...)` outside nested `describe` blocks.
- No dependency on real external network calls in unit/component tests.
- No flaky timing assumptions (implicit sleeps/timeouts without need).
- No merging changes with only targeted tests run; always run full `test:ci` before completion.

## Debugging Artifacts

- All debugging artifacts (screenshots, downloaded files, generated reports) must be saved into the `.debug/` folder at the project root.
- This folder is git-ignored. Do not commit its contents.

# Specific project context

## Testing Memory (Project-Team-Specific)

Use this section for persistent test rules that should apply to every future task unless explicitly overridden.

- API test style: prefer integration tests with `fastify.inject()` (no real HTTP network).
- API test utilities must be imported from the shared barrel at `packages/api/test/test-utils/index.ts` for consistency.
- API DB cleanup is centralized in `packages/api/vitest.setup.ts` via a global `beforeEach` (`cleanupTestDatabase`); avoid duplicating per-file DB reset hooks unless a test needs custom setup.
- Web test style: use React Testing Library with `@testing-library/jest-dom` matchers.
- Web integration tests for `App` are split by feature: `App.test.tsx` (load/structure), `App.create-todo.test.tsx` (create flow), etc. Each new feature gets its own `App.<feature>.test.tsx` file.
- Web test utilities (fixtures, fetch mock helpers) must be imported from the shared barrel at `packages/web/src/test-utils/index.ts` for consistency.
- Use CI/non-watch execution for validation gates (`test:ci`) and watch mode only during local iteration.

### Mandatory Test Rules

- Before considering a task complete, run and pass:
  - `npm run type:check`
  - `npm run biome:check`
  - `npm run test:ci`
  - `npm run test:e2e`
- API changes must keep API integration tests passing in `packages/api/test`.
- Web changes must keep component/unit tests passing in `packages/web/src`.

#### Error Recovery Instructions (Persistent)

- If `npm run type:check` fails, it means type check error: read the error message and try to fix the relevant code.
- If `npm run biome:check` fails, it means styling/formatting errors: try to fix automatically with: `npm run biome:fix`.

## Local Dev & Visual Inspection

When asked to visually check the app or take a screenshot:

1. **Start dev servers:** `npm run dev` (runs web + API concurrently in background)
2. **Web:** Vite at `http://localhost:5173` (proxies `/todos` to API at `:3001`)
3. **API:** Fastify at `http://localhost:3001`
4. **Wait ~5s**, then verify readiness: `curl -s -o /dev/null -w "%{http_code}" http://localhost:5173`
5. **Navigate** browser to `http://localhost:5173`
6. **Take screenshot** (full page) and save to `.debug/` folder

This is a frequent workflow — proceed promptly without extra confirmation.

## Documentation practices

- When the filesystem structure id changed. update the file representations in `_bmad-output/planning-artifacts/architecture.md`
- When npm scripts or public or dev api change update the `README.md` accordingly
