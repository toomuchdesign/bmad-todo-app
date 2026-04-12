# Story 6.5: UI Component Architecture Refactor

Status: ready-for-dev

## Story

As a maintainer,
I want the web UI rebuilt on an explicit atom/molecule component hierarchy aligned to the design system,
so that markup is DRY, design tokens are consistently applied across all components, and `AddTodoCard` matches the intended card + `expandOnFocus` UX specified in the ADR.

## Acceptance Criteria

### AC1 — Atom components extracted

**Given** the design system hierarchy
**When** atoms are implemented
**Then** the following standalone, reusable atoms exist under `packages/web/src/components/atoms/`:
- `Button` — primary and ghost variants, disabled and loading states
- `Input` — text/email/password input with error state, forward-ref
- `Checkbox` — styled checkbox with forward-ref
- `NavLink` — button-as-link with active/inactive visual state (accent underline when active)

**And** each atom has its own `index.tsx` + CSS Module file
**And** atoms have no knowledge of domain concepts (no todo, no auth)

### AC2 — FormField molecule extracted

**Given** the repeated label+input+error pattern in `LoginForm` and `RegisterForm`
**When** `FormField` is implemented at `packages/web/src/components/FormField/`
**Then** it renders: a `<label htmlFor={id}>` + `children` (the input element) + an optional error `<p role="alert">`
**And** `LoginForm` and `RegisterForm` use `FormField` to wrap each field instead of inline `<div className={styles.field}>` patterns

### AC3 — AddTodoCard rebuilt with card structure and expandOnFocus

**Given** the card layout specified in `docs/decisions/adr-add-todo-card.md`
**When** `AddTodoCard` is implemented at `packages/web/src/components/AddTodoCard/`
**Then** the old `AddTodoForm.tsx` and `AddTodoForm.module.css` are deleted
**And** `AddTodoCard` accepts the same `onSubmit` and `titleInputRef` props as the old `AddTodoForm`, plus a new `expandOnFocus?: boolean` prop (default: `true`)

**Given** `expandOnFocus={true}` (default)
**When** the card is in idle/blur state with an empty title
**Then** only the title input is visible; the card has a quiet `1px solid var(--s-border)` border; footer is hidden

**Given** `expandOnFocus={true}` and the title input receives focus
**When** focus enters the title input
**Then** the textarea and footer (Cancel + Add buttons) become visible
**And** the card border changes to `1px solid var(--s-border-accent)` with shadow `0 2px 16px rgba(100,60,160,0.1)`

**Given** `expandOnFocus={true}`, the card is expanded, and the user blurs with an empty title
**When** focus leaves the card with an empty title field
**Then** the card collapses back to title-only state

**Given** `expandOnFocus={true}`, the card is expanded, and the user blurs with title content
**When** focus leaves the card with a non-empty title
**Then** the card stays expanded (user has started an entry)

**Given** the Cancel button is clicked
**When** cancel fires
**Then** title and description fields are cleared and the card collapses

**Given** the Add button is clicked and the submission succeeds
**When** `onSubmit` resolves `true`
**Then** fields are cleared and the card collapses

**Given** `expandOnFocus={false}`
**When** the card renders
**Then** it always renders in fully expanded state (textarea + footer always visible); same as the base Option C layout

### AC4 — Existing components updated to use atoms

**Given** the extracted atoms
**When** the following components are updated
**Then** they compose atoms instead of duplicating raw HTML + CSS:
- `LoginForm` → uses `Input`, `Button` (primary submit), `FormField` for each field
- `RegisterForm` → same pattern as `LoginForm`
- `AppHeader` → uses `NavLink` for Log in/Register nav buttons; uses `Button` (ghost) for Log out
- `TodoItem` → uses `Checkbox` for the completion checkbox
- `GlobalErrorBanner` → uses `Button` (ghost) for Retry
- `AddTodoCard` → uses `Input` for title; uses `Button` (primary) for Add, `Button` (ghost) for Cancel

### AC5 — All existing functional tests remain green and unchanged

**Given** the UI refactor
**When** `npm run test:ci` completes
**Then** all existing `App.*.test.tsx` files pass with zero changes to their source
**And** `LoginForm.test.tsx`, `RegisterForm.test.tsx`, `AppHeader.test.tsx`, `TodoItem.test.tsx` pass — their behavioral assertions are untouched (only imports may be updated if component paths change)

### AC6 — New component tests for atoms and AddTodoCard expandOnFocus

**Given** the new atoms
**When** their tests run
**Then** `Button.test.tsx` covers: renders primary + ghost variants, shows loading text, disables on `disabled` prop, calls onClick
**And** `AddTodoCard.test.tsx` (replacing `AddTodoForm.test.tsx`) covers all prior add-form scenarios PLUS: card collapses on blur with empty title; card stays expanded on blur with content; Cancel clears and collapses

## Tasks / Subtasks

- [ ] Task 1 — Extract `Button` atom (AC1, AC4, AC6)
  - [ ] Create `packages/web/src/components/atoms/Button/index.tsx`
  - [ ] Create `packages/web/src/components/atoms/Button/Button.module.css`
  - [ ] Create `packages/web/src/components/atoms/Button/Button.test.tsx`
  - [ ] Props: `{ variant: 'primary' | 'ghost'; type?: 'button' | 'submit'; disabled?: boolean; loading?: boolean; loadingText?: string; onClick?: () => void; children: React.ReactNode; className?: string }`
  - [ ] Primary: `background: var(--s-accent); color: var(--s-text-on-accent); border: 1px solid transparent; border-radius: var(--s-radius-md)`; hover: `--s-accent-hover`
  - [ ] Ghost: `background: transparent; border: 1px solid var(--s-border); color: var(--s-text); border-radius: var(--s-radius-md)`; hover: border `--s-border-focus`
  - [ ] Disabled: `opacity: 0.6; cursor: not-allowed`
  - [ ] Focus: `outline: 2px solid var(--s-border-focus); outline-offset: 2px`
  - [ ] When `loading=true`: render `loadingText` (or children suffixed with "…") and apply `disabled`
  - [ ] Tests: render both variants, disabled state, loading state shows loadingText, onClick fires

- [ ] Task 2 — Extract `Input` atom (AC1, AC4)
  - [ ] Create `packages/web/src/components/atoms/Input/index.tsx`
  - [ ] Create `packages/web/src/components/atoms/Input/Input.module.css`
  - [ ] Use `React.forwardRef<HTMLInputElement, InputProps>`
  - [ ] Props: extend `React.InputHTMLAttributes<HTMLInputElement>` + `{ error?: boolean }`
  - [ ] Base: `padding: var(--s-space-2-5) var(--s-space-3); font-size: var(--s-font-size-base); border: 1px solid var(--s-border); border-radius: var(--s-radius-md); outline: none`
  - [ ] Focus: `border-color: var(--s-border-focus); box-shadow: 0 0 0 2px var(--s-focus-ring)`
  - [ ] Error: `border-color: var(--s-border-error)`
  - [ ] Disabled: `opacity: 0.6; cursor: not-allowed`
  - [ ] Export as `Input`

- [ ] Task 3 — Extract `Checkbox` atom (AC1, AC4)
  - [ ] Create `packages/web/src/components/atoms/Checkbox/index.tsx`
  - [ ] Create `packages/web/src/components/atoms/Checkbox/Checkbox.module.css`
  - [ ] Use `React.forwardRef<HTMLInputElement, CheckboxProps>`
  - [ ] Props: extend `React.InputHTMLAttributes<HTMLInputElement>` (type is always "checkbox")
  - [ ] CSS mirrors the existing `styles.checkbox` from `TodoItem.module.css` exactly — do not change visual appearance
  - [ ] Export as `Checkbox`

- [ ] Task 4 — Extract `NavLink` atom (AC1, AC4)
  - [ ] Create `packages/web/src/components/atoms/NavLink/index.tsx`
  - [ ] Create `packages/web/src/components/atoms/NavLink/NavLink.module.css`
  - [ ] Props: `{ active?: boolean; onClick: () => void; 'aria-current'?: React.AriaAttributes['aria-current']; children: React.ReactNode }`
  - [ ] Active: `color: var(--s-accent); text-decoration: underline; text-underline-offset: 7px; text-decoration-thickness: 2px`
  - [ ] Inactive: `color: var(--s-text); text-decoration: none`
  - [ ] Renders as `<button type="button">` (no routing library)
  - [ ] Export as `NavLink`

- [ ] Task 5 — Extract `FormField` molecule (AC2, AC4)
  - [ ] Create `packages/web/src/components/FormField/index.tsx`
  - [ ] Create `packages/web/src/components/FormField/FormField.module.css`
  - [ ] Props: `{ id: string; label: string; error?: string; children: React.ReactElement }`
  - [ ] Renders: `<div className={styles.field}><label htmlFor={id}>{label}</label>{children}{error && <p role="alert" className={styles.error}>{error}</p>}</div>`
  - [ ] CSS mirrors `styles.field` and `styles.error` from `LoginForm.module.css` — remove those classes from LoginForm/RegisterForm CSS modules after migration

- [ ] Task 6 — Rebuild `AddTodoCard` (AC3, AC4, AC6)
  - [ ] Create `packages/web/src/components/AddTodoCard/index.tsx`
  - [ ] Create `packages/web/src/components/AddTodoCard/AddTodoCard.module.css`
  - [ ] Create `packages/web/src/components/AddTodoCard/AddTodoCard.test.tsx`
  - [ ] Delete `packages/web/src/components/AddTodoForm.tsx`
  - [ ] Delete `packages/web/src/components/AddTodoForm.module.css`
  - [ ] Props: `{ onSubmit: (data: { title: string; text?: string }) => Promise<boolean>; titleInputRef?: React.RefObject<HTMLInputElement | null>; expandOnFocus?: boolean }` — default `expandOnFocus = true`
  - [ ] Preserve ALL existing logic from `AddTodoForm.tsx` (validation, focus-after-submit, Ctrl/Cmd+Enter in textarea)
  - [ ] Add `isExpanded` state: when `expandOnFocus=false` always `true`; when `true` starts `false`, becomes `true` on title focus, collapses on blur if title empty, stays open if title has content
  - [ ] Card CSS structure:
    ```
    .card { border-radius: var(--s-radius-lg); border: 1px solid var(--s-border); margin: 0 var(--s-space-4); }
    .card.expanded { border-color: var(--s-border-accent); box-shadow: 0 2px 16px rgba(100,60,160,0.1); }
    .cardBody { padding: var(--s-space-3) var(--s-space-3) 0; }
    .titleInput { all: unset; width: 100%; font-size: var(--s-font-size-base); color: var(--s-text); padding: var(--s-space-2) 0; }
    .titleInput::placeholder { color: var(--s-text); opacity: 0.5; }
    .textarea { margin-top: var(--s-space-2); border: 1px solid var(--s-border); background: rgba(170,59,255,0.02); border-radius: var(--s-radius-sm); padding: var(--s-space-2-5) var(--s-space-3); font-size: var(--s-font-size-base); font-family: inherit; width: 100%; resize: vertical; outline: none; }
    .textarea:focus-visible { border-color: var(--s-border-focus); box-shadow: 0 0 0 2px var(--s-focus-ring); }
    .cardFooter { display: flex; justify-content: flex-end; gap: var(--s-space-2); padding: var(--s-space-2) var(--s-space-3); background: rgba(170,59,255,0.04); margin-top: var(--s-space-2); }
    .validationError { margin: var(--s-space-1) var(--s-space-3) 0; font-size: var(--s-font-size-sm); color: var(--s-text-error); }
    ```
  - [ ] Title input uses `Input` atom? No — inside the card it is **borderless** (uses `titleInput` class above). Use raw `<input>` for the title. Use `Input` atom for the textarea equivalent if applicable, but textarea is always raw `<textarea>` (no atom yet).
  - [ ] Footer buttons: `<Button variant="ghost" onClick={handleCancel}>Cancel</Button>` and `<Button variant="primary" type="submit" loading={submitting} loadingText="Adding…">Add</Button>`
  - [ ] `handleCancel`: clear `title`, `text`, `validationError`, and if `expandOnFocus` set `isExpanded = false`
  - [ ] Blur detection for collapse: attach `onBlur` to a wrapping `<div>` — only collapse if `relatedTarget` is outside the card (use same pattern as `TodoItem` `handleBlur`)
  - [ ] `AddTodoCard.test.tsx`: rename from `AddTodoForm.test.tsx`; update import; keep all prior scenarios; add:
    - `describe("expandOnFocus")` > `describe("idle state")` > `it("shows only title input")`
    - `describe("expandOnFocus")` > `describe("on title focus")` > `it("expands card")`
    - `describe("expandOnFocus")` > `describe("on blur with empty title")` > `it("collapses card")`
    - `describe("expandOnFocus")` > `describe("on blur with title content")` > `it("stays expanded")`
    - `describe("cancel button")` > `it("clears fields and collapses")`

- [ ] Task 7 — Update `LoginForm` to use atoms (AC4, AC5)
  - [ ] Replace `<div className={styles.field}><label>…</label><input className={inputClassName}>` with `<FormField id="login-email" label="Email" error={error ? '' : undefined}><Input ref={emailRef} id="login-email" error={!!error} …/></FormField>`
  - [ ] Replace `<button type="submit" className={styles.submitButton}>` with `<Button variant="primary" type="submit" loading={loading} loadingText="Logging in…">Log in</Button>`
  - [ ] Replace footer link `<button className={styles.footerLink}>` with a `NavLink` atom (active=false always, since it's just a footer link — may use `Button variant="ghost"` styled minimally, or keep as inline text link button)
  - [ ] Remove now-redundant CSS rules from `LoginForm.module.css` (`.field`, `.input`, `.submitButton`, `.error` move to atoms/FormField)
  - [ ] `LoginForm.test.tsx` behavioral assertions must remain identical — do not change test source

- [ ] Task 8 — Update `RegisterForm` to use atoms (AC4, AC5)
  - [ ] Same pattern as `LoginForm`: `FormField` + `Input` + `Button` (primary submit)
  - [ ] `RegisterForm.test.tsx` behavioral assertions must remain identical

- [ ] Task 9 — Update `AppHeader` to use atoms (AC4, AC5)
  - [ ] Replace inline `<button className={navButtonClassName(…)}>` with `<NavLink active={loginActive} aria-current={loginActive ? "page" : undefined} onClick={…}>Log in</NavLink>`
  - [ ] Replace `<button className={styles.logoutButton}>` with `<Button variant="ghost" onClick={onLogout}>Log out</Button>`
  - [ ] Remove redundant CSS classes from `AppHeader.module.css` (`.navLink`, `.navActive`, `.logoutButton` → moved to atoms)
  - [ ] `AppHeader.test.tsx` behavioral assertions must remain identical

- [ ] Task 10 — Update `TodoItem` to use `Checkbox` atom (AC4, AC5)
  - [ ] Replace `<input ref={checkboxRef} type="checkbox" className={styles.checkbox} …>` with `<Checkbox ref={checkboxRef} …/>`
  - [ ] Remove `.checkbox` from `TodoItem.module.css`
  - [ ] `TodoItem.test.tsx` behavioral assertions must remain identical

- [ ] Task 11 — Update `GlobalErrorBanner` to use `Button` atom (AC4)
  - [ ] Replace `<button type="button" className={styles.retryButton} …>Retry</button>` with `<Button variant="ghost" onClick={onRetry} disabled={loading}>Retry</Button>`
  - [ ] Remove `.retryButton` from `GlobalErrorBanner.module.css`

- [ ] Task 12 — Update `App.tsx` import (AC3)
  - [ ] Change `import { AddTodoForm } from "./components/AddTodoForm"` → `import { AddTodoCard } from "./components/AddTodoCard"`
  - [ ] Change `<AddTodoForm …>` → `<AddTodoCard …>` (props unchanged)

- [ ] Task 13 — Add atoms barrel export (optional, consistency)
  - [ ] Create `packages/web/src/components/atoms/index.ts` that re-exports `Button`, `Input`, `Checkbox`, `NavLink`
  - [ ] Internal component imports can use `../atoms` barrel

- [ ] Task 14 — Validation gate (AC5)
  - [ ] `npm run type:check` — must pass with 0 errors
  - [ ] `npm run biome:check` (fix with `npm run biome:fix` if needed)
  - [ ] `npm run test:ci` — all existing tests must pass
  - [ ] `npm run test:e2e` — all E2E tests must pass

## Dev Notes

### Critical constraints

- **Functional tests are a hard constraint**: `App.auth.test.tsx`, `App.create-todo.test.tsx`, `App.delete-todo.test.tsx`, `App.edit-todo.test.tsx`, `App.mutation-concurrency.test.tsx`, `App.test.tsx`, `App.toggle-todo.test.tsx` — zero source changes to these files.
- **Behavior is unchanged**: this is a pure markup/CSS/structure refactor. No hook logic changes. No API call changes. No validation logic changes.
- **Do not touch**: `hooks/`, `utils/`, `api/`, `contracts.ts`, `main.tsx`, any API package code.

### AddTodoCard: key implementation detail — blur handling for collapse

The collapse-on-blur logic must handle the case where clicking Cancel or Add (inside the card) triggers a blur on the title input before the click fires. Use a wrapping div with `onBlur`:

```tsx
function handleCardBlur(e: React.FocusEvent<HTMLDivElement>): void {
  // Only collapse if focus leaves the entire card
  if (e.relatedTarget && e.currentTarget.contains(e.relatedTarget as Node)) {
    return;
  }
  if (!title.trim()) {
    setIsExpanded(false);
  }
}
```

This mirrors the same pattern used in `TodoItem.tsx` (`handleBlur` checks `itemRef.current?.contains(target)`). [Source: packages/web/src/components/TodoItem.tsx#L85-L93]

### AddTodoCard: title input is borderless inside the card

The title `<input>` inside `AddTodoCard` does NOT use the `Input` atom — it uses `all: unset` + width 100% so the card container acts as the visual boundary. This is intentional per the ADR. The `Input` atom is used in auth forms (LoginForm, RegisterForm) where the field has its own visible border.

### Existing component locations (pre-refactor)

```
packages/web/src/components/
  AddTodoForm.tsx                  ← DELETE (replaced by AddTodoCard/)
  AddTodoForm.module.css           ← DELETE
  AppHeader/
    index.tsx                      ← UPDATE (use NavLink + Button atoms)
    AppHeader.module.css           ← UPDATE (trim redundant classes)
    AppHeader.test.tsx             ← UPDATE import only if needed
  GlobalErrorBanner.tsx            ← UPDATE (use Button atom)
  GlobalErrorBanner.module.css     ← UPDATE
  LoginForm/
    index.tsx                      ← UPDATE (use FormField + Input + Button)
    LoginForm.module.css           ← UPDATE (trim redundant classes)
    LoginForm.test.tsx             ← UNCHANGED (behavior only)
  RegisterForm/
    index.tsx                      ← UPDATE
    RegisterForm.module.css        ← UPDATE
    RegisterForm.test.tsx          ← UNCHANGED (behavior only)
  TodoItem.tsx                     ← UPDATE (use Checkbox atom)
  TodoItem.module.css              ← UPDATE
  TodoItem.test.tsx                ← UNCHANGED (behavior only)
  TodoList.tsx                     ← NO CHANGE
  TodoList.module.css              ← NO CHANGE
```

### New file locations (post-refactor)

```
packages/web/src/components/
  atoms/
    Button/
      index.tsx
      Button.module.css
      Button.test.tsx
    Input/
      index.tsx
      Input.module.css
    Checkbox/
      index.tsx
      Checkbox.module.css
    NavLink/
      index.tsx
      NavLink.module.css
    index.ts                       ← barrel export
  FormField/
    index.tsx
    FormField.module.css
  AddTodoCard/
    index.tsx
    AddTodoCard.module.css
    AddTodoCard.test.tsx
```

### Design token reference (from `packages/web/src/tokens/`)

```
Radii:     --s-radius-sm: 4px | --s-radius-md: 6px | --s-radius-lg: 8px
Accent:    --s-accent: #aa3bff | --s-accent-hover: #4f46e5
Borders:   --s-border: #e5e4e7 | --s-border-accent: rgba(170,59,255,0.4)
           --s-border-focus: #6366f1 | --s-border-error: #fecaca
Focus:     --s-focus-ring: rgba(99,102,241,0.15)
Text:      --s-text: #6b6375 | --s-text-on-accent: #fff | --s-text-error: #dc2626
Space:     --s-space-1: 4px | --s-space-2: 8px | --s-space-2-5: 10px
           --s-space-3: 12px | --s-space-4: 16px | --s-space-5: 20px
Font size: --s-font-size-sm: 13px | --s-font-size-base: 14px
```

### Test utilities

Web tests import from shared barrel: `packages/web/src/test-utils/index.ts`.
Component tests use `React Testing Library` + `@testing-library/jest-dom`.
No real network calls in unit/component tests.
[Source: project-context.md § Testing Memory]

### AddTodoCard: AddTodoForm backward-compat note

`App.tsx` currently imports `AddTodoForm` and passes `onSubmit` and `titleInputRef`. After Task 12, it imports `AddTodoCard` with the same prop interface. No other files import `AddTodoForm` — verify with `grep -r "AddTodoForm" packages/web/src` before deleting.

### References

- ADR for AddTodoCard: [docs/decisions/adr-add-todo-card.md](../../docs/decisions/adr-add-todo-card.md)
- ADR for auth UI layout: [docs/decisions/adr-auth-ui-layout.md](../../docs/decisions/adr-auth-ui-layout.md)
- Design system visual spec: [docs/mockups/design-system.html](../../docs/mockups/design-system.html)
- Design system entry point: [docs/ui-overview.md](../../docs/ui-overview.md)
- PRD FR27/28/29 (AddTodoCard requirements): [_bmad-output/planning-artifacts/prd.md](../planning-artifacts/prd.md)

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

### Completion Notes List

### File List
