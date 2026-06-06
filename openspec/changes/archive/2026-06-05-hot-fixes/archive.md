# SDD Archive Report: hot-fixes

## Status

**ARCHIVED** — 2026-06-05

## Resumen Ejecutivo

Five UX bugs were fixed across 3 work units in control-ingresos PWA:

- **WU-1 (Issues 1-3)**: CurrencyInput circular feedback loop — keystroke → emit → parent re-render → useEffect reformat → display jump. Fixed with `useRef(isEditing)` guard suppressing `useEffect` sync while typing. Replaced `toLocaleString("es-MX")` with `toFixed(2)` to eliminate thousands separator corruption. Added 3 new tests for edit-mode behavior.
- **WU-2 (Issue 4)**: iOS Safari auto-zoom prevention — bumped `text-sm` (14px) → `text-base` (16px) in 3 UI components (Input, Select, Textarea). iOS zooms any input < 16px.
- **WU-3 (Issue 5)**: Removed mandatory "Últimos 4 dígitos" field from card form. Schema accepts empty string via `.or(z.literal("")).default("")`. Field removed from form schema, JSX, and `cardToFormValues`.

## Issues Resueltos

| # | Issue | Root Cause | Fix |
|---|-------|-----------|-----|
| 1 | CurrencyInput shows `.00` while typing | `useEffect` syncs display from value prop on every keystroke | `useRef(isEditing)` guards useEffect; suppressed while `isEditing=true` |
| 2 | Backspace produces double-zero digits | `toLocaleString("es-MX")` injects commas; mid-edit backspace on `"1,234.00"` → `"1,23"` → misparse | Replaced with `toFixed(2)` — no thousands separator, backspace works naturally |
| 3 | Cursor jumps to end on every keystroke | `setDisplay` from useEffect resets input value → cursor moves to end | useEffect suppressed during edit → cursor naturally preserved by browser |
| 4 | iOS Safari auto-zooms into inputs | Three UI components default to `text-sm` (14px); iOS zooms any input < 16px | Changed to `text-base` (16px) in Input (`cva` + addon path), Select (`sizeClasses`), Textarea (base class) |
| 5 | "Últimos 4 dígitos" blocks card creation | `last4` field mandatory via regex `/^\d{4}$/` validation; users don't always have card number | Schema accepts `""` via `.or(z.literal("")).default("")`; field removed from form |

## Commits

All by Bryan Núñez (`b.nunez@hotmail.es`), 2026-06-05:

| Commit | Message | Work Unit | Files Touched |
|--------|---------|-----------|---------------|
| `297dcd6` | `fix(currency-input): break circular feedback loop on typing` | WU-1 | `CurrencyInput.tsx`, `CurrencyInput.test.tsx` |
| `e9d00fc` | `fix(ui): bump input font-size to 16px for iOS auto-zoom prevention` | WU-2 | `Input.tsx`, `Select.tsx`, `Textarea.tsx` |
| `0676d50` | `fix(cards): remove mandatory "Últimos 4 dígitos" from card form` | WU-3 | `card.ts`, `CardForm.tsx` |

## Files Changed

| File | Change | +/- |
|------|--------|-----|
| `src/components/form/CurrencyInput.tsx` | useRef isEditing guard, toFixed(2), onFocus/onBlur handlers | +22 / -14 |
| `src/components/form/CurrencyInput.test.tsx` | 3 new tests for edit-mode behavior | +32 / -0 |
| `src/components/ui/Input.tsx` | md variant text-sm→text-base (cva + addon path) | +2 / -2 |
| `src/components/ui/Select.tsx` | md sizeClasses text-sm→text-base | +1 / -1 |
| `src/components/ui/Textarea.tsx` | base class text-sm→text-base | +1 / -1 |
| `src/db/schemas/card.ts` | last4 `.or(z.literal("")).default("")` | +1 / -1 |
| `src/features/cards/CardForm.tsx` | Remove last4 from form schema, JSX, onSubmit, cardToFormValues | +1 / -33 |

**Total: 7 files changed, 52 insertions, 46 deletions** (~98 net lines)

### 7 display components UNCHANGED (card.last4 type remains `string`):
- `CardListItem.tsx`, `CardSelect.tsx`, `DeleteCardConfirm.tsx`
- `SmartShopper.tsx`, `PaymentCalendar.tsx`
- `TransactionsTable.tsx`, `engine/cycle.ts`

### 3 test files UNCHANGED (test data with `last4` still validates):
- `backup/__tests__/export.test.ts`, `backup/__tests__/import.test.ts`
- `engine/__tests__/cycle.test.ts`

## Verification

### Mechanical Checks
| Check | Result |
|-------|--------|
| `tsc --noEmit` | 0 errors |
| `npm run lint` | 0 warnings |
| `npm test` | 31 files, 216 tests, all passing |
| `npm run build` | Production build succeeds |

### WU-1 (CurrencyInput) — PASS ✅
- ✅ `useRef isEditing` guards `useEffect` sync while typing (line 53)
- ✅ `onFocus` sets `isEditing=true`; `onBlur` sets `isEditing=false`, parses, emits, formats
- ✅ `formatValueForInput` uses `toFixed(2)` — no thousands separators
- ✅ `centsToDisplayString(0)` returns `""`
- ✅ 3 new tests: no reformat while typing, format on blur, backspace preservation
- ✅ Circular feedback loop broken — no remaining path
- ✅ `onChange` still emits live cents for reactive form updates

### WU-2 (Font-size) — PASS ✅
- ✅ Input.tsx: md cva + addon path both `text-base` (16px)
- ✅ Select.tsx: `sizeClasses.md` → `text-base`
- ✅ Textarea.tsx: base class → `text-base`
- ✅ sm variants stay `text-sm` (14px) — accepted per spec
- ✅ lg variants stay `text-base` (16px) — no regression

### WU-3 (last4) — PASS ✅
- ✅ CardSchema: `.or(z.literal("")).default("")` — accepts `""`, `"1234"`, rejects `"12"`
- ✅ CardForm: no `last4` in form schema, no JSX, no `cardToFormValues`
- ✅ onSubmit: `last4: card?.last4 ?? ""` (preserves edit, defaults to `""` for new)
- ✅ Backup schema inherits CardSchema — compatible
- ✅ All 7 display components unchanged — `card.last4` remains `string`
- ✅ No Dexie migration needed — IndexedDB accepts any string

## Artifact Traceability (Engram Observation IDs)

| Artifact | Topic Key | Observation ID |
|----------|-----------|----------------|
| Spec | `sdd/hot-fixes/spec` | #847 |
| Design | `sdd/hot-fixes/design` | #848 |
| Tasks | `sdd/hot-fixes/tasks` | #849 |
| Apply Progress | `sdd/hot-fixes/apply-progress` | #850 |
| Verify Report | `sdd/hot-fixes/verify-report` | #851 |
| Archive Report | `sdd/hot-fixes/archive-report` | (current) |

## Deuda Documentada (Accepted WARNINGS)

| # | Warning | Likelihood | Impact | Mitigation | Accepted? |
|---|---------|-----------|--------|------------|-----------|
| 1 | Form reset while user is editing → brief display desync | Low | Low — display briefly out of sync until blur/reset | useEffect resets display on value change when not editing. Acceptable. | ✅ |
| 2 | Backup new→old compatibility fails for `last4:""` | Very low | Medium — card without last4 won't validate on old version | PWA auto-updates; backup is local-only restore. Acceptable. | ✅ |
| 3 | iOS zoom on `sm` variant (14px) — not changed | Low | Low — sm is opt-in for compact layouts | User accepts tradeoff per design spec. | ✅ |

## Spec Sync

No main spec structure exists at `openspec/specs/`. The delta spec (`spec.md`) is self-contained and covers all 3 requirements (R1 CurrencyInput, R2 font-size, R3 last4). All requirements are now reflected in the implementation.

## Conclusion

| Metric | Value |
|--------|-------|
| Issues resolved | 5/5 |
| Work units completed | 3/3 |
| Tasks completed | 17/17 |
| Files changed | 7 |
| Tests passing | 216/216 (31 files) |
| Type errors | 0 |
| Lint warnings | 0 |
| CRITICAL items | 0 |
| WARNING items (accepted) | 3 |

**SDD cycle complete. Change archived 2026-06-05.**
