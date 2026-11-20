/**
 * Shared types and display labels for the fixed payments feature
 * (redesign-ui-2026, T6).
 */
import type { FixedPayment } from "@/db/schemas/fixedPayment";

export type SelectedMonth = "current" | "next";

/** Frequency chip labels (es-MX) for each recurrence period. */
export const PERIOD_LABEL: Record<FixedPayment["period"], string> = {
  monthly: "Mensual",
  bimonthly: "Bimestral",
  quarterly: "Trimestral",
};

/** Payment method labels (es-MX) used as the account fallback. */
export const METHOD_LABEL: Record<FixedPayment["paymentMethod"], string> = {
  cash: "Efectivo",
  debit: "Débito",
  credit: "Crédito",
  transfer: "Transferencia",
};

export interface FixedPaymentsSummary {
  currency: string;
  selectedMonth: SelectedMonth;
  /** Capitalized month name of the selected window, e.g. "Noviembre". */
  monthLabel: string;
  currentMonthLabel: string;
  nextMonthLabel: string;
  /**
   * Engine reference date: UTC midnight of the selected month. Built with
   * the explicit UTC constructor so the engine's UTC reads always match
   * the label shown (never pass a local `new Date(y, m, d)` here — near
   * midnight the UTC month can differ from the local one).
   */
  refDate: Date;
  /** Total in cents of the payments due in the selected month. */
  totalCents: number;
  /** Total number of fixed payment records (drives the empty state). */
  totalCount: number;
  /** Payments due in the selected month, sorted by payment day. */
  dueRows: FixedPayment[];
  /** Payments not due in the selected month, sorted by payment day. */
  upcomingRows: FixedPayment[];
}
