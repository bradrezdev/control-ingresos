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
 * Devuelve la **cuota regular** (no la última) en pesos (no centavos).
 *
 * La cuota regular se redondea hacia ABAJO al centavo. La última cuota del
 * calendario absorbe el residuo, garantizando el invariante:
 *
 *   (N - 1) × getMsiMonthlyAmount(amount, N) + última === amount
 *
 * Ejemplos:
 *   getMsiMonthlyAmount(1000, 3) → 333.33  (última cuota = 333.34)
 *   getMsiMonthlyAmount(1200, 12) → 100    (última cuota = 100)
 *   getMsiMonthlyAmount(0, 12)    → 0
 *   getMsiMonthlyAmount(100, 0)   → 100    (caso patológico, Zod lo bloquea)
 *
 * Use `getMsiInstallmentAmount(amount, months, monthIndex)` si necesitás el
 * monto EXACTO de una cuota específica (la última absorbe el residuo).
 * Use `computeMsiSchedule` para el calendario completo de N entradas.
 */
export function getMsiMonthlyAmount(amount: number, months: MsiTenure): number {
  if (amount <= 0) return 0;
  if (months <= 0) return amount;
  // Floor para que la cuota regular nunca exceda amount / months.
  // El residuo se acumula en la última cuota.
  return Math.floor((amount / months) * 100) / 100;
}

/**
 * Devuelve el monto EXACTO de la cuota `monthIndex` (1-based) de un MSI.
 * La última cuota absorbe el residuo para garantizar:
 *
 *   Σ getMsiInstallmentAmount(amount, N, i) para i=1..N === amount
 *
 * Devuelve 0 si `monthIndex` está fuera del rango [1, months] o si el monto
 * es inválido.
 */
export function getMsiInstallmentAmount(
  amount: number,
  months: MsiTenure,
  monthIndex: number,
): number {
  if (amount <= 0 || months <= 0) return 0;
  if (monthIndex < 1 || monthIndex > months) return 0;
  const base = getMsiMonthlyAmount(amount, months);
  if (monthIndex === months) {
    // Última cuota = monto total - (N-1) × base
    // Redondeo al centavo para neutralizar drift de punto flotante.
    const last = amount - base * (months - 1);
    return Math.round(last * 100) / 100;
  }
  return base;
}

/**
 * Construye el calendario de N mensualidades empezando el mes siguiente a
 * `msiStartDate`. La primera cuota cae en (year, month+1) y la última N meses
 * después. La cantidad de cada cuota respeta el invariante:
 *
 *   Σ schedule[i].amount para i=1..N === transaction.amount
 *
 * Las primeras N-1 cuotas son iguales (la cuota regular devuelta por
 * `getMsiMonthlyAmount`); la última absorbe el residuo.
 */
export function computeMsiSchedule(
  transaction: MsiExpense,
  today: Date,
): MsiScheduleEntry[] {
  const start = new Date(transaction.msiStartDate);
  const baseAmount = getMsiMonthlyAmount(transaction.amount, transaction.msiMonths);
  const months = transaction.msiMonths;
  const entries: MsiScheduleEntry[] = [];
  const startYear = start.getUTCFullYear();
  const startMonth = start.getUTCMonth(); // 0-11

  for (let i = 1; i <= months; i += 1) {
    const totalMonths = startMonth + i;
    const year = startYear + Math.floor(totalMonths / 12);
    const month = (totalMonths % 12) + 1; // 1-12
    const amount = getMsiInstallmentAmount(transaction.amount, months, i);
    entries.push({ year, month, amount });
    // baseAmount se mantiene para legibilidad / debugging; la fuente de
    // verdad del monto por entrada es getMsiInstallmentAmount.
    void baseAmount;
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
