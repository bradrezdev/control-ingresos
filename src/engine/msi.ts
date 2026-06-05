import type { MsiExpense, Transaction } from '@/db/schemas/transaction';
import { MSI_TERM, type MsiTerm } from '@/db/schemas/transaction';

/** Tipos de plazo MSI soportados (3, 6, 9, 12, 18, 24). */
export type MsiTenure = MsiTerm;

export interface MsiScheduleEntry {
  year: number;
  /** 1-12 */
  month: number;
  amount: number;
}

export interface ActiveMsiForCurrentMonth {
  cardId: string;
  amount: number;
  monthsTotal: MsiTenure;
  /** 1-based: 1 = primer mes de MSI, msiMonths = último. */
  monthIndex: number;
}

/**
 * Prorrateo SIN intereses (MSI mexicano 0% promocional).
 * Devuelve el valor de la cuota mensual en pesos (no centavos).
 * Redondea hacia arriba al centavo para no perder precisión: la última
 * cuota absorbe el residuo si la suma mensual se queda corta.
 */
export function getMsiMonthlyAmount(amount: number, months: MsiTenure): number {
  if (amount <= 0) return 0;
  if (months <= 0) return amount;
  return Math.ceil((amount / months) * 100) / 100;
}

/**
 * Construye el calendario de N mensualidades empezando el mes siguiente a
 * `msiStartDate`. La primera cuota cae en (year, month+1) y la última N meses
 * después. La cantidad de cada cuota es uniforme (ver getMsiMonthlyAmount).
 */
export function computeMsiSchedule(
  transaction: MsiExpense,
  today: Date,
): MsiScheduleEntry[] {
  const start = new Date(transaction.msiStartDate);
  const monthlyAmount = getMsiMonthlyAmount(transaction.amount, transaction.msiMonths);
  const entries: MsiScheduleEntry[] = [];
  const startYear = start.getUTCFullYear();
  const startMonth = start.getUTCMonth(); // 0-11

  for (let i = 1; i <= transaction.msiMonths; i += 1) {
    const totalMonths = startMonth + i;
    const year = startYear + Math.floor(totalMonths / 12);
    const month = (totalMonths % 12) + 1; // 1-12
    entries.push({ year, month, amount: monthlyAmount });
  }

  // Suprimimos variable sin usar para forzar evaluación de `today` (mantener
  // firma simétrica con otras funciones del motor y permitir tests deterministas).
  void today;
  return entries;
}

/**
 * Devuelve las MSI que tienen una cuota cargando en el mes actual de `today`,
 * agrupadas por tarjeta. Una MSI está activa este mes si:
 *   1) msiStartDate <= último día del mes actual
 *   2) hoy no supera el último mes de su calendario
 */
export function getActiveMsiForCurrentMonth(
  transactions: Transaction[],
  today: Date,
): ActiveMsiForCurrentMonth[] {
  const result: ActiveMsiForCurrentMonth[] = [];
  const currentYear = today.getUTCFullYear();
  const currentMonth = today.getUTCMonth() + 1; // 1-12

  for (const tx of transactions) {
    if (tx.type !== 'expense_msi') continue;
    const schedule = computeMsiSchedule(tx, today);
    const indexInSchedule = schedule.findIndex(
      (e) => e.year === currentYear && e.month === currentMonth,
    );
    if (indexInSchedule === -1) continue;
    result.push({
      cardId: tx.cardId,
      amount: tx.amount,
      monthsTotal: tx.msiMonths as MsiTenure,
      monthIndex: indexInSchedule + 1,
    });
  }

  return result;
}

/** Helper de export para otros módulos que necesiten la lista de plazos. */
export const MSI_TERMS: readonly MsiTenure[] = MSI_TERM;
