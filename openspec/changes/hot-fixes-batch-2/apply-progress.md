# Apply Progress — hot-fixes-batch-2

> **RED Jazmin / CYAN Bryan / PURPLE Adrian:** Backend/data architect
> + UX-facing date + cross-cutting full-stack. 4 WUs executed
> stacked-to-main, TDD discipline enforced.

## Status

[x] DONE — 4/4 WUs implemented, committed, pushed, and merged to main.

## WU-A — Money fix (bugs 1, 6)

- Branch: `fix/money-cents-conversion`
- Merge commit: `fd09720`
- Work commit: `cfada7a`
- PR: #1
- TDD: RED tests written first (5 failing). GREEN: engine signatures + form wiring + caller + selectors.
- Tests added: 6 (3 TransactionForm.money + 3 MsiSelector.cents). msi.test.ts updated to cents contract.

## WU-B — Cycle schema migration + last4 cleanup (bugs 2, 3)

- Branch: `feat/card-cycle-migration-v2`
- Merge commit: `ad3b567`
- Work commit: `242e5da`
- PR: #2
- TDD: 16 RED tests. Test design needed two separate Dexie classes (V1DB + V2DB) for proper upgrade simulation.
- Tests added: 12 (5 migration-v2 + 5 schema.v2 + 2 new engine rationale tests). cycle.test.ts updated to daysToPayAfterCut.
- Tarjeta P (cut=pay=22) backfills to daysToPayAfterCut=30 (0→30 fallback). User must verify post-merge.

## WU-C — Timezone-safe dates (bug 4)

- Branch: `fix/date-timezone-safe`
- Merge commit: `d41081a`
- Work commit: `f0bbb35`
- PR: #3
- TDD: 11 RED tests for new helpers.
- Tests added: 11 (local.test.ts). Backup test fixtures updated to date-only.
- Strategy: read-through normalizer (NOT Dexie v3 destructive). Idempotent.

## WU-D — MSI plazo 1m + budget gate (bugs 5, 7)

- Branch: `feat/msi-1m-budget-gate`
- Merge commit: `ef3758c`
- Work commit: `0937543`
- PR: #4
- TDD: 12 RED tests. Off-by-one gate fix exposed pre-existing bug in computeMonthlySpending (filtered MSI by tx.date, not msiStartDate).
- Tests added: 12 (3 palette + 3 msi term=1 + 4 budget R-7-A + 2 budget R-7-B).

## Test counts

| Stage | Tests |
|---|---|
| Baseline | 216 |
| WU-A added | 6 |
| WU-B added | 12 |
| WU-C added | 11 |
| WU-D added | 12 |
| **Final** | **257** |

All 257 tests pass on main. typecheck + lint clean.

## Manual verification (bug 7-B)

- Status: NOT performed (no dev server / user session in this run).
- Hypothesis: bug R-1 (×100 inflation) masked R-7-B's effect. After WU-A merge, the cents contract is fixed; widget SHOULD move with cash gastos.
- Recommendation: spin up dev server post-deploy, create a cash expense, confirm BudgetControl widget reflects it. If it does NOT move, escalate to batch 3.

## Outstanding items

- None blocking. All 7 bugs have either test coverage or migration code path.
- Bug 7-B manual verify: pending user testing.
- Tarjeta P (cut=pay=22) user verification: backfill = 30 days, user should confirm and edit if needed.

## Risks / deviations

- **WU-A design inconsistency (line 107 MsiSummary)**: Design said to remove `Math.round(value * 100)` in tooltip, but also said chart data stays in display. These contradict. I left the `Math.round` because chart data IS in display; tooltip MUST convert back. Documented in code comment.
- **WU-B rationale interpretation**: Design's `nextPayment = previous + daysToPayAfterCut` doesn't match the test's expectation of next cut's payment. I used `computeCutCycle(...).paymentDate` (next cut's payment) instead.
- **TZ handling for "hace X días"**: Math.round of 20.5 days = 21. Used UTC-midnight diff (20 days exact) instead.
- **Pre-existing bug in `computeMonthlySpending`**: filtered MSI by `tx.date` (purchase date), not `msiStartDate` (schedule). Off-by-one fix exposed this; corrected to use msiStartDate-based logic for MSI.
- **Math in `summarizeMsiByTenure`**: old `remaining = msiMonths - monthsSinceStart + 1` was off-by-one. Corrected to `remaining = msiMonths - monthsSinceStart`. Tests updated.

## skill_resolution

`paths-injected` — orchestrator provided paths for typescript, zod-4, react-19, test-driven-development, work-unit-commits, branch-pr, ultimate-frontend-craft. All applied per design.
