# Apply Progress — msi-badge-cuota-next-month-budget

> **PURPLE Adrian + CYAN Bryan:** Full-stack refactor + UI column + new
> widget. 4 WUs implemented in working tree, TDD discipline enforced.

## Status

[x] DONE — 4/4 WUs implemented. Code in working tree, not yet committed.

## WU-A — Engine helper extraction

- Files: `src/engine/msi.ts`, `src/engine/__tests__/msi.test.ts`
- TDD: 8 RED tests for `getCurrentMsiInstallment` (non-MSI → null, same-month → 1, prior-month → 2, finished → null, not-started → null, year crossing, `today` honored, UTC clamping).
- Header doc block documents both MSI conventions (counting vs schedule).
- Export added to `msi.ts`. No other production code touched.

## WU-B — Replace 3 inline duplications

- Files: `src/engine/budget.ts`, `src/engine/msiSummary.ts`
- Replaced inline `monthsSinceStart` math in 3 sites:
  - `budget.ts` line 47 (`computeMonthlySpending` MSI branch)
  - `budget.ts` line 119 (`computePaymentForCurrentMonth` MSI branch)
  - `msiSummary.ts` line 47 (`summarizeMsiByTenure` MSI loop)
- Behavior-preserving: 25 budget tests + 8 msiSummary tests + 36 msi tests pass unmodified.

## WU-C — TransactionsTable UI

- Files: `src/features/transactions/TransactionsTable.tsx`, `src/features/transactions/__tests__/TransactionsTable.msi.test.tsx` (NEW)
- Badge conditional rewrites per MSI row, hides for inactive MSI (`currentInstallment === null`).
- New `Cuota` column between `Monto` and `Método`: em-dash for income, full amount for one-off, installment amount for active MSI, em-dash for inactive MSI.
- `today` memoized via `useMemo(() => new Date(), [])` and added to columns memo deps.
- 8 RED tests covering badge text, Cuota cell per row type, column order.
- Post-apply fix: test fixture `makeCard()` migrated from pre-v3 schema (`last4`, `color`) to v3 schema (`holderName`, `cardType`, `cutDay`, `daysToPayAfterCut`, `priority`).

## WU-D — NextMonthBudgetControl widget

- Files: `src/features/widgets/NextMonthBudgetControl.tsx` (NEW), `src/features/widgets/index.ts`, `src/pages/Dashboard.tsx`, `src/features/widgets/__tests__/widgets.smoke.test.tsx`
- Clones `BudgetControl` with `today = addMonths(new Date(), 1)`.
- Mandatory header comment disambiguates `@/lib/date/cycle` `addMonths` from `date-fns/addMonths`.
- Title `"Presupuesto del siguiente mes"` + "Próximo" chip + `CalendarClock` icon + info-accent border.
- Barrel re-exports `FixedPaymentsWidget` (orphan fix) + `NextMonthBudgetControl`.
- Dashboard mounts via `lazy()` + `Suspense`, inserted after `BudgetControl`.
- Smoke test added: mount + title assertion + re-mount cycle inclusion.

## Test counts

| Stage | Tests |
|---|---|
| Baseline (post hot-fixes-batch-2) | 298 |
| WU-A added (msi.test.ts) | 8 |
| WU-C added (TransactionsTable.msi.test.tsx) | 8 |
| WU-D added (widgets.smoke.test.tsx) | 2 |
| **Final** | **318** |

All 318 tests pass. typecheck + lint clean.

## Post-apply fixes (not in tasks.md)

- **Test fixture migration** — `makeCard()` in `TransactionsTable.msi.test.tsx` used pre-v3 Card shape (`last4`, `color`). Dexie v3 migration (from `hot-fixes-batch-2` WU-B) changed the schema to require `holderName`, `cardType`, `priority`. Fixture updated to match.
- **Smoke test coverage** — `NextMonthBudgetControl` was imported but unused (lint error). Added 2 tests (mount + title assertion) per design §11.1.

## Risks / deviations

- **msi.test.ts baseline drift** — design said "8 new test cases pass". Actual file went from 28 → 36 tests. The +8 matches the design; the rest are pre-existing.
- **Stub-grade refactor on `summarizeMsiByTenure`** — replaced inline math with helper call; same return shape. Verified by 8 existing msiSummary tests staying green.
- **`today` memo deps** — added `today` to columns memo deps (per tasks.md 3.5). Behavior preserved: memo still computes once per mount.

## skill_resolution

`paths-injected` — orchestrator provided paths for typescript, zod-4, react-19, test-driven-development, work-unit-commits, ultimate-frontend-craft. All applied per design.