# SDD Tasks: hot-fixes

## Executive Summary

| Field | Value |
|-------|-------|
| **Change** | `hot-fixes` — 5 UX bugs (3 CurrencyInput loop, 1 iOS zoom, 1 card form) |
| **Delivery strategy** | Auto-forecast (single PR, 3 work units) |
| **Review budget** | 400 lines max (forecast: ~150-200 lines) |
| **Chained PRs** | Not needed — budget well under limit |
| **Total work units** | 3 |
| **Total tasks** | 17 |

---

## Work Unit 1: Fix CurrencyInput feedback loop (Issues 1-3)

**Files:** `src/components/form/CurrencyInput.tsx`, `src/components/form/CurrencyInput.test.tsx`

**Commit message:** `fix(currency-input): break circular feedback loop on typing`

### WU-1.1 — Add `useRef` import and `isEditing` ref

| Field | Value |
|-------|-------|
| **File** | `src/components/form/CurrencyInput.tsx` |
| **Lines** | 13 (import), 49 (after, ref) |
| **Change** | Add `useRef` to React import; add `const isEditing = useRef(false)` after `useState` calls |
| **Type** | refactor |
| **Testing** | No behavioral change — ref exists but unused until next tasks |
| **Design ref** | §2.1, lines 77-89 |

**Acceptance criteria:**
- [ ] Import includes `useRef`
- [ ] `isEditing` ref initialized to `false`
- [ ] TypeScript compiles with no errors (`tsc --noEmit`)

### WU-1.2 — Guard `useEffect` sync with `isEditing.current`

| Field | Value |
|-------|-------|
| **File** | `src/components/form/CurrencyInput.tsx` |
| **Lines** | 50-53 |
| **Change** | Wrap `setDisplay(formatValueForInput(value))` in `if (!isEditing.current) { ... }` |
| **Type** | refactor |

**Acceptance criteria:**
- [ ] `useEffect` skips sync when `isEditing.current === true`
- [ ] `useEffect` syncs normally when `isEditing.current === false`
- [ ] No regressions in existing tests

### WU-1.3 — Keep `onChange` updating display locally (no behavior change)

| Field | Value |
|-------|-------|
| **File** | `src/components/form/CurrencyInput.tsx` |
| **Lines** | 55-60 |
| **Change** | Verify `onChange` updates local `setDisplay` and emits `onChangeCents` — no change needed, current code already correct |
| **Type** | inspect (no-op) |

**Rationale:** The existing `onChange` already does the right thing — sets display plus emits live cents. The bug is in the `useEffect` feedback, not in `onChange` itself. No code change needed, listed for completeness.

### WU-1.4 — Add `isEditing.current = false` to `onBlur`

| Field | Value |
|-------|-------|
| **File** | `src/components/form/CurrencyInput.tsx` |
| **Lines** | 62-67 |
| **Change** | Set `isEditing.current = false` as first line in `onBlur`. Then parse, emit, and format display |
| **Type** | refactor |

**Acceptance criteria:**
- [ ] `onBlur` sets `isEditing.current = false` before parsing
- [ ] `onBlur` emits `onChangeCents` with parsed value
- [ ] `onBlur` formats display via `centsToDisplayString`
- [ ] Existing tests for blur behavior still pass

### WU-1.5 — Add `onFocus` handler

| Field | Value |
|-------|-------|
| **File** | `src/components/form/CurrencyInput.tsx` |
| **Lines** | new (after onBlur), plus JSX binding (~line 70-88) |
| **Change** | Add `function onFocus(): void { isEditing.current = true; }` and bind `onFocus={onFocus}` to the `<Input>` component |
| **Type** | refactor |

**Acceptance criteria:**
- [ ] `onFocus` sets `isEditing.current = true`
- [ ] `onFocus={onFocus}` bound to Input component
- [ ] No current test asserts `onFocus` behavior — new tests below cover it

### WU-1.6 — Replace `toLocaleString("es-MX")` with `toFixed(2)` in `formatValueForInput`

| Field | Value |
|-------|-------|
| **File** | `src/components/form/CurrencyInput.tsx` |
| **Lines** | 92-101 |
| **Change** | Replace `return (cents / 100).toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 })` with `return (cents / 100).toFixed(2)` |
| **Type** | refactor |

**Rationale from design (§2.1, lines 179-183):** `toLocaleString` produces thousands separator commas (`"1,234.00"`). Mid-edit backspace on `"1,234.00"` produces `"1,23"` which `parseCurrencyInput` misparses as 123 cents instead of 1234. `toFixed(2)` produces `"1234.00"` — no commas, backspace works.

**Acceptance criteria:**
- [ ] `formatValueForInput(123400)` returns `"1234.00"` (not `"1,234.00"`)
- [ ] `formatValueForInput(0)` returns `""` (falsy check preserved)
- [ ] `formatValueForInput(50)` returns `"0.50"`
- [ ] `formatValueForInput(123456)` returns `"1234.56"`
- [ ] No thousands separator commas in output

### WU-1.7 — Add tests for typing flow and edit-mode behavior

| Field | Value |
|-------|-------|
| **File** | `src/components/form/CurrencyInput.test.tsx` |
| **Lines** | new tests |
| **Change** | Add 3 test cases for edit-mode behavior |
| **Type** | test |

**Test 1: does not reformat display while typing**
```ts
it("does not reformat display while typing", async () => {
  const onChangeCents = vi.fn();
  render(<CurrencyInput value={0} onChangeCents={onChangeCents} aria-label="amount" />);
  const user = userEvent.setup();
  const input = screen.getByLabelText("amount");
  await user.type(input, "1234");
  expect(input).toHaveValue("1234");
  expect(onChangeCents).toHaveBeenLastCalledWith(123400);
});
```

**Test 2: formats display on blur**
```ts
it("formats display on blur after typing", async () => {
  const onChangeCents = vi.fn();
  render(<CurrencyInput value={0} onChangeCents={onChangeCents} aria-label="amount" />);
  const user = userEvent.setup();
  const input = screen.getByLabelText("amount");
  await user.type(input, "999");
  await user.tab();
  expect(input).toHaveValue("999.00");
  expect(onChangeCents).toHaveBeenLastCalledWith(99900);
});
```

**Test 3: preserves cursor on backspace (no double-zero)**
```ts
it("preserves cursor on backspace (no double-zero)", async () => {
  const onChangeCents = vi.fn();
  render(<CurrencyInput value={0} onChangeCents={onChangeCents} aria-label="amount" />);
  const user = userEvent.setup();
  const input = screen.getByLabelText("amount");
  await user.type(input, "1234");
  await user.keyboard("{Backspace}");
  expect(input).toHaveValue("123");
  expect(onChangeCents).toHaveBeenLastCalledWith(12300);
});
```

**Acceptance criteria:**
- [ ] All 3 new tests pass
- [ ] No existing tests broken
- [ ] fake-indexeddb setup intact (if CurrencyInput test imports Dexie mocks)

### WU-1.8 — Update existing test assertions for edit-mode behavior

| Field | Value |
|-------|-------|
| **File** | `src/components/form/CurrencyInput.test.tsx` |
| **Lines** | existing test blocks |
| **Change** | Review and update existing test assertions that may conflict with new edit-mode behavior |
| **Type** | test |

**Acceptance criteria:**
- [ ] "emits parsed cents on each keystroke" test updated to note blur is the definitive emission
- [ ] All existing tests still pass
- [ ] No dead assertions or stale mocks

---

## Work Unit 2: Fix input font-size for iOS (Issue 4)

**Files:** `src/components/ui/Input.tsx`, `src/components/ui/Select.tsx`, `src/components/ui/Textarea.tsx`

**Commit message:** `fix(ui): bump input font-size to 16px for iOS auto-zoom prevention`

### WU-2.1 — Input.tsx: change `md` variant `text-sm` → `text-base`

| Field | Value |
|-------|-------|
| **File** | `src/components/ui/Input.tsx` |
| **Lines** | 27 (cva variant), 97 (addon path) |
| **Change** | Line 27: `md: "h-11 px-4 text-sm rounded-[var(--radius-md)]"` → `md: "h-11 px-4 text-base rounded-[var(--radius-md)]"`. Line 97: `size === "sm" ? "text-sm" : size === "lg" ? "text-base" : "text-sm"` → change the final `"text-sm"` branch to `"text-base"` |
| **Type** | style |
| **Design ref** | §2.2, lines 237-251 |

**Acceptance criteria:**
- [ ] Default `<Input />` has computed `font-size: 16px`
- [ ] `<Input size="sm" />` stays at computed `font-size: 14px`
- [ ] `<Input size="lg" />` stays at computed `font-size: 16px`
- [ ] Input with left addon (md) has `font-size: 16px`
- [ ] No layout breakage from `text-sm → text-base` change

### WU-2.2 — Select.tsx: change `md` sizeClasses `text-sm` → `text-base`

| Field | Value |
|-------|-------|
| **File** | `src/components/ui/Select.tsx` |
| **Lines** | 29 |
| **Change** | `md: "h-11 text-sm"` → `md: "h-11 text-base"` |
| **Type** | style |
| **Design ref** | §2.2, lines 253-261 |

**Acceptance criteria:**
- [ ] Default `<Select />` has computed `font-size: 16px`
- [ ] `<Select size="sm" />` stays at `font-size: 14px`

### WU-2.3 — Textarea.tsx: change base class `text-sm` → `text-base`

| Field | Value |
|-------|-------|
| **File** | `src/components/ui/Textarea.tsx` |
| **Lines** | 27 |
| **Change** | `"rounded-[var(--radius-md)] px-4 py-3 text-sm"` → `"rounded-[var(--radius-md)] px-4 py-3 text-base"` |
| **Type** | style |
| **Design ref** | §2.2, lines 263-271 |

**Acceptance criteria:**
- [ ] Default `<Textarea />` has computed `font-size: 16px`
- [ ] Existing `py-3` padding accommodates the 2px font bump (no layout shift)

---

## Work Unit 3: Remove mandatory last4 field from cards (Issue 5)

**Files:** `src/db/schemas/card.ts`, `src/features/cards/CardForm.tsx`

**Commit message:** `fix(cards): remove mandatory "Últimos 4 dígitos" from card form`

### WU-3.1 — Update `CardSchema.last4` to accept empty string

| Field | Value |
|-------|-------|
| **File** | `src/db/schemas/card.ts` |
| **Lines** | 7 |
| **Change** | `last4: z.string().regex(/^\d{4}$/, { error: 'last4 must be exactly 4 digits' })` → `last4: z.string().regex(/^\d{4}$/).or(z.literal("")).default("")` |
| **Type** | schema |
| **Design ref** | §2.3, lines 292-314 |

**Why `.or(z.literal("")).default("")` over `.optional().default("")`:**
- `.optional().default("")` with regex rejects explicit `""` because the default applies after optional but regex still validates. The `.or(z.literal(""))` union accepts `""` explicitly while keeping the regex for non-empty values.

**Acceptance criteria:**
- [ ] `CardSchema.parse({ ... })` with `last4: ""` succeeds
- [ ] `CardSchema.parse({ ... })` with `last4: "1234"` succeeds
- [ ] `CardSchema.parse({ ... })` with `last4: "12"` fails
- [ ] `CardSchema.parse({ ... })` without `last4` defaults to `""`
- [ ] `Card.last4` type remains `string` (not `string | undefined`)
- [ ] `tsc --noEmit` passes with no type errors

### WU-3.2 — Remove last4 from `cardFormSchema`

| Field | Value |
|-------|-------|
| **File** | `src/features/cards/CardForm.tsx` |
| **Lines** | 33-35 |
| **Change** | Remove the `last4` field entry from the Zod form schema entirely |
| **Type** | form |

**Acceptance criteria:**
- [ ] `cardFormSchema` no longer has a `last4` field
- [ ] `CardFormValues` type no longer includes `last4`
- [ ] TypeScript compiles with no errors

### WU-3.3 — Remove last4 input field JSX block

| Field | Value |
|-------|-------|
| **File** | `src/features/cards/CardForm.tsx` |
| **Lines** | 173-194 |
| **Change** | Remove the `<div>` block containing `label`, `Input`, and error elements for "Últimos 4 dígitos" |
| **Type** | form |

**Acceptance criteria:**
- [ ] "Últimos 4 dígitos" label not rendered
- [ ] No `#card-last4` input element in DOM
- [ ] No `errors.last4` reference (field removed from schema)
- [ ] Layout adjusts naturally (removing 1 field row)

### WU-3.4 — Update `onSubmit` to pass `last4: ""`

| Field | Value |
|-------|-------|
| **File** | `src/features/cards/CardForm.tsx` |
| **Lines** | ~106 |
| **Change** | `last4: values.last4` → `last4: ""` (last4 no longer in form schema) |
| **Type** | form |

**Acceptance criteria:**
- [ ] `onSubmit` passes `last4: ""` for new cards
- [ ] Edit path preserves existing `last4` (cardsRepo.update does partial merge, patch doesn't include `last4`)

### WU-3.5 — Remove `last4` from `cardToFormValues`

| Field | Value |
|-------|-------|
| **File** | `src/features/cards/CardForm.tsx` |
| **Lines** | ~290 (new card defaults), ~299 (edit defaults) |
| **Change** | Remove `last4: ""` and `last4: card.last4` lines from both return objects |
| **Type** | form |

**Acceptance criteria:**
- [ ] `cardToFormValues` for new card omits `last4`
- [ ] `cardToFormValues` for existing card omits `last4`
- [ ] Edit path preserves `last4` via Dexie partial merge

---

## Verification Steps (Across All WUs)

### Build & Type Checks
- [ ] `npm run tsc --noEmit` — 0 errors
- [ ] `npm run build` — production build succeeds
- [ ] `npm run test` — all tests pass (unit + component)

### Manual Checks (R1 — CurrencyInput)

| # | Check | Method | Pass Criteria |
|---|-------|--------|-------------|
| 1.1 | No `.00` suffix while typing | Open New Transaction → type `"1234"` in amount | Display shows `"1234"` during edit |
| 1.2 | Format only on blur | Type `"1234"` → click outside | Display changes to `"1234.00"` |
| 1.3 | Cursor stays in place | Type `"12"`, cursor to middle, type `"XX"` | Cursor follows, no jump to end |
| 1.4 | No double-zero on backspace | Open Edit Transaction → backspace last digit | No `"00"` appears |
| 1.5 | Paste works | Paste `"9999"` into empty input | Shows `"9999"`, blur → `"99.99"` |
| 1.6 | No thousands separator | Type `"1234"` | No comma during edit |
| 1.7 | Zero displays empty | Focus then blur without typing | Display stays `""`, emits `0` |
| 1.8 | Comma decimal | Type `"12,50"` → blur | Shows `"12.50"`, emits `1250` |

### Manual Checks (R2 — Font-size)

| # | Check | Method | Pass Criteria |
|---|-------|--------|-------------|
| 2.1 | Default Input = 16px | Inspect `<Input />` | Computed `font-size: 16px` |
| 2.2 | Default Select = 16px | Inspect `<Select />` | Computed `font-size: 16px` |
| 2.3 | Default Textarea = 16px | Inspect `<Textarea />` | Computed `font-size: 16px` |
| 2.4 | Input with addon = 16px | Inspect `<Input leftAddon />` | All text >= 16px |
| 2.5 | sm variant = 14px | Inspect `<Input size="sm" />` | Computed `font-size: 14px` |
| 2.6 | iOS no zoom | iOS Safari Simulator | Tapping input doesn't zoom |

### Manual Checks (R3 — last4)

| # | Check | Method | Pass Criteria |
|---|-------|--------|-------------|
| 3.1 | No last4 field | Open Create Card drawer | "Últimos 4 dígitos" not visible |
| 3.2 | Create card without last4 | Fill form, skip last4 | Card created successfully |
| 3.3 | Create card with last4 | Fill form, provide last4 | Card created, last4 persisted |
| 3.4 | Edit preserves last4 | Edit existing card with last4 | last4 stays "1234" after save |
| 3.5 | Display unaffected | Dashboard, card list, transactions | Existing last4 shows correctly |
| 3.6 | No crash on empty last4 | Create card w/o last4 → browse all screens | No render errors |

---

## Review Workload Forecast

| Metric | Estimate |
|--------|----------|
| **Total changed lines** | ~150-200 |
| **400-line budget risk** | Low |
| **Chained PRs recommended** | No — single PR sufficient |
| **Decision needed before apply** | No |

## Dependencies

| WU | Depends On | Rationale |
|----|-----------|-----------|
| WU-1 | Nothing | Independent — CurrencyInput is self-contained |
| WU-2 | Nothing | Independent — pure style changes |
| WU-3 | Nothing | Independent — schema + form changes |
| PR | WU-1, WU-2, WU-3 | All must pass verification before PR merge |

## Risk Register

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Form reset while editing | Low | Display desync | `useEffect` resets on value change when blurred. Acceptable edge case. |
| `.or(z.literal(""))` pattern unfamiliar | Low | Wrong fix | Use exact pattern from design. Test parsing edge cases. |
| Textarea 2px font bump shifts layout | Low | Minor | Existing `py-3` accommodates. Verify in browser. |
| Backup import from new → old version | Very low | Validation fails | Acceptable — PWA auto-updates. |

## Commit Plan

```
WU-1  →  fix(currency-input): break circular feedback loop on typing
WU-2  →  fix(ui): bump input font-size to 16px for iOS auto-zoom prevention
WU-3  →  fix(cards): remove mandatory "Últimos 4 dígitos" from card form
```

Each work unit is an independent reviewable slice with its own tests. Order of application doesn't matter (no cross-WU dependencies).
