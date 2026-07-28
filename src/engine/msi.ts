import type { MsiExpense, Transaction } from '@/db/schemas/transaction';
import { MSI_TERM, type MsiTerm } from '@/db/schemas/transaction';

/**
 * Convención MSI del motor:
 * `msiStartDate` representa el mes del primer pago;
 * la cuota 1 cae en ese mismo mes.
 */

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
 * Devuelve la **cuota regular** (no la última) en centavos enteros.
 *
 * La cuota regular se redondea hacia ABAJO al centavo. La última cuota del
 * calendario absorbe el residuo, garantizando el invariante:
 *
 *   (N - 1) × getMsiMonthlyAmount(amount, N) + última === amount
 *
 * Convención de unidades (ADR-03): todos los argumentos y retornos
 * monetarios son centavos enteros. Use `displayToCents` o `centsToDisplay`
 * en la frontera hacia la UI.
 *
 * Ejemplos:
 *   getMsiMonthlyAmount(100000, 3) → 33333  ($1000 / 3, regular)
 *   getMsiMonthlyAmount(120000, 12) → 10000 ($1200 / 12, regular)
 *   getMsiMonthlyAmount(0, 12)     → 0
 *   getMsiMonthlyAmount(100, 0)    → 100    (caso patológico, Zod lo bloquea)
 */
export function getMsiMonthlyAmount(amountCents: number, months: MsiTenure): number {
  if (amountCents <= 0) return 0;
  if (months <= 0) return amountCents;
  // Floor para que la cuota regular nunca exceda amountCents / months.
  // El residuo se acumula en la última cuota.
  return Math.floor(amountCents / months);
}

/**
 * Devuelve el monto EXACTO de la cuota `monthIndex` (1-based) de un MSI.
 * La última cuota absorbe el residuo para garantizar:
 *
 *   Σ getMsiInstallmentAmount(amount, N, i) para i=1..N === amount
 *
 * Devuelve 0 si `monthIndex` está fuera del rango [1, months] o si el monto
 * es inválido. Todos los argumentos/retornos en centavos enteros.
 */
export function getMsiInstallmentAmount(
  amountCents: number,
  months: MsiTenure,
  monthIndex: number,
): number {
  if (amountCents <= 0 || months <= 0) return 0;
  if (monthIndex < 1 || monthIndex > months) return 0;
  const base = getMsiMonthlyAmount(amountCents, months);
  if (monthIndex === months) {
    // Última cuota = monto total - (N-1) × base. Centavos enteros, sin
    // redondeo adicional.
    return amountCents - base * (months - 1);
  }
  return base;
}

/**
 * Construye el calendario de N mensualidades empezando en el mes de
 * `msiStartDate`, que representa el mes del primer pago. La cuota 1 cae
 * en ese mismo mes y la cuota N cae N - 1 meses después. La cantidad de
 * cada cuota respeta el invariante:
 *
 *   Σ schedule[i].amount para i=1..N === transaction.amount
 *
 * Cada `amount` está en centavos enteros.
 */
export function computeMsiSchedule(
  transaction: MsiExpense,
  today: Date,
): MsiScheduleEntry[] {
  const start = new Date(transaction.msiStartDate);
  const months = transaction.msiMonths;
  const entries: MsiScheduleEntry[] = [];
  const startYear = start.getUTCFullYear();
  const startMonth = start.getUTCMonth(); // 0-11

  for (let i = 1; i <= months; i += 1) {
    const totalMonths = startMonth + (i - 1);
    const year = startYear + Math.floor(totalMonths / 12);
    const month = (totalMonths % 12) + 1; // 1-12
    const amount = getMsiInstallmentAmount(transaction.amount, months, i);
    entries.push({ year, month, amount });
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

/**
 * Devuelve la cuota activa (1-based) de un MSI `tx` en el mes de `today`.
 *
 * Convención: `msiStartDate` representa el mes del primer pago;
 * cuota 1 = mes de `msiStartDate`.
 *
 * Devuelve `null` si:
 *  - `tx.type !== 'expense_msi'`
 *  - el MSI aún no inicia (`monthsSinceStart < 0`)
 *  - el MSI ya terminó (`monthsSinceStart >= tx.msiMonths`)
 *
 * Caso normal: retorna `monthsSinceStart + 1` (1-based).
 *
 * Usa `getUTCFullYear()` / `getUTCMonth()` para mantener consistencia con el
 * resto del motor y con el schema Zod (`z.iso.date()` retorna un string
 * `YYYY-MM-DD` que se parsea como UTC al construir `new Date(...)`).
 *
 * @example
 *  // MSI creado en julio 2026, 15 meses, today = 2026-07-27
 *  getCurrentMsiInstallment(tx, today) === 1
 *  // el mismo MSI con today = 2026-08-15
 *  getCurrentMsiInstallment(tx, today) === 2
 *  // el mismo MSI con today = 2027-09-01 (después de los 15 meses)
 *  getCurrentMsiInstallment(tx, today) === null
 */
export function getCurrentMsiInstallment(
  tx: Transaction,
  today: Date,
): number | null {
  if (tx.type !== 'expense_msi') return null;
  const start = new Date(tx.msiStartDate);
  const year = today.getUTCFullYear();
  const month = today.getUTCMonth() + 1;
  const startYear = start.getUTCFullYear();
  const startMonth = start.getUTCMonth() + 1;
  const monthsSinceStart =
    (year - startYear) * 12 + (month - startMonth);
  if (monthsSinceStart < 0 || monthsSinceStart >= tx.msiMonths) return null;
  return monthsSinceStart + 1;
}
