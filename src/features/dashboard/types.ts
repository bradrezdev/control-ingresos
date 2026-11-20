import type { Card, Transaction, FixedPayment } from "@/db/schemas";

export type SelectedMonth = "current" | "next";

export interface FixedPaymentRow {
  id: string;
  label: string;
  amountCents: number;
}

export interface CardPaymentRow {
  cardId: string;
  bank: string;
  amountCents: number;
  /**
   * Engine date at UTC midnight (from `computeActivePaymentDate`).
   * Convert with `utcDateToLocal` before any local formatting.
   */
  paymentDate: Date;
  daysUntil: number;
  isOverdue: boolean;
}

export interface MsiGroupRow {
  tenure: number;
  totalDebt: number;
  percent: number;
}

export interface RecentTransactionRow {
  id: string;
  description: string;
  amountCents: number;
  sign: "positive" | "negative";
  /** Local-calendar date (parseISO of the stored "YYYY-MM-DD" day) — safe for direct local formatting. */
  date: Date;
  accountName: string;
  category: string | undefined;
  categoryInitial: string;
  categoryColor: string;
  categoryTextColor: string;
}

export interface DashboardSummary {
  currency: string;
  selectedMonth: SelectedMonth;
  monthLabel: string;
  currentMonthLabel: string;
  nextMonthLabel: string;
  longDate: string;
  refDate: Date;
  isCurrentMonth: boolean;
  limitCents: number;
  usedCents: number;
  availableCents: number;
  usedPercent: number;
  progressPercent: number;
  paceOk: boolean;
  fixedTotalCents: number;
  fixedPayments: {
    top: FixedPaymentRow[];
    others: FixedPaymentRow[];
  };
  cardTotalCents: number;
  cardPayments: CardPaymentRow[];
  urgentPayment: CardPaymentRow | null;
  msiTotalDebt: number;
  msiActiveCount: number;
  msiGroups: MsiGroupRow[];
  recentTransactions: RecentTransactionRow[];
}

export interface DashboardData {
  transactions: Transaction[];
  cards: Card[];
  fixedPayments: FixedPayment[];
  settings: {
    monthlyLimit: number;
    currency: string;
  };
}
