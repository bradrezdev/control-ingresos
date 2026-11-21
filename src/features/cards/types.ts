/**
 * Wallet types — control-ingresos (redesign-ui-2026, T5)
 *
 * View-model shapes produced by `computeCardAccount.ts`. All monetary
 * values are integer cents (ADR-03); all dates follow the engine's
 * UTC-midnight convention.
 */
import type { Card, Transaction } from "@/db/schemas";

/** Usage bar tone by percent: ≤60 primary, 61–85 warning, >85 danger. */
export type UsageTone = "primary" | "warning" | "danger";

/** Payment status chip. The label always carries the state in text. */
export interface PaymentChip {
  tone: "ok" | "warn" | "neutral";
  label: string;
}

/**
 * Current statement cycle of a credit card (derived from the engine's
 * active payment date; see `computeCardAccount.ts`).
 */
export interface CycleInfo {
  /** First day that accumulates charges for the billed cycle. */
  startDate: Date;
  /** Cut date of the billed cycle (already occurred). */
  cutDate: Date;
  /** Payment due date for the billed cycle. */
  dueDate: Date;
}

/** Active MSI plan shown in the card detail sheet. */
export interface MsiPlanRow {
  id: string;
  description: string;
  monthsTotal: number;
  /** 1-based: which installment is due this month. */
  currentInstallment: number;
  /** This month's installment (cents; last installment absorbs remainder). */
  monthlyCents: number;
  /** Remaining debt: installments from this month onward (cents). */
  remainingCents: number;
  installmentsLeft: number;
}

/**
 * Per-card view model. Credit metrics are `null` for debit cards — the
 * engine's cycle helpers throw on debit, so they are never invoked for
 * them (see tests).
 *
 * `cycleTransactions`: for credit cards, the movements inside the billed
 * cycle window; for debit cards, the movements of the current month
 * (debit cards have no cycle).
 */
export interface CardAccount {
  card: Card;
  isCredit: boolean;
  /** Month spending on the card (cents). `null` for debit. */
  usedCents: number | null;
  /** Registered credit limit (cents) or `null` when unset. */
  limitCents: number | null;
  availableCents: number | null;
  /** Real percent (can exceed 100; the bar clamps, the text does not). */
  usedPercent: number | null;
  usageTone: UsageTone | null;
  /** Engine's active payment date. `null` for debit. */
  paymentDate: Date | null;
  /** Day distance to the active payment date. `null` for debit. */
  paymentDaysUntil: number | null;
  paymentChip: PaymentChip | null;
  cycle: CycleInfo | null;
  cycleTransactions: Transaction[];
  /** Estimated payment for next month (cents). `null` for debit. */
  nextMonthPaymentCents: number | null;
}

/** Next upcoming card payment, for the summary hero. */
export interface NextDue {
  bank: string;
  paymentDate: Date;
  daysUntil: number;
}

/** Wallet-wide summary rendered in the hero card. */
export interface WalletOverview {
  currency: string;
  totalLimitCents: number;
  totalUsedCents: number;
  /** Sum of per-card availability, each floored at zero. */
  totalAvailableCents: number;
  /** Earliest upcoming payment among cards with something to pay. */
  nextDue: NextDue | null;
}
