/**
 * computeFixedPaymentsSummary — control-ingresos (redesign-ui-2026, T6)
 *
 * Pure computation behind the Pagos fijos screen. Reuses the engine's
 * recurrence rule (`isFixedPaymentDueThisMonth`) — the periodicity logic
 * is NOT reimplemented here.
 *
 * Timezone contract (L16): the engine reads the reference date's UTC
 * fields, so the window is materialized at UTC midnight from the user's
 * LOCAL calendar fields. Month labels, instead, are formatted from a
 * local-midnight date so date-fns renders the intended month in any
 * timezone. Both dates are derived from the same (year, month) pair, so
 * they can never disagree.
 */
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { isFixedPaymentDueThisMonth } from "@/engine/fixedPayments";
import type { FixedPayment } from "@/db/schemas/fixedPayment";
import type { FixedPaymentsSummary, SelectedMonth } from "./types";

export interface ComputeFixedPaymentsSummaryOptions {
  today?: Date;
}

function capitalize(value: string): string {
  return value.replace(/^\w/, (c) => c.toUpperCase());
}

function byPaymentDay(a: FixedPayment, b: FixedPayment): number {
  return (
    a.paymentDay - b.paymentDay ||
    a.description.localeCompare(b.description, "es")
  );
}

export function computeFixedPaymentsSummary(
  fixedPayments: FixedPayment[],
  currency: string,
  selectedMonth: SelectedMonth,
  options: ComputeFixedPaymentsSummaryOptions = {},
): FixedPaymentsSummary {
  const today = options.today ?? new Date();
  const offset = selectedMonth === "current" ? 0 : 1;
  const year = today.getFullYear();
  const monthIndex = today.getMonth() + offset;

  // Label date: local midnight of the selected month — safe for the
  // local date-fns formatters.
  const labelDate = new Date(year, monthIndex, 1);
  // Engine date: UTC midnight of the same month — what
  // `isFixedPaymentDueThisMonth` reads. `new Date(y, m, 1)` (local)
  // would let the UTC month drift near midnight in offset timezones.
  const refDate = new Date(Date.UTC(year, monthIndex, 1));

  const dueRows: FixedPayment[] = [];
  const upcomingRows: FixedPayment[] = [];
  for (const fp of fixedPayments) {
    if (isFixedPaymentDueThisMonth(fp, refDate)) {
      dueRows.push(fp);
    } else {
      upcomingRows.push(fp);
    }
  }
  dueRows.sort(byPaymentDay);
  upcomingRows.sort(byPaymentDay);

  const totalCents = dueRows.reduce((sum, fp) => sum + fp.amount, 0);

  return {
    currency,
    selectedMonth,
    monthLabel: capitalize(format(labelDate, "MMMM", { locale: es })),
    currentMonthLabel: capitalize(
      format(new Date(year, today.getMonth(), 1), "MMMM", { locale: es }),
    ),
    nextMonthLabel: capitalize(
      format(new Date(year, today.getMonth() + 1, 1), "MMMM", { locale: es }),
    ),
    refDate,
    totalCents,
    totalCount: fixedPayments.length,
    dueRows,
    upcomingRows,
  };
}
