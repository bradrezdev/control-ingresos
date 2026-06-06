# Tasks — hot-fixes-batch-2

> **RED Jazmin:** Task breakdown for 7 bugs across 4 chained PRs. All work
> units are stacked-to-main off `main`, in order A → B → C → D. Strict TDD
> (RED test first, watch fail, minimal code, watch pass, refactor).

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines (total) | ~925 |
| 400-line budget risk | Medium |
| Chained PRs recommended | Yes |
| Suggested split | 4 stacked PRs (A → B → C → D off main) |
| Delivery strategy | ask-on-risk |
| Chain strategy | stacked-to-main |
| Per-WU line budget | A=~125, B=~380, C=~240, D=~180 |
| WU-B reaches budget ceiling | Yes (within 5% of 400) |

Decision needed before apply: No
Chained PRs recommended: Yes
Chain strategy: stacked-to-main
400-line budget risk: Medium

### Suggested Work Units

| Unit | Goal | Likely PR | Base branch | Notes |
|------|------|-----------|-------------|-------|
| A | Money ×100 (bugs 1, 6) | PR 1 | `fix/money-cents-conversion` off main | Single-line core fix, no migration |
| B | Cycle schema v1→v2 + last4 (bugs 2, 3) | PR 2 | `feat/card-cycle-migration-v2` off main | Destructive Dexie upgrade, rollback plan required |
| C | Timezone-safe dates (bug 4) | PR 3 | `fix/date-timezone-safe` off main | Read-through normalizer, idempotent |
| D | MSI plazo 1m + budget gate (bugs 5, 7) | PR 4 | `feat/msi-1m-budget-gate` off main | Includes manual bug 7-B verification |

## Phase 1: WU-A — Money fix (bugs 1, 6)

### Pre-flight
- [ ] 1.0.1 Confirm 216 baseline tests pass before starting
- [ ] 1.0.2 Re-read `src/features/transactions/TransactionForm.tsx:213` and `src/components/form/MsiSelector.tsx:84` to confirm line numbers

### TDD tasks (RED first)
- [ ] 1.1 RED — `src/features/transactions/__tests__/TransactionForm.money.test.tsx`: type "1000.00" → assert form state `amount === 100000` (display→cents), submitted payload `amount === 100000` cents (no double-multiply)
- [ ] 1.2 RED — `src/components/form/__tests__/MsiSelector.cents.test.tsx`: `totalCents=100` (=$1.00), term=3 → assert displayed cuota is "$0.33" (not "$33.33")
- [ ] 1.3 GREEN — `src/features/transactions/TransactionForm.tsx:213` replace `displayToCents(cents) / 100` with `cents` directly in `onChangeCents`. Re-run 1.1 → GREEN
- [ ] 1.4 GREEN — `src/components/form/MsiSelector.tsx:84` remove spurious `* 100` in `formatCurrency(monthly * 100, ...)` → pass `monthlyCents` directly. Re-run 1.2 → GREEN
- [ ] 1.5 GREEN — `src/features/transactions/TransactionForm.tsx:338` same `* 100` removal in `monthlyPreview` render
- [ ] 1.6 GREEN — `src/engine/msi.ts`: change `getMsiMonthlyAmount` and `getMsiInstallmentAmount` signatures to take/return cents (per AD-1)
- [ ] 1.7 GREEN — `src/pages/Transactions.tsx:81` change `amount: centsToDisplay(values.amount)` → `amount: values.amount` (already cents)
- [ ] 1.8 GREEN — `src/features/widgets/MsiSummary.tsx:107` remove `Math.round(value * 100)` in tooltip `formatCurrency` (value now cents)
- [ ] 1.9 REFACTOR — audit `src/features/transactions/TransactionForm.tsx:143-148` `amountCents` memo; add inline comment documenting the cents contract
- [ ] 1.10 RED→GREEN — update `src/engine/__tests__/msi.test.ts` to cents-based expectations (e.g., `getMsiMonthlyAmount(100000, 3) === 33333`)
- [ ] 1.11 Run: `npm run typecheck && npm run lint && npm run test`. All must pass
- [ ] 1.12 Commit (conventional): `fix(money): correct cents/display conversion in TransactionForm and MsiSelector`
- [ ] 1.13 Push branch `fix/money-cents-conversion` + open PR; body lists bugs 1 + 6 with test diff

### Files (this WU)
- M `src/engine/msi.ts`
- M `src/features/transactions/TransactionForm.tsx` (~5 lines)
- M `src/components/form/MsiSelector.tsx` (~3 lines)
- M `src/pages/Transactions.tsx` (1 line)
- M `src/features/widgets/MsiSummary.tsx` (1 line)
- A `src/features/transactions/__tests__/TransactionForm.money.test.tsx` (~80 lines)
- A `src/components/form/__tests__/MsiSelector.cents.test.tsx` (~40 lines)
- M `src/engine/__tests__/msi.test.ts` (~10 lines updated)
Total: ~140 lines

## Phase 2: WU-B — Cycle schema migration + last4 cleanup (bugs 2, 3)

### Pre-flight
- [ ] 2.0.1 Verify WU-A merged to main
- [ ] 2.0.2 `git pull main` and create branch `feat/card-cycle-migration-v2`
- [ ] 2.0.3 Re-read `src/db/database.ts` to confirm current Dexie version (expected v1)

### TDD tasks (RED first)
- [ ] 2.1 RED — `src/db/__tests__/migration-v2.test.ts` (fake-indexeddb): seed v1 with S(cut=13,pay=3,last4="1234"), M(cut=27,pay=7,last4=""), P(cut=22,pay=22,last4="9999"). Open at v2; assert each `daysToPayAfterCut === {20, 10, 30}` and `last4` is gone
- [ ] 2.2 RED — `src/engine/__tests__/cycle.test.ts`: replace `paymentDueDay` fixtures with `daysToPayAfterCut`; add S→20, M→10, P→30 cases; today=2026-06-05 → best card is P (longest cycle), NOT S
- [ ] 2.3 RED — rationale string test: must NOT contain literal "cortó hace poco"; must include `daysSinceLastCut` and actual `paymentDate`
- [ ] 2.4 RED — `src/lib/backup/__tests__/schema.test.ts`: backup v2 rejects v1 dump with `paymentDueDay`+`last4` (or migrates on import)
- [ ] 2.5 GREEN — `src/db/schemas/card.ts`: remove `paymentDueDay` and `last4`; add `daysToPayAfterCut: z.number().int().min(1).max(62)`
- [ ] 2.6 GREEN — `src/db/database.ts`: add `this.version(2).stores(...).upgrade(...)` with backfill function (AD-2 code, 0→30 fallback for Tarjeta P)
- [ ] 2.7 GREEN — `src/engine/cycle.ts`: rewrite `computeCutCycle` (no addMonths for payment); `cycleLengthDays = daysToPayAfterCut`; rewrite `computeBestCardToUseToday` rationale per AD-6; add `previousCutDate` helper
- [ ] 2.8 GREEN — remove 10 `last4` render sites: `SmartShopper.tsx:101`, `PaymentCalendar.tsx:85`, `CardListItem.tsx:78`, `DeleteCardConfirm.tsx:46`, `TransactionsTable.tsx:201`, `CardSelect.tsx:35`, `cycle.ts` rationale, `CardForm.tsx:103` write-through, `backup/schema.ts:29`. Replace `•••• {last4}` with empty string or bank name alone
- [ ] 2.9 GREEN — `src/features/cards/CardForm.tsx`: replace "Día de pago" input with "Días después del corte para pagar" (number 1..62)
- [ ] 2.10 GREEN — `src/lib/backup/schema.ts`: bump `BACKUP_VERSION` to 2; add v1→v2 migrator on import (compute `daysToPayAfterCut` from v1 `paymentDueDay`+`cutDay`)
- [ ] 2.11 Run typecheck + lint + test. Iterate until all pass
- [ ] 2.12 Commit: `feat(cards): migrate cycle model to daysToPayAfterCut and remove last4 residue`
- [ ] 2.13 Push + PR; body must include Dexie v1→v2 migration note, Tarjeta P backfill caveat for user verification, BACKUP_VERSION bump

### Files (this WU)
- M `src/db/database.ts`
- M `src/db/schemas/card.ts`
- M `src/engine/cycle.ts`
- M `src/features/cards/CardForm.tsx`
- M `src/features/cards/CardListItem.tsx`
- M `src/features/cards/DeleteCardConfirm.tsx`
- M `src/features/transactions/TransactionsTable.tsx`
- M `src/components/form/CardSelect.tsx`
- M `src/features/widgets/SmartShopper.tsx`
- M `src/features/widgets/PaymentCalendar.tsx`
- M `src/lib/backup/schema.ts`
- M `src/lib/backup/import.ts` (v1→v2 migrator)
- M `src/engine/__tests__/cycle.test.ts`
- M `src/lib/backup/__tests__/schema.test.ts`
- A `src/db/__tests__/migration-v2.test.ts`
Total: ~380 lines (at budget ceiling)

## Phase 3: WU-C — Timezone-safe dates (bug 4)

### Pre-flight
- [ ] 3.0.1 Verify WU-B merged; `git pull main`
- [ ] 3.0.2 Create branch `fix/date-timezone-safe`

### TDD tasks (RED first)
- [ ] 3.1 RED — `src/lib/date/__tests__/local.test.ts`: `toLocalDateString(new Date(2026, 5, 22)) === "2026-06-22"`; `fromLocalDateString("2026-06-22")` returns Date whose `getDate() === 22` in local TZ; round-trip preserves day in any TZ
- [ ] 3.2 RED — `src/features/transactions/__tests__/TransactionForm.date-roundtrip.test.tsx`: create tx with date "2026-06-22", save, re-fetch, assert displayed date is "22 de junio de 2026" (NOT "21 de junio"). Simulate TZ override
- [ ] 3.3 GREEN — `src/lib/date/local.ts` (new): export `toLocalDateString`, `fromLocalDateString`, `todayLocalDateString`, `normalizeToDateString`. NO `new Date(YYYY-MM-DD)` anywhere
- [ ] 3.4 GREEN — `src/db/schemas/transaction.ts`: `z.iso.datetime()` → `z.iso.date()` for `date` and `msiStartDate`
- [ ] 3.5 GREEN — `src/db/schemas/debt.ts`: same for `startDate` and `endDate`
- [ ] 3.6 GREEN — `src/features/transactions/TransactionForm.tsx:167,174` remove `new Date(values.date).toISOString()`; pass `values.date` directly. On edit `:400,407` strip `T...` suffix if present (legacy compat)
- [ ] 3.7 GREEN — `src/features/debts/DebtForm.tsx:104,114,255,264,265` same pattern
- [ ] 3.8 GREEN — read-through normalizer in repo or Dexie hook: when reading transaction/debt, if date contains `T`, slice to first 10 chars. **Decision:** prefer Dexie v3 migration if version bump acceptable; else read-through. Document choice in PR
- [ ] 3.9 GREEN — `src/lib/backup/import.ts` apply `normalizeToDateString` before Zod parse (legacy datetime rows must import)
- [ ] 3.10 Run typecheck + lint + test. Iterate
- [ ] 3.11 Commit: `fix(date): store dates as date-only to avoid UTC offset shift`
- [ ] 3.12 Push + PR; body must note legacy datetime rows are normalized on read AND on import

### Files (this WU)
- A `src/lib/date/local.ts`
- A `src/lib/date/__tests__/local.test.ts`
- A `src/features/transactions/__tests__/TransactionForm.date-roundtrip.test.tsx`
- M `src/db/schemas/transaction.ts`
- M `src/db/schemas/debt.ts`
- M `src/db/database.ts` (only if Dexie v3 chosen; else N/A)
- M `src/features/transactions/TransactionForm.tsx`
- M `src/features/debts/DebtForm.tsx`
- M `src/lib/date/format.ts` (slice `T` if needed)
- M `src/lib/backup/import.ts` (normalize pre-parse)
Total: ~240 lines

## Phase 4: WU-D — MSI plazo 1m + budget gate (bugs 5, 7)

### Pre-flight
- [ ] 4.0.1 Verify WU-C merged; `git pull main`
- [ ] 4.0.2 Create branch `feat/msi-1m-budget-gate`

### TDD tasks (RED first)
- [ ] 4.1 RED — `src/components/form/__tests__/MsiSelector.test.tsx`: assert 7 buttons including "1m"; layout still uses grid (verify class)
- [ ] 4.2 RED — `src/engine/__tests__/msi.test.ts`: `getMsiMonthlyAmount(100, 1, 1) === 100` (full amount, no division)
- [ ] 4.3 RED — `src/engine/__tests__/budget.test.ts`: MSI tx with `msiStartDate=2026-06-15` contributes FIRST installment to June 2026 budget (currently fails: `monthsSinceStart<1` gate skips it)
- [ ] 4.4 RED — budget tests for every `paymentMethod` (cash, debit, credit, transfer): each gasto directo contributes to budget total
- [ ] 4.5 RED — budget regression: MSI installment from a tx created last month still contributes this month's installment
- [ ] 4.6 RED — budget regression: MSI fully paid (past term) contributes 0
- [ ] 4.7 RED — `src/lib/msi/__tests__/palette.test.ts` (new): `getColorForTerm(1)` returns a color; `getColorForTerm(99)` returns fallback
- [ ] 4.8 GREEN — `src/db/schemas/transaction.ts`: `MSI_TERM = [1, 3, 6, 9, 12, 18, 24] as const`; Zod union prepends `z.literal(1)`
- [ ] 4.9 GREEN — `src/features/transactions/TransactionForm.tsx:43-45` sync Zod union to include 1
- [ ] 4.10 GREEN — `src/lib/msi/palette.ts` (new): `getColorForTerm(term: MsiTenure): string` with 7 colors indexed by `MSI_TERM.indexOf`
- [ ] 4.11 GREEN — `src/features/widgets/MsiSummary.tsx`: use `getColorForTerm`; update grid for 7 bars
- [ ] 4.12 GREEN — `src/components/form/MsiSelector.tsx:50` `grid-cols-3 sm:grid-cols-7` (verify visual balance)
- [ ] 4.13 GREEN — `src/engine/budget.ts` (`computeMonthlySpending` lines 47-54 AND `computePaymentForCurrentMonth` lines 112-120): gate → `monthsSinceStart < 0 || monthsSinceStart >= tx.msiMonths`; pass `monthsSinceStart + 1` to `getMsiInstallmentAmount`
- [ ] 4.14 GREEN — `src/engine/debt.ts:37-39`: verify same off-by-one; if present, apply identical fix (same risk class, safe in this WU)
- [ ] 4.15 Manual verify bug 7-B post WU-A: spin up dev server, create cash gasto directo, confirm budget widget moves. Document outcome in PR
- [ ] 4.16 Run typecheck + lint + test. Iterate
- [ ] 4.17 Commit: `feat(msi): add 1-month plazo and fix budget MSI first-month gate`
- [ ] 4.18 Push + PR with manual verification note for bug 7-B

### Files (this WU)
- M `src/db/schemas/transaction.ts`
- M `src/features/transactions/TransactionForm.tsx`
- M `src/components/form/MsiSelector.tsx`
- A `src/lib/msi/palette.ts`
- A `src/lib/msi/__tests__/palette.test.ts`
- M `src/features/widgets/MsiSummary.tsx`
- M `src/engine/budget.ts`
- M `src/engine/debt.ts` (only if same off-by-one confirmed)
- M `src/components/form/__tests__/MsiSelector.test.tsx`
- M `src/engine/__tests__/msi.test.ts`
- M `src/engine/__tests__/budget.test.ts`
Total: ~180 lines

## Total forecast
- WU-A: ~140
- WU-B: ~380 (at budget ceiling)
- WU-C: ~240
- WU-D: ~180
- Grand total: ~940 across 4 PRs
- All 4 PRs under 400-line budget

## Dependencies (chain order)

```
main
 └─ WU-A: fix/money-cents-conversion ── merged
     └─ WU-B: feat/card-cycle-migration-v2 ── merged
         └─ WU-C: fix/date-timezone-safe ── merged
             └─ WU-D: feat/msi-1m-budget-gate ── merged
```

Each WU rebases off fresh main after predecessor merges. No parallel
branches.

## Cross-WU verification

- WU-A enables reliable manual repro of bug 7-B in WU-D (cash widget
  movement was masked by R-1's 100× inflation).
- WU-B's destructive migration is tested with `fake-indexeddb` BEFORE
  merge (3 user-card cases are the safety net).
- WU-C's read-through normalizer must be idempotent so it composes safely
  with WU-B's migration (no order coupling).

## Definition of Done

- 7/7 bugs verified by test or manual repro
- All 4 PRs merged to main in order
- Vercel green
- Engram updated with `apply-progress` and `verify-report`
- Original bug list closed

## Out of scope (explicit)

- **Bug 7-B** if it reappears after WU-A fix → escalate to batch 3
- **Engine wide refactor** to Money type object
- **i18n** of rationale strings (stays in Spanish neutral)
- **`pages/Transactions.tsx:81` payment-method expansion** (transfer, debit)
  beyond the amount wiring fix

## skill_resolution

`paths-injected` — Orchestrator provided `task-planning`, `work-unit-commits`,
`test-driven-development`, `branch-pr` skills. Applied:
- task-planning: hierarchical phase numbering, dependency ordering
- work-unit-commits: 4 WUs, each one PR with own branch, conventional
  commit messages
- test-driven-development: RED test first in every WU, watch fail,
  minimal code, watch pass, refactor
- branch-pr: each WU has its own branch off main, rebases after predecessor
  merges

session: control-ingresos-postcompact-2026-06-05
project: control-ingresos
scope: project
topic: sdd/hot-fixes-batch-2/tasks
