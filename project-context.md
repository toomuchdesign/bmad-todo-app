# Project Context

Conventions and non-obvious rules that must stay consistent across all tasks.
When in doubt, prefer explicitness over cleverness.

---

## Git

### Commits

Follow the [Conventional Commits](https://www.conventionalcommits.org/) spec.

Format: `<type>[optional scope]: <description>`

Types: `feat` `fix` `docs` `style` `refactor` `perf` `test` `chore` `ci` `build` `revert`

- Lowercase type and description
- Subject line ≤ 72 characters
- Imperative mood: "add feature", not "added feature"
- Breaking changes: append `!` → `feat!: remove v1 endpoints`
- Body (optional): explain _why_, not _what_ — separated by a blank line
- Footers (optional): `BREAKING CHANGE:`, `Closes #123`

Never commit with vague messages (`fix`, `update`, `wip`).
Each commit must be atomic — one logical change.

### Branches

Mirror commit types: `feat/`, `fix/`, `chore/`, `docs/` prefixes.
Example: `feat/oauth-login`, `fix/null-payment-response`

---

## Code Style

### Functions

- Named functions → always use `function` declarations
- Inline/callback → arrow functions only
- 2+ arguments → always use named (destructured) arguments

  ```ts
  // ✅
  function createUser({ id, name, role }: CreateUserArgs) {}

  // ❌
  function createUser(id: string, name: string, role: string) {}
  ```

- Complex and exported functions must have a brief JSDoc comment stating intent

### Modules & Exports

- Only export what has an importer — no speculative exports
- Named exports only — no default exports
- No `* imports/exports` — always use explicit named bindings
- `utils` and `test-utils` are domain modules with a barrel `index.ts`

### File Naming

- Files and folders: `kebab-case`
- Classes and types: `PascalCase`
- Constants: `SCREAMING_SNAKE_CASE`

### Imports

Order imports in three groups, separated by a blank line:

1. External packages
2. Internal absolute paths
3. Relative paths

### Constants

No magic numbers or strings inline in logic. Extract to named constants
that describe intent, not value.

```ts
// ✅
const MAX_RETRY_ATTEMPTS = 3;

// ❌
if (attempts > 3) { ... }
```

---

## TypeScript

- No `any`. Use `unknown` for genuinely unknown shapes
- Types must flow naturally — do not fight the compiler with casts
- When something truly cannot be typed: use `// @ts-expect-error <reason>`, never `as`
- Descriptive type and generic names in plain English — no single-letter generics outside trivial map/filter lambdas

---

## Async & Error Handling

- Always use `async/await` — no raw `.then()/.catch()` chains
- Never swallow errors silently. Either handle, rethrow, or log with context
- Typed errors: prefer custom error classes or discriminated union result types over throwing plain strings
- Expected failure paths (validation, not-found, auth) should return typed results, not throw

---

## Security

- No secrets, tokens, API keys, or credentials in source code or commits — ever
- Read all secrets from environment variables
- Never log sensitive values (tokens, passwords, PII)

---

## Dependencies

- Prefer the standard library and existing project dependencies before adding new ones
- Every new dependency requires a brief justification comment in the PR
- Pin major versions; avoid `*` or `latest` ranges

---

## Testing

### Structure

- Every implementation change must include or update tests for the affected behavior
- All tests use nested `describe` → `it` blocks — no top-level `it()`
- `describe`: the subject or condition being tested (imperative: "given an expired token")
- `it`: the expected outcome ("returns 401 with error message")
- If an `it` contains a condition like "when", "if", "for", ":", or "on" — that condition belongs in a `describe` block

### AAA Pattern

Every test must follow Arrange → Act → Assert, separated by blank lines.
A test that can't be cleanly split into three sections signals the unit needs refactoring.

```ts
it("returns the discounted price", () => {
  // Arrange
  const cart = buildCart({ items: [{ price: 100 }] });
  const coupon = buildCoupon({ discount: 0.2 });

  // Act
  const actual = applyDiscount(cart, coupon);

  // Expected
  const expected = { total: 80 };
  expect(actual).toEqual(expected);
});
```

### Assertions

- Prefer a single assertion against the whole entity/object when manageable
- Use `actual` / `expected` named constants for structured comparisons
- Avoid asserting implementation details — test observable behavior

### Anti-Patterns

- No real network calls in unit/component tests
- No implicit timing assumptions or arbitrary sleeps
- No merging without running the full `test:ci` suite
- No shared mutable state between tests

### Utilities

- Abstract shared setup into local `test-utils/` folders as domain modules
- File-wide `beforeEach`/`afterAll` hooks go at the top level, outside the root `describe`

---

## Documentation Consistency

Before marking any task complete, check whether these files need updating:

- `README.md` — setup steps, usage examples, environment variables
- `ARCHITECTURE.md` — component responsibilities, data flow, system boundaries
- `docs/` — any affected guides, API references, or ADRs
- Inline JSDoc — updated to reflect changed signatures or behavior

If a change makes existing documentation misleading or incomplete, updating it
is part of the task — not optional follow-up work.

---

## Definition of Done

An agent task is complete only when:

- [ ] All changed behavior has corresponding tests
- [ ] `test:ci` passes with no failures
- [ ] No lint or type errors
- [ ] No dead code, unused imports, or leftover debug statements
- [ ] Commit message follows Conventional Commits spec

---

## Debugging Artifacts

All debugging output (screenshots, reports, downloaded files) goes into `.debug/` at the project root.
This folder is git-ignored. Never commit its contents.

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
2. **Web:** Vite at `http://localhost:${WEB_PORT}` (default 5173, proxies `/todos` to API)
3. **API:** Fastify at `http://localhost:${API_PORT}` (default 3001)
4. **Wait ~5s**, then verify readiness: `curl -s -o /dev/null -w "%{http_code}" http://localhost:5173`
5. **Navigate** browser to `http://localhost:5173`
6. **Ports are configurable** via `.env` (dev) and `.env.test` (E2E) — test suite uses separate ports (5174/3002) to avoid conflicts with running dev servers
7. **Take screenshot** (full page) and save to `.debug/` folder

This is a frequent workflow — proceed promptly without extra confirmation.

## Documentation practices

- When the filesystem structure id changed. update the file representations in `_bmad-output/planning-artifacts/architecture.md`
- When npm scripts or public or dev api change update the `README.md` accordingly
