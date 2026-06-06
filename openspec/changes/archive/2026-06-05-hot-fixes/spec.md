# SDD Spec: hot-fixes

## Executive Summary

Five UX bugs in control-ingresos PWA that directly impact daily use. The core fix resolves a circular feedback loop in `CurrencyInput` that corrupts the editing experience. Secondary fixes address iOS auto-zoom on form controls and reduce UX friction by making the `last4` card field optional.

## 1. Requirements

### R1 — CurrencyInput must not auto-format while typing (Issues 1–3)

**Problem:** Current `CurrencyInput` emits parsed cents on every keystroke AND updates display from the `value` prop via a `useEffect` sync. This creates a circular loop: keystroke → setDisplay → emit → parent re-renders → useEffect fires → setDisplay(formatValueForInput) — which forces `.00` suffix and resets cursor. On backspace in Edit mode, the loop produces double-zero digits because the parent value lags behind the display.

**Functional requirements:**

1.1 CurrencyInput must track an **editing state** via `useRef`. While `isEditing` is true, the `useEffect` that syncs display from `value` prop MUST be skipped. This breaks the circular feedback loop.

1.2 On **focus**: set `isEditing.current = true`.

1.3 On **change**: update the internal display string with raw user input. Emit parsed cents to parent via `onChangeCents` for live form updates. The input element's `value` must show exactly what the user typed — no reformatting, no `.00` suffix, no thousands separator injection.

1.4 On **blur**: set `isEditing.current = false`. Parse the display string to cents, emit the final `onChangeCents`, and format the display to canonical form (`toFixed(2)` style, e.g. `"1234.50"`).

1.5 Replace `toLocaleString("es-MX")` with `toFixed(2)` in display formatting. The thousands separator from `toLocaleString` corrupts mid-edit parsing (e.g. `"1,234"` after backspace produces `"1,23"` which parses as `1.23` instead of `123`).

1.6 The cursor position must remain stable while typing. Since the input value does not change mid-edit (the `useEffect` is suppressed), cursor position is naturally preserved by the browser.

1.7 Programmatic value changes while editing (e.g. form reset) must reset `isEditing` to re-sync display. Add `onResetEditing` mechanism via external key dependency.

### R2 — All inputs must have `font-size >= 16px` (Issue 4)

**Problem:** iOS Safari auto-zooms into any `<input>`, `<select>`, or `<textarea>` with computed `font-size < 16px`. Three base components use `text-sm` (14px) as their default md variant.

**Functional requirements:**

2.1 `Input` component cva variant `size: "md"`: change `text-sm` → `text-base` in line 27.

2.2 `Input` component addon path (line 97): change `"text-sm"` → `"text-base"` for the md branch.

2.3 `Select` component `sizeClasses.md`: change `"text-sm"` → `"text-base"` in line 29.

2.4 `Textarea` component base class: change `"text-sm"` → `"text-base"` in line 27.

2.5 `sm` size variant stays at `text-sm` (14px) — it is explicitly opted into for compact layouts where the user accepts the tradeoff.

2.6 `lg` size variant already uses `text-base` (16px) — no change needed.

### R3 — `last4` field must be optional in card schema and form (Issue 5)

**Problem:** "Últimos 4 dígitos" is mandatory (regex `^\d{4}$`) but adds minimal value. Users who don't have the card number handy are blocked from creating a card.

**Functional requirements:**

3.1 `CardSchema.last4` in `src/db/schemas/card.ts`: change from `z.string().regex(...)` to `z.string().regex(...).optional()`. Validation still runs when a value is provided.

3.2 `CardForm` form schema (`cardFormSchema.last4`): change to `.optional()`. Remove the regex validation entirely from the form schema — the repo schema is the final guardrail.

3.3 `CardForm` JSX: remove the "Últimos 4 dígitos" `<label>` + `<Input>` + error block (lines 173–194).

3.4 `CardForm` `onSubmit`: when `last4` is undefined, pass empty string `""` to `CardInput.last4` so the Dexie store receives a valid string (the repo schema allows empty string when optional).

3.5 `CardForm` `cardToFormValues`: default `last4` to `""` when undefined from card.

3.6 All display components that reference `last4` remain unchanged. Existing cards still have `last4` data; new cards without it show `""`.

## 2. Scenarios

### R1 Scenarios — CurrencyInput edit mode

| Scenario | Input | Expected behavior |
|----------|-------|-------------------|
| **Normal flow (new transaction)** | Type `"1234"` | Display shows `"1234"` while typing. On blur, display shows `"1234.00"`. `onChangeCents` emits `123400` on blur. |
| **Normal flow (edit transaction)** | Existing value `150000`, place cursor at end, press `5` | Display shows `"150005"` while editing. On blur, display shows `"1500.05"` (150005 cents → `1500.05`). |
| **Decimal input** | Type `"12.50"` | Display shows `"12.50"` while typing. On blur, display shows `"12.50"`. Emits `1250`. |
| **Backspace** | Type `"1234"`, press backspace | Display shows `"123"` during edit. On blur, `"1.23"`. Emits `123`. No double-zero or duplicate digits. |
| **Empty value** | Clear all text via backspace | Display shows `""`. On blur, emits `0`. Display shows `""`. |
| **Zero value** | Focus, then blur without typing | Display remains `""`. Emits `0`. No `.00` injected on focus. |
| **Paste value** | Paste `"9999"` | Display shows `"9999"` immediately. On blur, `"99.99"`. Emits `9999`. |
| **Rapid typing** | `user.type("123456789")` | Each keystroke updates display without resets. Cursor stays at end. |
| **Form reset while editing** | User typing, programmatic form reset called | `isEditing` resets, display syncs to new value prop. |
| **Thousands separators removed** | Type `"1234"` | Display stays `"1234"` (no comma inserted mid-type). On blur, `"1234.00"`. |
| **Comma as decimal separator** | Type `"12,50"` | `parseCurrencyInput` normalizes comma to dot. Display shows `"12,50"` as typed. On blur, `"12.50"`. Emits `1250`. |

### R2 Scenarios — Font-size >= 16px

| Scenario | Component | Expected computed font-size |
|----------|-----------|---------------------------|
| **Default Input (md)** | `<Input />` | `16px` |
| **Small Input (sm)** | `<Input size="sm" />` | `14px` |
| **Large Input (lg)** | `<Input size="lg" />` | `16px` |
| **Input with addon (md)** | `<Input leftAddon={<span />} />` | `16px` |
| **Default Select (md)** | `<Select options={...} />` | `16px` |
| **Default Textarea** | `<Textarea />` | `16px` |
| **Input in form context** | `<Input />` inside any form | `16px` |
| **Select with sm** | `<Select size="sm" />` | `14px` |
| **Textarea in compact layout** | No sm variant exists | `16px` (no regressions) |

### R3 Scenarios — Optional last4

| Scenario | Form state | Expected behavior |
|----------|-----------|-------------------|
| **Create card without last4** | All fields filled except last4 | Form submits successfully. Card saved with `last4: ""`. |
| **Create card with last4** | last4 = "4321" | Form validates regex. Card saved with `last4: "4321"`. |
| **Edit existing card** | Existing last4 = "1234" | Field not shown. `onSubmit` passes `last4: "1234"` (preserved from card data). |
| **Edit card created without last4** | Existing last4 = "" | `cardToFormValues` returns `last4: ""`. Form submits fine. |
| **Invalid last4 typed** | last4 = "12" | Error message shown: "Debe ser exactamente 4 dígitos" (via repo schema). |
| **CardSelect display** | Card with `last4: ""` | Shows `"BBVA •••• "` (empty last4). Acceptable — no crash. |
| **SmartShopper display** | Card with `last4: ""` | Shows `"•••• "`. Acceptable — no crash. |
| **cycle.ts rationale** | Card with `last4: ""` | Shows `"Tu tarjeta BBVA () cortó hace poco"` (empty last4). Acceptable. |

## 3. Non-goals

- **Not rewriting CurrencyInput from scratch** — fix is additive (useRef + conditional useEffect). No architectural rewrite.
- **Not changing amount storage model** — amounts remain stored as integer cents per ADR-03.
- **Not removing `last4` from display components** — CardListItem, CardSelect, DeleteCardConfirm, SmartShopper, PaymentCalendar, TransactionsTable, cycle.ts remain unchanged.
- **Not removing `last4` from the database schema entirely** — `last4` column stays in Dexie schema. Only zod validation changes.
- **Not changing font-size of other components** — only Input, Select, Textarea base components. No changes to labels, badges, buttons, or other UI primitives.
- **Not changing other input components beyond font-size** — no style, spacing, or behavior changes outside the `text-sm → text-base` switch.
- **Not adding new features or display components** — purely a bug-fix release.
- **Not changing backend/API** — app is local-first (Dexie), no backend.

## 4. Verification criteria

### R1 Verification — CurrencyInput edit mode

| # | Criterion | Method | Details |
|---|-----------|--------|---------|
| 1.1 | No `.00` suffix while typing | Manual test | Open New Transaction form. Type `"1234"` in amount field. Verify display shows `"1234"` during edit — not `"12.00"` or `"1,234.00"`. |
| 1.2 | Format only on blur | Manual test | After typing `"1234"`, click outside. Verify display changes to `"1234.00"`. |
| 1.3 | Cursor stays in place | Manual test | Type `"12"`, move cursor to middle, type `"XX"`, backspace. Cursor follows user actions without jumping to end. |
| 1.4 | No double-zero on backspace | Manual test (edit mode) | Open Edit Transaction. Backspace last digit. Verify no `"00"` appears. Verify resulting value is correct. |
| 1.5 | Paste works naturally | Manual test | Paste `"9999"` into empty CurrencyInput. Verify `"9999"` shows immediately. Blur shows `"99.99"`. |
| 1.6 | Thousands separator removed from display | Manual test | Type `"1234"`. Verify no comma appears during edit. Blur shows `"1234.00"`. |
| 1.7 | Emits correct cents on change | Automated test | Render CurrencyInput with `onChangeCents` mock. `await user.type(input, "1234.50")`. Verify last emission = `123450`. |
| 1.8 | Formats display on blur | Automated test | Render CurrencyInput. `await user.type(input, "999")`. `await user.tab()`. Verify `expect(input).toHaveValue("999.00")`. |
| 1.9 | Zero value displays empty | Automated test | Render with `value={0}`. Verify input displays `""`. |
| 1.10 | Large number handling | Manual test | Type `"9999999.99"`. Verify display shows value during edit. Blur formats correctly. No rounding errors. |

### R2 Verification — Font-size >= 16px

| # | Criterion | Method | Details |
|---|-----------|--------|---------|
| 2.1 | Default Input md = 16px | Style inspection | Inspect `<Input />` in browser. Verify computed `font-size: 16px`. |
| 2.2 | Default Select md = 16px | Style inspection | Inspect `<Select />`. Verify computed `font-size: 16px`. |
| 2.3 | Default Textarea = 16px | Style inspection | Inspect `<Textarea />`. Verify computed `font-size: 16px`. |
| 2.4 | Input with addon md = 16px | Style inspection | Inspect `<Input leftAddon={...} />` md variant. Inner `<input>` has `font-size: 16px`. |
| 2.5 | sm variant stays 14px | Style inspection | Inspect `<Input size="sm" />`. Verify computed `font-size: 14px`. |
| 2.6 | lg variant stays 16px | Style inspection | Inspect `<Input size="lg" />`. Verify computed `font-size: 16px`. |
| 2.7 | No iOS auto-zoom on tap | Device test | Open form on iOS Safari / Simulator. Tap any input. Verify viewport does NOT zoom in. |

### R3 Verification — Optional last4

| # | Criterion | Method | Details |
|---|-----------|--------|---------|
| 3.1 | Card Form has no "Últimos 4 dígitos" | Visual inspection | Open Create Card drawer. Verify no `last4` input field visible. |
| 3.2 | Create card without last4 succeeds | Functional test | Fill bank, holderName, cutDay, paymentDueDay. Submit. Verify card created without error. |
| 3.3 | Create card with last4 still works | Functional test | Same as 3.2 but also provide last4. Verify card created with `last4` value persisted. |
| 3.4 | Edit existing card preserves last4 | Functional test | Edit card that has `last4: "1234"`. Verify no last4 field. Save. Verify `last4` still `"1234"`. |
| 3.5 | Existing last4 display unaffected | Visual inspection | Card list, CardSelect, SmartShopper, TransactionsTable still show last4 for existing cards. |
| 3.6 | No crash on empty last4 display | Functional test | Create card without last4. Navigate to dashboard (SmartShopper), transactions, card list. Verify no render errors. |

## 5. Files affected

| File | Issue | Change |
|------|-------|--------|
| `src/components/form/CurrencyInput.tsx` | 1–3 | Add `useRef isEditing`; track focus/blur; conditional `useEffect` sync; replace `toLocaleString` with `toFixed(2)` |
| `src/components/form/CurrencyInput.test.tsx` | 1–3 | Update test assertions for new edit-mode behavior |
| `src/components/ui/Input.tsx` | 4 | md cva: `text-sm` → `text-base` (line 27); addon path: `text-sm` → `text-base` (line 97) |
| `src/components/ui/Select.tsx` | 4 | `sizeClasses.md`: `text-sm` → `text-base` (line 29) |
| `src/components/ui/Textarea.tsx` | 4 | base class: `text-sm` → `text-base` (line 27) |
| `src/db/schemas/card.ts` | 5 | `last4`: add `.optional()` to Zod schema |
| `src/features/cards/CardForm.tsx` | 5 | Remove last4 field from form schema + JSX; pass `""` when undefined in onSubmit |

### Unchanged (display-only last4 references):
- `src/features/cards/CardListItem.tsx`
- `src/features/cards/DeleteCardConfirm.tsx`
- `src/features/cards/CardSelect.tsx`
- `src/features/widgets/PaymentCalendar.tsx`
- `src/features/widgets/SmartShopper.tsx`
- `src/features/transactions/TransactionsTable.tsx`
- `src/engine/cycle.ts`

### Test files requiring type updates only:
- `src/lib/backup/__tests__/export.test.ts`
- `src/lib/backup/__tests__/import.test.ts`
- `src/engine/__tests__/cycle.test.ts` (makeCard function — type already compatible; no change needed if optional)
