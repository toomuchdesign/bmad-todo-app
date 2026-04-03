# Story 3.0: Add title field to todos with text as optional description

Status: review

## Story

As a user,
I want each todo to have a distinct title and optional description text,
So that I can quickly scan my todo list by title and add details when needed.

## Acceptance Criteria

1. **DB migration: rename `text` → `title`, add nullable `text` column**
   - Given the existing todos table with a `text` column
   - When the migration runs
   - Then the `text` column is renamed to `title` and a new nullable `text` column is added

2. **Shared types and constants updated**
   - Given the shared Todo type
   - When any package references it
   - Then `title` is a required string and `text` is `string | null`
   - And `MAX_TODO_TITLE_LENGTH = 100` and `MAX_TODO_TEXT_LENGTH = 500` constants exist

3. **POST /todos accepts `{ title, text? }`**
   - Given the API contract
   - When `POST /todos` is called
   - Then the body accepts `{ title: string, text?: string }` with title required (1–100 chars, non-blank) and text optional (1–500 chars if provided)

4. **PATCH /todos/:id accepts `{ title?, text?, completed? }`**
   - Given the API contract
   - When `PATCH /todos/:id` is called
   - Then the body accepts optional `{ title?, text?, completed? }` with the same length constraints

5. **Create form: single text field for title + textarea for text**
   - Given a user creates a todo via a form consisting of a text field (title ≤100 chars) and a textarea (text ≤500 chars)
   - When they type title and optional content, then submit
   - Then the todo gets saved and rendered in the todo list

6. **List rendering: title with primary weight, text with secondary styling**
   - Given a todo is displayed in the list
   - When it has both title and text
   - Then the title is rendered with primary visual weight and the text below it with secondary (smaller, muted) styling

7. **Inline edit form: pre-populated title + text, Ctrl+Enter/Cmd+Enter saves**
   - Given a user edits a todo inline
   - When the todo input form opens
   - Then it is pre-populated with title and text
   - And Ctrl+Enter / Cmd+Enter saves while Enter inserts newlines in the textarea field

8. **All existing tests updated for new schema**
   - Given all test suites
   - When they run
   - Then every test that referenced `text` as the todo's primary field now uses `title`
   - And tests validate both `title` and `text` fields where applicable

## Tasks / Subtasks

- [x] Task 1: DB migration — rename `text` to `title`, add nullable `text` (AC: #1)
  - [x] Create a Drizzle migration: `ALTER TABLE todos RENAME COLUMN "text" TO "title"; ALTER TABLE todos ADD COLUMN "text" text;`
  - [x] Update Drizzle schema in [packages/api/src/db/schema.ts](packages/api/src/db/schema.ts): rename `text` field to `title: text("title").notNull()`, add `text: text("text")`
  - [x] Run `npm -w api run db:generate` then `npm -w api run db:migrate`
  - [x] Verify migration with a manual DB check

- [x] Task 2: Update shared constants and types (AC: #2)
  - [x] In [packages/shared/src/constants.ts](packages/shared/src/constants.ts): rename `MAX_TODO_TEXT_LENGTH = 200` → add `MAX_TODO_TITLE_LENGTH = 100` and update `MAX_TODO_TEXT_LENGTH = 500`
  - [x] In [packages/shared/src/definitions/todo.ts](packages/shared/src/definitions/todo.ts): update `todoSchema` — `title` required string, `text` as `string | null` (nullable)
  - [x] Update [packages/shared/src/index.ts](packages/shared/src/index.ts) barrel to export new constant
  - [x] Run `npm -w shared run type:check`

- [x] Task 3: Update API DB operations (AC: #1, #3, #4)
  - [x] In [packages/api/src/db/todos.ts](packages/api/src/db/todos.ts):
    - `createTodoInDatabase`: accept `title` and optional `text`, insert both
    - `updateTodoInDatabase`: accept optional `title`, optional `text`, optional `completed`
    - `mapTodoRowToApiTodo`: map both `title` and `text` fields
    - `listTodosFromDatabase`: ensure both fields are returned

- [x] Task 4: Update API route schemas (AC: #3, #4)
  - [x] In [packages/api/src/routes/schemas.ts](packages/api/src/routes/schemas.ts):
    - `postTodosRouteSchema`: body requires `title` (1–100 chars, `.*\\S.*` pattern), optional `text` (1–500 chars, `.*\\S.*` pattern)
    - `patchTodosRouteSchema`: body allows optional `title`, `text`, `completed` — same constraints
    - Update response schemas to include both `title` and `text` fields

- [x] Task 5: Update API route handlers (AC: #3, #4)
  - [x] In [packages/api/src/routes/todos.ts](packages/api/src/routes/todos.ts):
    - `POST /todos`: extract `title` and `text` from body, trim, pass to `createTodoInDatabase`
    - `PATCH /todos/:id`: extract optional `title`, `text`, `completed` from body, trim strings, pass to `updateTodoInDatabase`

- [x] Task 6: Regenerate OpenAPI and API types (AC: #3, #4)
  - [x] Run `npm run build:openapi`
  - [x] Run `npm run build:api-types`
  - [x] Verify generated types include `title` and `text` fields

- [x] Task 7: Update web contracts and hooks (AC: #2, #3, #4)
  - [x] In the web contracts file: update imports/re-exports for `MAX_TODO_TITLE_LENGTH` and updated `MAX_TODO_TEXT_LENGTH`
  - [x] In [packages/web/src/hooks/useTodos.ts](packages/web/src/hooks/useTodos.ts):
    - `createTodo`: accept `{ title: string, text?: string }` instead of a single text string
    - `updateTodo`: `TodoUpdatableFields` becomes `Partial<Pick<Todo, "title" | "text" | "completed">>` (add `title`)
    - Update fetch calls to send `{ title, text }` in POST body

- [x] Task 8: Update AddTodoForm component (AC: #5)
  - [x] In [packages/web/src/components/AddTodoForm.tsx](packages/web/src/components/AddTodoForm.tsx):
    - Change `onSubmit` prop signature: `(data: { title: string; text?: string }) => Promise<boolean>`
    - Add a title text input (≤100 chars) with inline validation
    - Add a textarea for text/description (≤500 chars) with inline validation
    - Title is required, text is optional
    - Update validation to check title (non-empty, ≤100 chars) and text (if provided, ≤500 chars)
    - Focus returns to title input after successful submit
  - [x] Update [packages/web/src/components/AddTodoForm.module.css](packages/web/src/components/AddTodoForm.module.css): add textarea styles

- [x] Task 9: Update TodoItem component — display + inline edit (AC: #6, #7)
  - [x] In [packages/web/src/components/TodoItem.tsx](packages/web/src/components/TodoItem.tsx):
    - **Display mode:** render `todo.title` as the primary text and `todo.text` below it in smaller/muted style
    - **Edit mode:** show a text input for title and a textarea for text, both pre-populated
    - Keyboard: Enter in title input moves focus to textarea; Ctrl+Enter / Cmd+Enter in textarea saves; Escape cancels
    - Update `onUpdate` calls to pass `{ title, text }` fields
    - Update validation: title required ≤100 chars, text optional ≤500 chars
  - [x] Update [packages/web/src/components/TodoItem.module.css](packages/web/src/components/TodoItem.module.css): add `.description` style (smaller, muted), update `.editWrapper` for textarea

- [x] Task 10: Update App.tsx (AC: #5, #7)
  - [x] In [packages/web/src/App.tsx](packages/web/src/App.tsx): update `createTodo` call to pass `{ title, text }` object from form

- [x] Task 11: Update API test utils and fixtures (AC: #8)
  - [x] In [packages/api/test/test-utils/todos.ts](packages/api/test/test-utils/todos.ts):
    - `makeSeedTodo`: default `title: "seed todo"`, `text: null`, remove old `text` default
    - `seedTodo`: update INSERT SQL to use `title` column and new `text` column
    - Update `SeedTodoInput` type
  - [x] In [packages/web/src/test-utils/fetch-mocks.ts](packages/web/src/test-utils/fetch-mocks.ts):
    - Update `TODO_FIXTURES` to use `title` instead of `text` as primary field, add `text: null` or a description string

- [x] Task 12: Update all API integration tests (AC: #8)
  - [x] In `packages/api/test/todos.post.test.ts`: update payloads to send `{ title }` and `{ title, text }`, update assertions
  - [x] In `packages/api/test/todos.patch.test.ts`: update payloads and assertions for `title` and `text` fields
  - [x] In `packages/api/test/todos.get.test.ts`: update seed data and response assertions
  - [x] In `packages/api/test/todos.delete.test.ts`: update seed data if needed

- [x] Task 13: Update all web component and integration tests (AC: #8)
  - [x] Update `AddTodoForm.test.tsx`: test title + text form, validation for both fields
  - [x] Update `TodoItem.test.tsx`: test display of title + text, inline edit with title + textarea, Ctrl+Enter saves
  - [x] Update `App.test.tsx`, `App.create-todo.test.tsx`, `App.edit-todo.test.tsx`, `App.toggle-todo.test.tsx`, `App.delete-todo.test.tsx`, `App.mutation-concurrency.test.tsx`: update fixtures and assertions for `title`/`text`

- [x] Task 14: Update E2E tests (AC: #8)
  - [x] In [packages/web/e2e/todo-flows.spec.ts](packages/web/e2e/todo-flows.spec.ts):
    - Update create flow to fill title (and optionally text)
    - Update inline edit flow for title input + textarea
    - Update selectors and assertions for new form structure
    - Test that text/description appears below title when provided

- [x] Task 15: Run all validation gates
  - [x] `npm run type:check` passes
  - [x] `npm run biome:check` passes
  - [x] `npm run test:ci` passes
  - [x] `npm run test:e2e` passes

## Dev Notes

### Scope and Impact

This is a **breaking schema change** that touches every layer of the stack: DB schema, shared types/constants, API routes and validation, web components, hooks, and all tests. The rename of `text` → `title` as the primary field is pervasive.

### Migration Strategy

Use Drizzle Kit to generate the migration. The migration consists of two SQL statements:
1. `ALTER TABLE todos RENAME COLUMN "text" TO "title";` — existing data is preserved
2. `ALTER TABLE todos ADD COLUMN "text" text;` — nullable, no default needed

After migration, existing todos will have `title` = their old text value and `text` = null.

### Constants Change

The old `MAX_TODO_TEXT_LENGTH = 200` governed the single `text` field. Now:
- `MAX_TODO_TITLE_LENGTH = 100` — shorter, for scannable titles
- `MAX_TODO_TEXT_LENGTH = 500` — longer, for descriptions

**Breaking change**: all consumers of `MAX_TODO_TEXT_LENGTH` must be audited. In the web, `AddTodoForm` and `TodoItem` use it for validation. Update these to use `MAX_TODO_TITLE_LENGTH` for the title input and `MAX_TODO_TEXT_LENGTH` for the textarea.

### API Schema Changes

**POST /todos body** changes from `{ text: string }` to `{ title: string, text?: string }`:
- `title`: required, 1–100 chars, must contain non-whitespace (`.*\\S.*`)
- `text`: optional, 1–500 chars if provided, must contain non-whitespace

**PATCH /todos/:id body** changes from `{ text?, completed? }` to `{ title?, text?, completed? }`:
- Same constraints as POST for `title` and `text` when provided

**Response shapes** for `GET /todos`, `POST /todos`, `PATCH /todos/:id` now include both `title: string` and `text: string | null`.

### Shared Type (`todoSchema`) Changes

Update the JSON schema in `packages/shared/src/definitions/todo.ts`:
- `required` array: replace `"text"` with `"title"`
- Add `title: { type: "string" }` property
- Change `text` property to `{ anyOf: [{ type: "string" }, { type: "null" }] }` (nullable)

### Web Hook Changes (`useTodos`)

- `createTodo` currently accepts a single `text: string` argument. Change to `{ title: string, text?: string }`.
- `TodoUpdatableFields` currently is `Partial<Pick<Todo, "text" | "completed">>`. Change to `Partial<Pick<Todo, "title" | "text" | "completed">>`.
- The `derivePendingAction` function should treat `"title" in fields` the same as the old `"text" in fields` check for deriving the `"edit"` action.
- `pendingFields` merge logic works unchanged — fields are just spread.

### AddTodoForm Redesign

Currently a single text input + submit button. Change to:
- **Title input** (`<input type="text">`): required, placeholder "What needs to be done?", max 100 chars
- **Text textarea** (`<textarea>`): optional, placeholder "Add details... (optional)", max 500 chars
- **Submit button**: unchanged
- Validation: title is required and validated first; text is validated only if non-empty
- On submit: call `onSubmit({ title: trimmedTitle, text: trimmedText || undefined })`
- Clear both fields on success; focus returns to title input

### TodoItem Display Changes

Currently renders `todo.text` as the clickable text. Change to:
- **Title**: rendered with current primary text styling (the `.textButton` class)
- **Text/Description**: rendered below title in a new `.description` class — smaller font, muted color (use semantic token `--s-text-secondary`)
- Only render the description element if `todo.text` is not null

### TodoItem Inline Edit Changes

Currently shows a single `<input>` pre-populated with `todo.text`. Change to:
- **Title input** (`<input type="text">`): pre-populated with `todo.title`
- **Text textarea** (`<textarea>`): pre-populated with `todo.text ?? ""`
- **Keyboard behavior**:
  - In title input: Enter moves focus to textarea (does NOT save); Escape cancels
  - In textarea: Enter inserts newline; Ctrl+Enter / Cmd+Enter saves; Escape cancels
  - Click-outside: save (same as Ctrl+Enter)
- **Validation**: same as AddTodoForm (title required ≤100, text optional ≤500)
- **Save**: call `onUpdate(todo.id, { title: trimmedTitle, text: trimmedText || null })`

### E2E Test Updates

The E2E tests locate form elements by role/label. Key selector changes:
- The "add todo" input becomes the title input; add a second textarea element
- Edit mode shows two inputs instead of one
- Assertions on todo text in the list should check for `title` text content
- Add tests for description display when text is provided

### CSS Token Guidance

Per project feedback: keep design tokens minimal. For the description text, use existing semantic tokens:
- `--s-text-secondary` for muted text color (if it exists, otherwise add a single new token)
- Smaller font: use a relative size like `0.875rem` or `font-size: var(--s-font-size-sm)` if available

### Test Fixture Updates

**API test fixtures** (`makeSeedTodo`): default changes from `text: "seed todo"` to `title: "seed todo"`, `text: null`.

**Web test fixtures** (`TODO_FIXTURES`): change from `{ text: "Buy milk" }` to `{ title: "Buy milk", text: null }`. Some fixtures should include `text` values to test description rendering.

### Anti-Patterns to Avoid

- Do NOT keep `text` as an alias or backward-compat wrapper — the rename is clean and total
- Do NOT add a separate migration for the rename and the add-column — do both in one migration
- Do NOT change the `createdAt`/`updatedAt` timestamp behavior — unchanged
- Do NOT change the soft-delete or ordering semantics — unchanged
- Do NOT change the abort/concurrency logic in `useTodos` — field names change but the merge/abort pattern is identical
- Do NOT add markdown/rich-text parsing — store and render as plain strings

### Project Structure Notes

No new files are created except:
- One Drizzle migration file (auto-generated in `packages/api/drizzle/`)
- Possible new CSS class in existing `.module.css` files

All changes are modifications to existing files. No new components, hooks, or modules.

### Previous Story Intelligence (Story 2.6)

- Unified `updateTodo(id, fields)` with `TodoUpdatableFields` — extend type to include `title`
- `derivePendingAction` checks `"text" in fields` for edit — update to check `"title" in fields`
- `pendingFields` merge via spread works unchanged — just add `title` to the type
- All component tests use `onUpdate` prop — update assertions for `{ title, text }` objects
- AbortController and snapshot/rollback logic is field-agnostic — no changes needed

### Git Intelligence

Recent commits follow `feat: story X.Y` convention. This story should commit as `feat: story 3.0` or with more descriptive message like `feat: add title field to todos with text as description`.

### References

- [Source: epics.md#Story 3.0] — Acceptance criteria and technical notes
- [Source: architecture.md#Data Architecture] — DB schema, constraints, timestamp ownership
- [Source: architecture.md#API & Communication Patterns] — Route schemas, response shapes, error contract
- [Source: architecture.md#Frontend Architecture] — CSS tokens, state management, styling approach
- [Source: architecture.md#API Contract Sharing] — OpenAPI generation, pre-commit hooks
- [Source: ux-design-specification.md] — Inline edit behavior, mobile-first, minimalism
- [Source: project-context.md#Code Style] — Named destructured args, JSDoc, kebab-case files
- [Source: project-context.md#Testing] — AAA pattern, nested describe/it, no top-level it()
- [Source: 2-6-*.md] — Unified updateTodo, AbortController patterns, TodoUpdatableFields type

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6 (1M context)

### Debug Log References

- drizzle-kit generate/migrate CLI failed due to config resolution issue (import.meta.dirname undefined in drizzle-kit context); migration SQL applied directly via docker exec
- Separate test database (bmad_todo_test) required same migration applied manually
- PATCH schema for `text` field uses minLength:1 — TodoItem edit only sends `text` when it changed and is non-null to avoid validation errors

### Completion Notes List

- ✅ Task 1: Created manual Drizzle migration (0001_rename_text_to_title_add_text.sql) + snapshot. Applied to both dev and test databases.
- ✅ Task 2: Added MAX_TODO_TITLE_LENGTH=100, updated MAX_TODO_TEXT_LENGTH=500, updated todoSchema with title required + text nullable.
- ✅ Task 3: Updated all DB operations to use title/text fields.
- ✅ Task 4: Updated POST/PATCH route schemas with title (1-100 chars) and text (1-500 chars) constraints.
- ✅ Task 5: Updated route handlers to extract and trim title/text from request bodies.
- ✅ Task 6: Regenerated OpenAPI spec and TypeScript API types.
- ✅ Task 7: Updated web contracts (re-exports) and useTodos hook (createTodo signature, TodoUpdatableFields type).
- ✅ Task 8: Redesigned AddTodoForm with title input + description textarea, updated validation messages.
- ✅ Task 9: Updated TodoItem display (title primary, description secondary/muted) and inline edit (title input + textarea, Enter→textarea focus, Ctrl+Enter saves).
- ✅ Task 10: No changes needed to App.tsx — createTodo prop signature already compatible.
- ✅ Task 11: Updated API test fixtures (makeSeedTodo, seedTodo SQL) and web fixtures (TODO_FIXTURES).
- ✅ Task 12: Updated all 4 API integration test files for title/text schema.
- ✅ Task 13: Updated all 8 web test files for new form structure, aria labels, and validation messages.
- ✅ Task 14: Updated E2E tests for new form selectors, keyboard behavior, and added description display test.
- ✅ Task 15: All validation gates pass — type:check, biome:check, test:ci (99 tests), test:e2e (17 tests).

### File List

- packages/api/drizzle/0001_rename_text_to_title_add_text.sql (new)
- packages/api/drizzle/meta/0001_snapshot.json (new)
- packages/api/drizzle/meta/_journal.json (modified)
- packages/api/src/db/schema.ts (modified)
- packages/api/src/db/todos.ts (modified)
- packages/api/src/routes/schemas.ts (modified)
- packages/api/src/routes/todos.ts (modified)
- packages/api/openapi.json (regenerated)
- packages/api/test/test-utils/todos.ts (modified)
- packages/api/test/todos.get.test.ts (modified)
- packages/api/test/todos.post.test.ts (modified)
- packages/api/test/todos.patch.test.ts (modified)
- packages/shared/src/constants.ts (modified)
- packages/shared/src/definitions/todo.ts (modified)
- packages/shared/src/index.ts (modified)
- packages/web/src/api/generated/index.ts (regenerated)
- packages/web/src/contracts.ts (modified)
- packages/web/src/hooks/useTodos.ts (modified)
- packages/web/src/components/AddTodoForm.tsx (modified)
- packages/web/src/components/AddTodoForm.module.css (modified)
- packages/web/src/components/TodoItem.tsx (modified)
- packages/web/src/components/TodoItem.module.css (modified)
- packages/web/src/test-utils/fetch-mocks.ts (modified)
- packages/web/src/components/AddTodoForm.test.tsx (modified)
- packages/web/src/components/TodoItem.test.tsx (modified)
- packages/web/src/App.create-todo.test.tsx (modified)
- packages/web/src/App.edit-todo.test.tsx (modified)
- packages/web/src/App.toggle-todo.test.tsx (modified)
- packages/web/src/App.mutation-concurrency.test.tsx (modified)
- packages/web/e2e/todo-flows.spec.ts (modified)

## Change Log

- Story 3.0: Add title field to todos with text as optional description (Date: 2026-04-03)
