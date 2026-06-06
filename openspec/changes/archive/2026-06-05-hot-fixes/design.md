# SDD Design: hot-fixes

## 1. Architecture Overview

### CurrencyInput Circular Feedback Loop (Issues 1-3)

The root cause of issues 1-3 is a **controlled-component feedback loop**:

```
User types "1"
  → onChange fires (CurrencyInput.tsx:55)
    → setDisplay("1")                            // local display update
    → onChangeCents(parseCurrencyInput("1"))     // emit 100 cents
      → parent TransactionForm setValue("amount", 1)
        → amountCents = 100 (computed from form value)
          → CurrencyInput receives value=100 (new prop)
            → useEffect syncs (line 51-53)
              → setDisplay(formatValueForInput(100))
                → formatValueForInput: (100/100).toLocaleString("es-MX", ...)
                  → display = "1.00" ✗ JUMP!
```

Each keystroke goes through this loop:
1. User types → `onChange` fires → emits parsed cents
2. Parent re-computes cents value → passes new `value` prop
3. `useEffect` fires → reformats display with `.toLocaleString("es-MX")`
4. Display jumps to formatted value with `.00` suffix

On **backspace** in Edit mode, the problem compounds because `toLocaleString` injects thousands separator commas. After backspace, `parseCurrencyInput` reads `"1,23"` (leftover comma + digits) instead of `"123"`, producing double-zero.

**Three components** and **four CurrencyInput usages** are affected:
- `TransactionForm.tsx` — amount (New + Edit)
- `CardForm.tsx` — creditLimit
- `Settings.tsx` — monthlyLimit
- `DebtForm.tsx` — originalAmount + fixedMonthlyPayment

### Scope of Impact

| Issue | Root Cause | Files Affected |
|-------|-----------|----------------|
| 1-3 | Circular useEffect loop + toLocaleString | CurrencyInput.tsx (+ all parents using it) |
| 4 | text-sm (14px) default on iOS triggers zoom | Input.tsx, Select.tsx, Textarea.tsx |
| 5 | last4 field mandatory, low-value friction | card.ts, CardForm.tsx |

---

## 2. Component Design

### 2.1 CurrencyInput Refactor (Issues 1-3)

**Strategy:** Break the circular loop with a `useRef`-based "edit mode" tracker that suppresses the `useEffect` sync while the user is actively typing.

#### New State Machine

```
[Init] ──→ isEditing=false, display=formatValueForInput(value)
              │
              │ onFocus()
              ▼
        ┌─ isEditing=true ──┐
        │    display: user   │  ← onChange: update display only, emit cents
        │    typed chars     │     useEffect skipped (isEditing=true)
        └────────────────────┘
              │
              │ onBlur()
              ▼
        parse display → emit onChangeCents
        → format canonical display
        → isEditing=false
              │
              ▼
        [Ready] ──→ useEffect syncs from value prop (isEditing=false)
```

#### Detailed Code Changes (`src/components/form/CurrencyInput.tsx`)

**Import change** (line 13):
```ts
// Before:
import { useState, useEffect, type ChangeEvent } from "react";
// After:
import { useState, useEffect, useRef, type ChangeEvent } from "react";
```

**New ref** (after line 48):
```ts
const [display, setDisplay] = useState<string>(formatValueForInput(value));
const isEditing = useRef(false);  // ← ADD
```

**Modified useEffect** (lines 50-53):
```ts
// Before:
useEffect(() => {
  setDisplay(formatValueForInput(value));
}, [value]);

// After:
useEffect(() => {
  if (!isEditing.current) {
    setDisplay(formatValueForInput(value));
  }
}, [value]);
```

**Modified onChange** (lines 55-60):
```ts
// Before:
function onChange(e: ChangeEvent<HTMLInputElement>): void {
  const next = e.target.value;
  setDisplay(next);
  onChangeCents(parseCurrencyInput(next));
}

// After:
function onChange(e: ChangeEvent<HTMLInputElement>): void {
  setDisplay(e.target.value);
  // Still emit live for reactive form updates.
  onChangeCents(parseCurrencyInput(e.target.value));
}
```

**Modified onBlur** (lines 62-67):
```ts
// Before:
function onBlur(): void {
  const cents = parseCurrencyInput(display);
  onChangeCents(cents);
  setDisplay(centsToDisplayString(cents));
}

// After:
function onBlur(): void {
  isEditing.current = false;
  const cents = parseCurrencyInput(display);
  onChangeCents(cents);
  setDisplay(centsToDisplayString(cents));
}
```

**New onFocus handler** (add after onBlur):
```ts
function onFocus(): void {
  isEditing.current = true;
}
```

**JSX binding** — add `onFocus` to the Input component:
```tsx
<Input
  type="text"
  inputMode="decimal"
  value={display}
  onChange={onChange}
  onBlur={onBlur}
  onFocus={onFocus}   // ← ADD
  ...
/>
```

**formatValueForInput** — replace `toLocaleString` with `toFixed(2)` (lines 92-101):
```ts
// Before:
function formatValueForInput(cents: number): string {
  if (!cents) return "";
  return (cents / 100).toLocaleString("es-MX", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

// After:
function formatValueForInput(cents: number): string {
  if (!cents) return "";
  return (cents / 100).toFixed(2);
}
```

**Rationale for `toFixed(2)` over `toLocaleString`:**
- `toLocaleString("es-MX")` produces thousands separators: `(123400/100) → "1,234.00"`
- Mid-edit backspace on `"1,234.00"` produces `"1,23"` → `parseCurrencyInput("1,23")` → `123` cents (wrong! should be `1234`)
- `toFixed(2)` produces `"1234.00"` — no comma, backspace works naturally
- Thousands separator is unnecessary inside an input field; users see raw numbers while typing

#### Test Updates (`src/components/form/CurrencyInput.test.tsx`)

**Edit "emits parsed cents on each keystroke" test:**
- Still valid but note: blur is the definitive emission, not intermediate keystrokes
- Update comment to reflect edit-mode behavior

**Add new test for typing flow:**
```ts
it("does not reformat display while typing", async () => {
  const onChangeCents = vi.fn();
  render(<CurrencyInput value={0} onChangeCents={onChangeCents} aria-label="amount" />);
  const user = userEvent.setup();
  const input = screen.getByLabelText("amount");
  await user.type(input, "1234");
  // Display shows raw typed chars, not formatted
  expect(input).toHaveValue("1234");
  // Each keystroke still emits live cents
  expect(onChangeCents).toHaveBeenLastCalledWith(123400);
});
```

**Add test for backspace preservation:**
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

#### Edge Cases

| Case | Behavior | Implementation |
|------|----------|---------------|
| **Form reset** | Programmatic value change should resync display | useEffect fires when `value` changes AND `isEditing` is false. If form resets while editing, parent passes new `value=0`. useEffect sees `isEditing.current=true`, skips sync. **Risk:** display desync from actual value. **Mitigation:** add `focusCapture` key or reset `isEditing` on form-level reset. |
| **Paste while editing** | Pasted text shows raw | `onChange` handler receives pasted value, sets display. No reformat until blur. Cursor stays at end of pasted text. |
| **Comma decimal (es-MX locale)** | `"12,50"` typed | Display shows `"12,50"` as-is. On blur, `centsToDisplayString` via `parseCurrencyInput` normalizes to 1250 cents. |
| **Rapid keystrokes** | No value prop race | All updates are local state (`setDisplay`). React batches rapid keystrokes. useEffect is suppressed. |

### 2.2 Input font-size fix (Issue 4)

**Problem:** iOS Safari auto-zooms into any form control with computed `font-size < 16px`. Three base UI components default to `text-sm` (14px).

#### Changes per component

##### `src/components/ui/Input.tsx`

**cva variant** (line 27):
```ts
// Before:
md: "h-11 px-4 text-sm rounded-[var(--radius-md)]",
// After:
md: "h-11 px-4 text-base rounded-[var(--radius-md)]",
```

**Addon path** (line 97):
```ts
// Before:
size === "sm" ? "text-sm" : size === "lg" ? "text-base" : "text-sm",
// After:
size === "sm" ? "text-sm" : size === "lg" ? "text-base" : "text-base",
```

##### `src/components/ui/Select.tsx`

**sizeClasses** (line 29):
```ts
// Before:
md: "h-11 text-sm",
// After:
md: "h-11 text-base",
```

##### `src/components/ui/Textarea.tsx`

**base class** (line 27):
```ts
// Before:
"rounded-[var(--radius-md)] px-4 py-3 text-sm",
// After:
"rounded-[var(--radius-md)] px-4 py-3 text-base",
```

#### Verified current defaults

| Component | File | Line | Current | Change to |
|-----------|------|------|---------|-----------|
| Input cva | Input.tsx | 27 | `text-sm` | `text-base` |
| Input addon (md) | Input.tsx | 97 | `"text-sm"` | `"text-base"` |
| Select sizeClasses | Select.tsx | 29 | `text-sm` | `text-base` |
| Textarea base | Textarea.tsx | 27 | `text-sm` | `text-base` |

**Unchanged:**
- `sm` variant → `text-sm` (14px) — opt-in for compact layouts
- `lg` variant → `text-base` (16px) — already correct

### 2.3 last4 field removal (Issue 5)

**Strategy:** Make `last4` optional in the Zod schema, remove the UI field, keep display components unchanged.

#### Schema change (`src/db/schemas/card.ts`)

**Line 7 — Before:**
```ts
last4: z.string().regex(/^\d{4}$/, { error: 'last4 must be exactly 4 digits' }),
```

**Line 7 — After:**
```ts
last4: z.string().regex(/^\d{4}$/).or(z.literal("")).default(""),
```

**Why `.or(z.literal("")).default("")` instead of `.optional().default("")`:**

The `.optional().default("")` pattern would reject explicit empty string `""` because the regex `/^\d{4}$/` validates the value after the default is applied. With `.or(z.literal(""))`:

| Input | Result | Why |
|-------|--------|-----|
| `"1234"` | ✓ passes regex | Valid 4 digits |
| `""` | ✓ accepted | Via `.or(z.literal(""))` |
| `undefined` | ✓ → defaults to `""` | Via `.default("")` |
| `"12"` | ✗ rejected | Fails regex, not in literal union |
| `"abc"` | ✗ rejected | Fails regex, not in literal union |

This preserves the validation contract for users who still type last4, while allowing new cards to be created without it.

**No changes to `CardInput` type needed** — `Card.last4` remains `string` due to `.default("")`.

#### Form change (`src/features/cards/CardForm.tsx`)

**1. Remove last4 from form schema** (lines 33-35):
```ts
// Before:
last4: z
  .string()
  .regex(/^\d{4}$/, "Debe ser exactamente 4 dígitos"),
// After:
// (remove entirely)
```

**2. Remove last4 input JSX** (lines 173-194):
```tsx
// Before:
<div className="flex flex-col gap-1.5">
  <label htmlFor="card-last4" className="...">Últimos 4 dígitos</label>
  <Input id="card-last4" inputMode="numeric" maxLength={4} ... />
  {errors.last4 ? <p role="alert" className="...">{errors.last4.message}</p> : null}
</div>
// After:
// (remove entire block)
```

**3. Update onSubmit to pass `""` for last4** (line 106):
```ts
// Before:
last4: values.last4,
// After:  (last4 no longer in form schema, pass empty string)
last4: "",
```

**4. Remove last4 from cardToFormValues** (lines 287-303):
```ts
// Before (new card defaults):
return {
  bank: "",
  holderName: "",
  last4: "",       // ← present
  cutDay: 1,
  ...
};

// After:
return {
  bank: "",
  holderName: "",
  cutDay: 1,
  ...
};
```

```ts
// Before (existing card):
return {
  bank: card.bank,
  holderName: card.holderName,
  last4: card.last4,    // ← present
  cutDay: card.cutDay,
  ...
};

// After:
return {
  bank: card.bank,
  holderName: card.holderName,
  cutDay: card.cutDay,
  ...
};
```

**Note:** `last4` is removed from `cardToFormValues` because it's no longer in `CardFormValues` type. The edit path preserves `last4` via the existing card data in the store — `cardsRepo.update` does a partial merge, not a full replace, so the existing `last4` value in Dexie is never touched.

#### Display components — NO changes needed

All display components access `card.last4` which is always `string` (either `"1234"` for existing cards or `""` for new cards). No `?? ""` guards needed.

| Component | Line | Current expression | Behavior with `last4: ""` |
|-----------|------|-------------------|---------------------------|
| CardListItem.tsx | 78 | `**** {card.last4}` | Renders `**** ` (empty suffix) |
| TransactionsTable.tsx | 201 | `{card.bank} •••• {card.last4}` | Renders `BBVA •••• ` (no crash) |
| cycle.ts | 133 | `({best.card.last4})` | Renders `()` (empty parens) |
| CardSelect.tsx | label | `${c.bank} •••• ${c.last4}` | Renders `BBVA •••• ` |
| SmartShopper.tsx | display | `•••• {card.last4}` | Renders `•••• ` |

All acceptable per spec — no crashes, no undefined errors.

---

## 3. Data Flow Diagrams

### Current CurrencyInput Flow (Broken)

```
┌──────────┐     ┌──────────────────┐     ┌─────────────────┐
│  User     │     │  CurrencyInput   │     │   Parent Form   │
│  types    │     │                  │     │                 │
│  "1"     │────▶│ onChange fires   │────▶│ setValue("amt") │
│          │     │ setDisplay("1")  │     │ amountCents=100 │
│          │     │ emit(100)        │     │                 │
│          │     │                  │◀────│ passes value=100│
│          │     │ useEffect fires  │     │                 │
│          │     │ setDisplay("1.00")│    │                 │
│          │     │    ✗ JUMP!       │     │                 │
└──────────┘     └──────────────────┘     └─────────────────┘
```

### New CurrencyInput Flow (Fixed)

```
┌──────────┐     ┌──────────────────┐     ┌─────────────────┐
│  User     │     │  CurrencyInput   │     │   Parent Form   │
│  types    │     │                  │     │                 │
│  "1"     │────▶│ onFocus:         │     │                 │
│          │     │ isEditing=true   │     │                 │
│          │     │ onChange:        │────▶│ onBlur emits    │
│  "2"     │────▶│ setDisplay("12") │     │ final 1200      │
│  "3"     │────▶│ setDisplay("123")│     │                 │
│  "4"     │────▶│ setDisplay("1234")│    │                 │
│          │     │ (no useEffect    │     │                 │
│          │     │  sync while      │     │                 │
│          │     │  isEditing=true) │     │                 │
│          │     │                  │     │                 │
│  blurs   │────▶│ onBlur:          │────▶│ onChangeCents   │
│          │     │ isEditing=false  │     │ (123400)        │
│          │     │ parse("1234")    │     │                 │
│          │     │ → 123400 cents   │     │                 │
│          │     │ display="1234.00"│     │                 │
└──────────┘     └──────────────────┘     └─────────────────┘
```

### Effect Suppression Detail

```
time →   focus      type "1"    type "2"    type "3"    blur
         │          │           │           │           │
isEditing:false──true─────────────────────────────false─▶
                    │           │           │           │
useEffect:          skipped    skipped    skipped    runs
(value prop        (editing)  (editing)  (editing)  (sync)
 changes)
```

---

## 4. Affected Files and Changes

| # | File | Line(s) | Change | Type |
|---|------|---------|--------|------|
| 1 | `src/components/form/CurrencyInput.tsx` | 13 | Add `useRef` to import | import |
| 2 | `src/components/form/CurrencyInput.tsx` | 49 (after) | Add `const isEditing = useRef(false)` | refactor |
| 3 | `src/components/form/CurrencyInput.tsx` | 51-53 | Wrap useEffect in `if (!isEditing.current)` guard | refactor |
| 4 | `src/components/form/CurrencyInput.tsx` | 55-60 | Keep onChange, remove setDisplay from effect-only logic | refactor |
| 5 | `src/components/form/CurrencyInput.tsx` | 62-67 | Add `isEditing.current = false` to onBlur | refactor |
| 6 | `src/components/form/CurrencyInput.tsx` | new | Add `onFocus` handler setting `isEditing.current = true` | refactor |
| 7 | `src/components/form/CurrencyInput.tsx` | ~70-88 | Bind `onFocus={onFocus}` to Input component | refactor |
| 8 | `src/components/form/CurrencyInput.tsx` | 92-101 | Replace `toLocaleString("es-MX")` with `toFixed(2)` | refactor |
| 9 | `src/components/form/CurrencyInput.test.tsx` | 12-22 | Update test comment; add typing flow test | test |
| 10 | `src/components/form/CurrencyInput.test.tsx` | new | Add "does not reformat while typing" test | test |
| 11 | `src/components/form/CurrencyInput.test.tsx` | new | Add "preserves cursor on backspace" test | test |
| 12 | `src/components/ui/Input.tsx` | 27 | `md:` variant: `text-sm` → `text-base` | style |
| 13 | `src/components/ui/Input.tsx` | 97 | md addon branch: `"text-sm"` → `"text-base"` | style |
| 14 | `src/components/ui/Select.tsx` | 29 | `sizeClasses.md`: `text-sm` → `text-base` | style |
| 15 | `src/components/ui/Textarea.tsx` | 27 | base class: `text-sm` → `text-base` | style |
| 16 | `src/db/schemas/card.ts` | 7 | `last4`: add `.or(z.literal("")).default("")` | schema |
| 17 | `src/features/cards/CardForm.tsx` | 33-35 | Remove last4 from `cardFormSchema` | form |
| 18 | `src/features/cards/CardForm.tsx` | 173-194 | Remove last4 input field + error block | form |
| 19 | `src/features/cards/CardForm.tsx` | 106 | Change `last4: values.last4` → `last4: ""` | form |
| 20 | `src/features/cards/CardForm.tsx` | 290 | Remove `last4: ""` from new-card defaults | form |
| 21 | `src/features/cards/CardForm.tsx` | 299 | Remove `last4: card.last4` from edit defaults | form |

### Unchanged files (verified):

| File | Why unchanged |
|------|--------------|
| `src/lib/backup/schema.ts` | Uses `CardSchema` directly — inherits the new optional behavior |
| `src/lib/backup/__tests__/export.test.ts` | Test data provides `last4` — still passes validation |
| `src/lib/backup/__tests__/import.test.ts` | Test data provides `last4` — still passes validation |
| `src/engine/__tests__/cycle.test.ts` | `makeCard()` provides `last4` — type is still `string` |
| All display components (7 files) | `card.last4` is always `string` — no type change |

---

## 5. Migration Strategy

**No database migration required.** Dexie (IndexedDB) stores whatever string you put in the `last4` field. Existing cards already have `last4: "1234"` stored. New cards with `last4: ""` are stored with empty string. No schema migration, no Dexie version bump.

**Backward compatibility:**
- Old backups with `last4: "1234"` still import fine (regex accepts 4 digits)
- New backups with `last4: ""` will work when restored on older versions... but `CardSchema` in the old version requires `/^\d{4}$/` which rejects `""`. **This is an acceptable risk** — the app is local-first with no syncing. If a user exports a backup and restores it on an older version, cards without last4 would fail validation. In practice, all users auto-update (PWA), and the backup feature is for local restore only.
- Editing an existing card preserves its `last4` — the form no longer submits `last4` (removed from form schema), but `cardsRepo.update` does `{ ...existing, ...patch }` and the patch doesn't include `last4`, so it stays untouched.

---

## 6. Verification Strategy

### Automated Checks

```
tsc --noEmit          # Must pass (type changes are type-safe)
npm run test          # All tests pass, including updated CurrencyInput tests
npm run build         # Production build succeeds
```

### Manual Checks

| Check | Method | Criteria |
|-------|--------|----------|
| CurrencyInput typing | Open New Transaction → type "1234" in amount | Display shows "1234" while typing, no "00" suffix |
| CurrencyInput blur | Type "1234" → tab to next field | Blur changes display to "1234.00" |
| CurrencyInput backspace (edit) | Open Edit Transaction → backspace last digit | No "00" appears, cursor stays in place |
| CurrencyInput comma | Type "12,50" → blur | Display shows "12.50", correct cents emitted |
| CurrencyInput paste | Paste "9999" into empty input | Display shows "9999" immediately, blur → "99.99" |
| Font-size (Input) | Inspect `<Input />` in devtools | Computed `font-size: 16px` |
| Font-size (Select) | Inspect `<Select />` | Computed `font-size: 16px` |
| Font-size (Textarea) | Inspect `<Textarea />` | Computed `font-size: 16px` |
| Font-size (Input with addon) | Inspect `<Input leftAddon />` | All text elements >= 16px |
| iOS zoom | Open on iOS Safari Simulator | Tap any input — viewport does NOT zoom |
| Card form | Open Create Card drawer | "Últimos 4 dígitos" field not present |
| Create card w/o last4 | Fill bank, holderName, dates → submit | Card created successfully |
| Create card w/ last4 | Same but add last4 manually to test | Passes regex validation |
| Edit existing card | Edit card with last4 data → save | last4 preserved in DB |
| Display components | Navigate dashboard, cards, transactions | No render errors, existing last4 shown |
| Empty last4 display | Create card w/o last4 → view all screens | No crashes, uses empty string gracefully |

### Risk Register

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Form reset while user is editing | Low | Display desync | useEffect resets display on value change when refocused/blurred. Acceptable edge case. |
| Backup import from new version to old | Very low | Card validation fails | Acceptable — PWA auto-updates, backup is local |
| Textarea height increase with text-base | Low | Minor layout shift | Existing `py-3` padding accommodates 2px font bump |
| User expects last4 field after update | Low | Confusion | Minor — users adapt quickly to simplified form |
