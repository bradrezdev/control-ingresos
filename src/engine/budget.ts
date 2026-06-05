import type { Transaction } from '@/db/schemas/transaction';
import { type MsiTenure, getMsiInstallmentAmount } from './msi';

export interface MonthlySpending {
  total: number;
  byCategory: Record<string, number>;
}

export type BudgetStatus = 'safe' | 'warning' | 'danger';

export interface BudgetStatusInfo {
  percent: number;
  status: BudgetStatus;
}

/**
 * Suma de gastos (no ingresos) del mes actual de `today`. Para gastos MSI sólo
 * se cuenta la cuota que cae en este mes (mismo cálculo que el calendario).
 * El monto de la cuota MSI respeta el invariante del motor: la última cuota
 * absorbe el residuo.
 */
export function computeMonthlySpending(
  transactions: Transaction[],
  today: Date,
): MonthlySpending {
  const year = today.getUTCFullYear();
  const month = today.getUTCMonth() + 1; // 1-12

  const byCategory: Record<string, number> = {};
  let total = 0;

  for (const tx of transactions) {
    const txDate = new Date(tx.date);
    if (txDate.getUTCFullYear() !== year) continue;
    if (txDate.getUTCMonth() + 1 !== month) continue;

    if (tx.type === 'income') continue;

    let amount = tx.amount;
    if (tx.type === 'expense_msi') {
      // Para MSI la fecha `date` es la fecha original de compra. La cuota del
      // mes actual se aproxima con prorrateo uniforme. Si el mes actual está
      // fuera del calendario, no contamos nada.
      const start = new Date(tx.msiStartDate);
      const startYear = start.getUTCFullYear();
      const startMonth = start.getUTCMonth() + 1;
      const monthsSinceStart =
        (year - startYear) * 12 + (month - startMonth);
      if (monthsSinceStart < 1 || monthsSinceStart > tx.msiMonths) continue;
      amount = getMsiInstallmentAmount(
        tx.amount,
        tx.msiMonths as MsiTenure,
        monthsSinceStart,
      );
    }

    total += amount;
    const key = tx.category ?? '__uncategorized__';
    byCategory[key] = (byCategory[key] ?? 0) + amount;
  }

  return { total, byCategory };
}

/**
 * Determina el estado del presupuesto según porcentaje de uso:
 *   safe    → < 60%
 *   warning → 60-80%
 *   danger  → > 80%
 *
 * Si el límite es 0 (no configurado), se devuelve percent=0 y status='safe'.
 */
export function computeBudgetStatus(
  spending: number,
  monthlyLimit: number,
): BudgetStatusInfo {
  if (monthlyLimit <= 0) {
    return { percent: 0, status: 'safe' };
  }
  const percent = (spending / monthlyLimit) * 100;
  let status: BudgetStatus;
  if (percent < 60) status = 'safe';
  else if (percent <= 80) status = 'warning';
  else status = 'danger';
  return { percent, status };
}

/**
 * Suma de pagos de una tarjeta en el mes actual: gastos directos + cuota MSI
 * del mes (si la MSI tiene calendario en este mes). La cuota MSI respeta el
 * invariante del motor: la última cuota absorbe el residuo.
 */
export function computePaymentForCurrentMonth(
  cardId: string,
  transactions: Transaction[],
  today: Date,
): number {
  const year = today.getUTCFullYear();
  const month = today.getUTCMonth() + 1;
  let total = 0;

  for (const tx of transactions) {
    if (tx.type === 'income') continue;
    if ('cardId' in tx && tx.cardId !== cardId) continue;

    const txDate = new Date(tx.date);
    if (tx.type === 'expense') {
      if (txDate.getUTCFullYear() !== year) continue;
      if (txDate.getUTCMonth() + 1 !== month) continue;
      total += tx.amount;
    } else if (tx.type === 'expense_msi') {
      const start = new Date(tx.msiStartDate);
      const monthsSinceStart =
        (year - start.getUTCFullYear()) * 12 + (month - (start.getUTCMonth() + 1));
      if (monthsSinceStart < 1 || monthsSinceStart > tx.msiMonths) continue;
      total += getMsiInstallmentAmount(
        tx.amount,
        tx.msiMonths as MsiTenure,
        monthsSinceStart,
      );
    }
  }

  return total;
}
