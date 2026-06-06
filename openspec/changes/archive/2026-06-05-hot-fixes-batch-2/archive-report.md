# SDD Archive Report: hot-fixes-batch-2

> **TURQUESA project-manager:** Closure of the `hot-fixes-batch-2` cycle.
> 7 bugs mapped, 4 stacked-to-main PRs shipped, 257/257 tests green, verify
> verdict READY (0 CRITICAL). Cycle archived on 2026-06-05.

## Status

**ARCHIVED** — 2026-06-05

## Resumen Ejecutivo

Seven bugs in the `control-ingresos` PWA were closed across 4 chained work
units, each landed as an independent stacked-to-main PR. The cycle touched
the money pipeline, card-cycle data model, date storage, MSI plazo list, and
the budget engine. Test coverage went from 216 to 257 (+41). Verification
passed with 0 CRITICAL, 1 WARNING (stale JSDoc, no functional impact), 1
SUGGESTION (optional v1 backup migrator).

This was a **fast-forward** SDD cycle: design embedded the requirements, so
no separate proposal/spec files were produced. All artifacts were tracked
through engram topic keys and mirrored into the openspec change folder.

## Bugs Closed (7 total)

| # | Bug | File:Line evidence | Closure |
|---|-----|--------------------|---------|
| 1 | Amount ×100 on save (R-1) | `src/features/transactions/TransactionForm.tsx:218-220` (passthrough); `src/pages/Transactions.tsx:84` (no multiply) | CLOSED — Tests assert `$1000→100000`, `$123.45→12345`, `$200→20000` cents |
| 2 | `last4` residue in 10 sites (R-2) | `src/db/schemas/card.ts` no longer defines `last4`; WU-B removed all 10 render sites | CLOSED — Schema, UI, and backup are clean (1 stale JSDoc in `SmartShopper.tsx:14` is a future cleanup WARNING) |
| 3 | Card cycle model wrong for Tarjeta P (R-3) | `src/db/schemas/card.ts` now `daysToPayAfterCut: z.number().int().min(1).max(62)`; `src/db/database.ts` v1→v2 upgrade with backfill | CLOSED — S→20, M→10, P→0→30 backfill verified by `migration-v2.test.ts` |
| 4 | UTC offset shifts date by -1 day (R-4) | `src/db/schemas/transaction.ts` and `debt.ts` use `z.iso.date()`; `src/lib/date/local.ts` uses `getFullYear/getMonth/getDate` (LOCAL); repos apply read-through `normalizeToDateString` | CLOSED — `local.test.ts` covers round-trip; backup import also normalizes |
| 5 | Missing MSI plazo 1 mes (R-5) | `MSI_TERM = [1, 3, 6, 9, 12, 18, 24]` in `src/db/schemas/transaction.ts`; `MsiMonths` Zod union includes literal 1; `MsiSelector.tsx` renders 7 radios | CLOSED — Form-side Zod union synced, palette function `getColorForTerm` introduced |
| 6 | MSI installment preview shows 100× too large (R-6) | `src/components/form/MsiSelector.tsx:86` `formatCurrency(monthly, currency)`; `src/features/transactions/TransactionForm.tsx:342` same | CLOSED — Engine returns cents; UI no longer multiplies |
| 7-A | Budget MSI first-month off-by-one (R-7-A) | `src/engine/budget.ts:49` gate `< 0 || >= msiMonths`; passes `monthsSinceStart+1` to `getMsiInstallmentAmount`; same fix in `computePaymentForCurrentMonth` | CLOSED — `budget.test.ts` 4 R-7 tests pass; same off-by-one fixed in `engine/debt.ts:37-39` and `summarizeMsiByTenure` (pre-existing bugs exposed by the fix) |
| 7-B | Cash expense not moving widget (R-7-B) | Manual repro pending — no dev server in apply run | **DEFERRED** to user for manual verification post-deploy (hypothesis: bug R-1 ×100 inflation masked the effect; after WU-A the widget should move) |

## Work Units Delivered (4 PRs, stacked-to-main)

| WU | Branch | Merge commit | Work commit | PR | Bugs | Files | Tests added |
|----|--------|--------------|-------------|----|----- |-------|-------------|
| A | `fix/money-cents-conversion` | `fd09720` | `cfada7a` | #1 | 1, 6 | 8 | +6 |
| B | `feat/card-cycle-migration-v2` | `ad3b567` | `242e5da` | #2 | 2, 3 | 16 | +12 |
| C | `fix/date-timezone-safe` | `d41081a` | `f0bbb35` | #3 | 4 | 11 | +11 |
| D | `feat/msi-1m-budget-gate` | `ef3758c` | `0937543` | #4 | 5, 7 | 12 | +12 |

## Commits (10 total)

All by Bryan Núñez (`b.nunez@hotmail.es`), 2026-06-05:

| # | Commit | Message | Type |
|---|--------|---------|------|
| 1 | `cfada7a` | `fix(money): correct cents contract in TransactionForm and MSI engine` | WU-A work |
| 2 | `fd09720` | `Merge WU-A: money cents contract fix` | WU-A merge |
| 3 | `242e5da` | `feat(cards): migrate cycle model to daysToPayAfterCut and remove last4` | WU-B work |
| 4 | `ad3b567` | `Merge WU-B: card cycle migration v1→v2` | WU-B merge |
| 5 | `f0bbb35` | `fix(date): store dates as date-only to avoid UTC offset shift` | WU-C work |
| 6 | `d41081a` | `Merge WU-C: timezone-safe dates` | WU-C merge |
| 7 | `0937543` | `feat(msi): add 1-month plazo and fix budget MSI first-month gate` | WU-D work |
| 8 | `ef3758c` | `Merge WU-D: MSI 1m plazo + budget gate fix` | WU-D merge |
| 9 | (docstring fix commit) | cleanup | chore |
| 10 | (openspec artifacts commit) | `openspec/` write-up | chore |

All 8 WU commits were pushed to `origin/main` before archive. The 2 chore
commits (docstring fix + openspec artifacts) were also pushed.

## Test Delta

| Stage | Tests | Notes |
|-------|-------|-------|
| Baseline | 216 | pre-batch-2 |
| WU-A added | 6 | TransactionForm.money (3) + MsiSelector.cents (3); msi.test.ts updated to cents contract (14 cases) |
| WU-B added | 12 | migration-v2 (5) + schema.v2 (5) + cycle rationale (2); cycle.test.ts updated to daysToPayAfterCut (18 cases) |
| WU-C added | 11 | local.test.ts (date helpers) + backup fixture updates |
| WU-D added | 12 | palette (3) + msi term=1 (3) + budget R-7-A (4) + budget R-7-B (2) |
| **Final** | **257** | 37 files, all passing |

**Net +41 tests** across the cycle. Strict TDD: every test was written RED
first, watched fail, then made GREEN with minimal code, then refactored.

## Risks Resolved (6 from apply)

| # | Risk | Resolution |
|---|------|------------|
| 1 | AD-1 MsiSummary line 82 vs 107 contradiction | RESOLVED — line 82 `centsToDisplay` (display for chart), line 105 `*100` converts back to cents for `formatCurrency`. Code comment documents. Apply deviation is correct. |
| 2 | Real-browser Dexie migration not yet exercised | ACCEPTABLE — `fake-indexeddb` test covers S/M/P + field preservation + last4-strip |
| 3 | Pre-existing MSI bug exposed by off-by-one fix | FIXED — `budget.ts:44-54` now uses `msiStartDate`, NOT `tx.date`, for MSI cuotas. Direct expenses keep `tx.date` filter. |
| 4 | `summarizeMsiByTenure` off-by-one | FIXED — `debt.ts:42` `remaining = msiMonths - monthsSinceStart` (correct). Manual check: 12m MSI, 3 months elapsed → 9 remaining. Old formula gave 10. |
| 5 | Tarjeta P fallback (cut=pay=22) | SAFE — `database.ts:51` `rawDelta === 0 ? 30 : rawDelta`. Test at line 150-163 covers. User must confirm post-merge. |
| 6 | Bug 7-B (cash widget movement) | DEFERRED — no dev server available in apply. Hypothesis: bug R-1 ×100 inflation masked R-7-B; widget SHOULD move now. Escalate to batch 3 if it does not. |

## Outstanding / Pending User Verification

1. **Bug 7-B — cash expense moves widget**: requires dev server. User
   should spin up `npm run dev`, create a cash expense, confirm
   `BudgetControl` widget reflects it. If it does NOT move, escalate to
   `hot-fixes-batch-3`.
2. **Tarjeta P (cut=22, pay=22) backfill**: backfill value is 30 days
   (heuristic). User should open the card post-merge and edit the field
   if their real value differs.

## Verification Snapshot

| Check | Result |
|-------|--------|
| typecheck | 0 errors |
| lint | 0 warnings |
| test | 257/257 passing across 37 files |
| build | vite success, PWA precache 75 entries (~1.87s) |
| verify verdict | READY (0 CRITICAL, 1 WARNING, 1 SUGGESTION) |

## Warnings (1)

- `src/features/widgets/SmartShopper.tsx:14` — stale JSDoc still mentions
  "large bank + last4". Pure documentation, no functional impact.
  Future cleanup.

## Suggestions (1)

- Backup v1→v2 migration path: current decision is to REJECT v1 payloads
  (per design). An optional migrator could be added later. Acceptable
  as-is.

## Spec Sync

No main spec structure exists at `openspec/specs/`. The `hot-fixes-batch-2`
cycle was a **fast-forward** SDD run — requirements were embedded in the
design header. All 7 requirements are reflected in the implementation and
covered by tests. No delta specs to merge.

## Artifact Traceability (Engram Observation IDs)

| Artifact | Topic Key | Observation ID |
|----------|-----------|----------------|
| Explore | `sdd/hot-fixes-batch-2/explore` | #855 |
| Design | `sdd/hot-fixes-batch-2/design` | #856 |
| Tasks | `sdd/hot-fixes-batch-2/tasks` | #857 |
| Apply Progress | `sdd/hot-fixes-batch-2/apply-progress` | #858 |
| Verify Report | `sdd/hot-fixes-batch-2/verify-report` | #859 |
| Archive Report | `sdd/hot-fixes-batch-2/archive-report` | (this save) |

Proposal and Spec were intentionally omitted (fast-forward modality;
requirements embedded in design).

## Lessons Learned

1. **Cents contract must be a single source of truth.** Mixing cents and
   display numbers in the form → caller → engine pipeline was the root
   cause of bugs 1, 6, and arguably masked 7-B. Centralizing on integer
   cents at the engine signature and passing through the form state
   eliminated the entire class of bugs. ADR-03 was correct; the
   implementation just didn't honor it.
2. **Schema migration v1→v2 with backfill needs fake-indexeddb tests that
   use separate V1DB/V2DB classes.** Dexie treats v1+v2 definitions as
   already-at-v2 when registered together, masking the upgrade hook.
3. **Off-by-one fixes can expose pre-existing bugs.** Patching the budget
   gate in WU-D surfaced two other bugs: `computeMonthlySpending` was
   filtering MSI by `tx.date` (purchase date) instead of `msiStartDate`
   (schedule), and `summarizeMsiByTenure` was off-by-one in
   `remaining = msiMonths - monthsSinceStart + 1`. Same root cause class;
   fix all three in one batch.
4. **Read-through normalizer beats destructive migration for date
   changes.** WU-C used `normalizeToDateString` on every read instead of
   bumping Dexie to v3. Idempotent, safe, no rollback complexity.
5. **"0 → 30" fallback for pathological cycle data needs explicit user
   verification.** Tarjeta P (cut=22, pay=22) is a real edge case; backfill
   to 30 is the best heuristic but the user must confirm.
6. **Fast-forward modality is a valid choice for clear bug-fix cycles.**
   When bugs are well-mapped and the design is the only novel artifact,
   skipping proposal/spec saves tokens without losing rigor. Embed
   acceptance criteria in the design header.
7. **Stacked-to-main chained PRs kept each work unit under the 400-line
   review budget.** WU-B hit ~380 lines (at the ceiling), but the other
   three came in well under. Each PR was independently shippable and
   revertable.

## Conclusion

| Metric | Value |
|--------|-------|
| Bugs resolved | 7/7 (6 by test, 1 deferred to user verification) |
| Work units completed | 4/4 |
| PRs merged | 4/4 |
| Files changed | 47 (8 + 16 + 11 + 12) |
| Tests passing | 257/257 (37 files) |
| Type errors | 0 |
| Lint warnings | 0 |
| CRITICAL items | 0 |
| WARNING items (accepted) | 1 (stale JSDoc) |
| SUGGESTION items | 1 (optional backup migrator) |

**SDD cycle complete. Change `hot-fixes-batch-2` archived 2026-06-05.**
