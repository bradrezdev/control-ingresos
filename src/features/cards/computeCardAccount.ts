/**
 * Wallet computation — control-ingresos (redesign-ui-2026, T5)
 *
 * Pure view-model builders for the Tarjetas screen. No React, no Dexie.
 * Every financial rule comes from the engine:
 *
 *   - `computePaymentForCurrentMonth` (src/engine/budget.ts) for month
 *     spending and next month's estimate (the engine parametrizes the
 *     month by the reference date).
 *   - `computeActivePaymentDate` (src/engine/cycle.ts) for the active
 *     payment date — credit cards only; debit cards never reach it.
 *   - `getCurrentMsiInstallment`, `computeMsiSchedule` and
 *     `getMsiInstallmentAmount` (src/engine/msi.ts) for MSI plans.
 *
 * The billed-cycle window is derived from the engine's own outputs using
 * its documented formula (`paymentDate = lastCut + daysToPayAfterCut`):
 * the cut date is the payment date minus the pay window, and the previous
 * cut is the engine's payment date for the day before that cut. No cycle
 * calendar is reimplemented here.
 *
 * Date convention: the engine builds UTC-midnight dates, so all cycle
 * arithmetic and ISO-window comparisons below use UTC parts exclusively.
 */
import type { Card, Transaction } from "@/db/schemas";
import { computePaymentForCurrentMonth } from "@/engine/budget";
import { computeActivePaymentDate } from "@/engine/cycle";
import {
  computeMsiSchedule,
  getCurrentMsiInstallment,
  getMsiInstallmentAmount,
} from "@/engine/msi";
import { addMonths } from "@/lib/date/cycle";
import type {
  CardAccount,
  CycleInfo,
  MsiPlanRow,
  NextDue,
  PaymentChip,
  UsageTone,
  WalletOverview,
} from "./types";

/** Adds whole days on a UTC-midnight date without TZ drift. */
function addUtcDays(date: Date, days: number): Date {
  const next = new Date(date.getTime());
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

/** Whole-day count between two dates using UTC calendar days. */
function daysUntilUtc(from: Date, to: Date): number {
  const a = Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), from.getUTCDate());
  const b = Date.UTC(to.getUTCFullYear(), to.getUTCMonth(), to.getUTCDate());
  return Math.round((b - a) / 86_400_000);
}

/** ISO calendar day (YYYY-MM-DD) of a UTC-midnight date. */
function isoUtcDay(date: Date): string {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Converts an engine (UTC-midnight) date to a local-calendar Date so the
 * existing formatters render the intended calendar day in any timezone.
 */
export function toLocalDay(date: Date): Date {
  return new Date(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
}

/** Usage tone per the redesign spec: ≤60 primary, 61–85 warning, >85 danger. */
function usageToneFor(percent: number): UsageTone {
  if (percent > 85) return "danger";
  if (percent >= 61) return "warning";
  return "primary";
}

/**
 * Payment status chip, always with the state in text:
 * "Al día" (nothing to pay), "Pasado", "Hoy", "Mañana" or "En N días"
 * (warning at 5 days or less, neutral beyond).
 */
function dueChip(hasPayment: boolean, daysUntil: number): PaymentChip {
  if (!hasPayment) return { tone: "ok", label: "Al día" };
  if (daysUntil < 0) return { tone: "neutral", label: "Pasado" };
  if (daysUntil === 0) return { tone: "warn", label: "Hoy" };
  if (daysUntil === 1) return { tone: "warn", label: "Mañana" };
  return {
    tone: daysUntil <= 5 ? "warn" : "neutral",
    label: `En ${daysUntil} días`,
  };
}

function cardTransactionsOf(
  transactions: Transaction[],
  cardId: string,
): Transaction[] {
  return transactions.filter((tx) => "cardId" in tx && tx.cardId === cardId);
}

/** Transactions of the current calendar month (debit cards have no cycle). */
function monthTransactions(cardTxs: Transaction[], today: Date): Transaction[] {
  const monthPrefix = isoUtcDay(today).slice(0, 7);
  return cardTxs.filter((tx) => tx.date.slice(0, 7) === monthPrefix);
}

/** Transactions inside the [startDate, cutDate] statement window. */
function windowTransactions(
  cardTxs: Transaction[],
  startDate: Date,
  cutDate: Date,
): Transaction[] {
  const from = isoUtcDay(startDate);
  const to = isoUtcDay(cutDate);
  return cardTxs.filter((tx) => tx.date >= from && tx.date <= to);
}

/**
 * Builds the per-card view model. Debit cards short-circuit before any
 * cycle-engine call: `computeActivePaymentDate` throws on debit, so it is
 * only invoked for credit cards.
 */
export function computeCardAccount(
  card: Card,
  transactions: Transaction[],
  today: Date,
): CardAccount {
  const cardTxs = cardTransactionsOf(transactions, card.id);

  if (card.cardType !== "credit") {
    return {
      card,
      isCredit: false,
      usedCents: null,
      limitCents: null,
      availableCents: null,
      usedPercent: null,
      usageTone: null,
      paymentDate: null,
      paymentDaysUntil: null,
      paymentChip: null,
      cycle: null,
      cycleTransactions: monthTransactions(cardTxs, today),
      nextMonthPaymentCents: null,
    };
  }

  // Zod's superRefine guarantees these exist for credit cards.
  const daysToPay = card.daysToPayAfterCut as number;

  const usedCents = computePaymentForCurrentMonth(card.id, transactions, today);
  const limitCents = card.creditLimit ?? null;
  const usedPercent =
    limitCents !== null && limitCents > 0
      ? Math.round((usedCents / limitCents) * 100)
      : null;

  const paymentDate = computeActivePaymentDate(card, today);
  const paymentDaysUntil = daysUntilUtc(today, paymentDate);
  const paymentChip = dueChip(usedCents > 0, paymentDaysUntil);

  // Cycle from the engine's documented formula: paymentDate = cut + days.
  const cutDate = addUtcDays(paymentDate, -daysToPay);
  const previousCut = addUtcDays(
    computeActivePaymentDate(card, addUtcDays(cutDate, -1)),
    -daysToPay,
  );
  const cycle: CycleInfo = {
    startDate: addUtcDays(previousCut, 1),
    cutDate,
    dueDate: paymentDate,
  };

  return {
    card,
    isCredit: true,
    usedCents,
    limitCents,
    availableCents:
      limitCents !== null ? Math.max(0, limitCents - usedCents) : null,
    usedPercent,
    usageTone: usedPercent !== null ? usageToneFor(usedPercent) : null,
    paymentDate,
    paymentDaysUntil,
    paymentChip,
    cycle,
    cycleTransactions: windowTransactions(cardTxs, cycle.startDate, cutDate),
    // The engine derives the month from the reference date (same pattern
    // the dashboard uses for "mes siguiente").
    nextMonthPaymentCents: computePaymentForCurrentMonth(
      card.id,
      transactions,
      addMonths(today, 1),
    ),
  };
}

/**
 * Wallet-wide totals for the hero. `totalAvailableCents` floors each
 * card's availability at zero before summing; `nextDue` is the earliest
 * upcoming payment among credit cards with something to pay (already
 * past due dates surface on the card blocks, not in the hero).
 */
export function computeWalletOverview(
  accounts: CardAccount[],
  currency: string,
): WalletOverview {
  const credit = accounts.filter((account) => account.isCredit);

  const totalLimitCents = credit.reduce(
    (sum, account) => sum + (account.limitCents ?? 0),
    0,
  );
  const totalUsedCents = credit.reduce(
    (sum, account) => sum + (account.usedCents ?? 0),
    0,
  );
  const totalAvailableCents = credit.reduce(
    (sum, account) =>
      sum +
      (account.limitCents !== null && account.usedCents !== null
        ? Math.max(0, account.limitCents - account.usedCents)
        : 0),
    0,
  );

  const upcoming: NextDue[] = [];
  for (const account of credit) {
    if ((account.usedCents ?? 0) <= 0) continue;
    if (account.paymentDate === null || account.paymentDaysUntil === null) {
      continue;
    }
    if (account.paymentDaysUntil < 0) continue;
    upcoming.push({
      bank: account.card.bank,
      paymentDate: account.paymentDate,
      daysUntil: account.paymentDaysUntil,
    });
  }
  upcoming.sort((a, b) => a.paymentDate.getTime() - b.paymentDate.getTime());

  return {
    currency,
    totalLimitCents,
    totalUsedCents,
    totalAvailableCents,
    nextDue: upcoming[0] ?? null,
  };
}

/**
 * Active MSI plans for a card, sorted by remaining debt. Uses the
 * engine's schedule so the last-installment remainder invariant holds.
 */
export function computeMsiPlans(
  msiTransactions: Transaction[],
  today: Date,
): MsiPlanRow[] {
  const currentYear = today.getUTCFullYear();
  const currentMonth = today.getUTCMonth() + 1;
  const monthKey = currentYear * 12 + currentMonth;

  const plans: MsiPlanRow[] = [];
  for (const tx of msiTransactions) {
    if (tx.type !== "expense_msi") continue;

    const currentInstallment = getCurrentMsiInstallment(tx, today);
    if (currentInstallment === null) continue;

    const schedule = computeMsiSchedule(tx, today);
    const left = schedule.filter(
      (entry) => entry.year * 12 + entry.month >= monthKey,
    );
    plans.push({
      id: tx.id,
      description: tx.description,
      monthsTotal: tx.msiMonths,
      currentInstallment,
      monthlyCents: getMsiInstallmentAmount(
        tx.amount,
        tx.msiMonths,
        currentInstallment,
      ),
      remainingCents: left.reduce((sum, entry) => sum + entry.amount, 0),
      installmentsLeft: left.length,
    });
  }

  return plans.sort((a, b) => b.remainingCents - a.remainingCents);
}
