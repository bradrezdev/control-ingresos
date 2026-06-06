import type { Transaction } from '@/db/schemas/transaction';
import type { FixedPayment } from '@/db/schemas/fixedPayment';
import { type MsiTenure, getMsiInstallmentAmount } from './msi';
import { isFixedPaymentDueThisMonth } from './fixedPayments';

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
    if (tx.type === 'income') continue;

    let amount = tx.amount;
    if (tx.type === 'expense_msi') {
      // R-7 (bug 7-A): el gate original `< 1 || > msiMonths` saltaba la
      // PRIMERA cuota (monthsSinceStart=0 cuando MSI empezó este mes).
      // La nueva condición es `< 0 || >= msiMonths` y se pasa
      // `monthsSinceStart + 1` al motor (que es 1-based).
      // NO filtramos por tx.date: el "mes actual" de un MSI se define
      // por su msiStartDate y el calendario de cuotas, no por la fecha
      // original de compra.
      const start = new Date(tx.msiStartDate);
      const startYear = start.getUTCFullYear();
      const startMonth = start.getUTCMonth() + 1;
      const monthsSinceStart =
        (year - startYear) * 12 + (month - startMonth);
      if (monthsSinceStart < 0 || monthsSinceStart >= tx.msiMonths) continue;
      amount = getMsiInstallmentAmount(
        tx.amount,
        tx.msiMonths as MsiTenure,
        monthsSinceStart + 1,
      );
    } else {
      // Gasto directo: sí se filtra por tx.date (es la fecha de la compra).
      const txDate = new Date(tx.date);
      if (txDate.getUTCFullYear() !== year) continue;
      if (txDate.getUTCMonth() + 1 !== month) continue;
    }

    total += amount;
    const key = tx.category ?? '__uncategorized__';
    byCategory[key] = (byCategory[key] ?? 0) + amount;
  }

  return { total, byCategory };
}

/**
 * Determina el estado del presupuesto según porcentaje de uso (per spec):
 *   safe    → < 80%
 *   warning → 80%–99%  (advertencia explícita al usuario al llegar al 80%)
 *   danger  → ≥ 100%   (excedió el límite)
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
  if (percent < 80) status = 'safe';
  else if (percent < 100) status = 'warning';
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
      // R-7 (bug 7-A): mismo fix que arriba — incluir cuota 1 cuando
      // MSI empezó este mes.
      const start = new Date(tx.msiStartDate);
      const monthsSinceStart =
        (year - start.getUTCFullYear()) * 12 + (month - (start.getUTCMonth() + 1));
      if (monthsSinceStart < 0 || monthsSinceStart >= tx.msiMonths) continue;
      total += getMsiInstallmentAmount(
        tx.amount,
        tx.msiMonths as MsiTenure,
        monthsSinceStart + 1,
      );
    }
  }

  return total;
}

/**
 * Suma el monto (en cents) de los pagos fijos que caen este mes.
 * Usa la misma lógica de recurrencia que el widget FixedPaymentsWidget.
 */
export function computeFixedPaymentsForMonth(
  fixedPayments: FixedPayment[],
  today: Date,
): number {
  return fixedPayments
    .filter((fp) => isFixedPaymentDueThisMonth(fp, today))
    .reduce((sum, fp) => sum + fp.amount, 0);
}
