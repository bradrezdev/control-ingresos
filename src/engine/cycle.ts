import type { Card } from '@/db/schemas/card';
import { subMonths } from 'date-fns';

export interface CutCycleInfo {
  daysUntilCut: number;
  daysUntilPayment: number;
  cycleLengthDays: number;
  cutDate: Date;
  paymentDate: Date;
}

/** Devuelve los días del mes `year/month` (1-31), respetando bisiestos. */
function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

/** Clampea un día (1-31) al último día del mes dado. */
function clampDay(day: number, year: number, month: number): number {
  const max = daysInMonth(year, month);
  return Math.min(day, max);
}

/** Construye un Date UTC a partir de year/month/day. */
function utcDate(year: number, month: number, day: number): Date {
  return new Date(Date.UTC(year, month - 1, day));
}

/** Diferencia en días entre dos Dates (b - a), ignorando hora. */
function diffDays(a: Date, b: Date): number {
  const ms = b.getTime() - a.getTime();
  return Math.round(ms / 86_400_000);
}

/** Suma N meses a (year, month 1-12) y devuelve el resultado normalizado. */
function addMonths(year: number, month: number, n: number): { year: number; month: number } {
  const total = (year * 12 + (month - 1)) + n;
  return { year: Math.floor(total / 12), month: (total % 12) + 1 };
}

/**
 * Calcula el próximo ciclo de corte y pago de una tarjeta (modelo v2):
 *   - `cutDate` = próxima ocurrencia de `cutDay` >= hoy
 *   - `paymentDate` = cutDate + `daysToPayAfterCut` días
 *   - `cycleLengthDays` === `daysToPayAfterCut` (constante por tarjeta)
 *
 * Tarjetas de débito no tienen ciclo de corte/pago: este motor es
 * relevante sólo para tarjetas de crédito. El caller debe filtrar las
 * tarjetas de débito antes de invocar.
 */
export function computeCutCycle(card: Card, today: Date): CutCycleInfo {
  if (card.cardType === "debit") {
    throw new Error(
      "computeCutCycle no aplica a tarjetas de débito (no tienen ciclo de corte/pago)",
    );
  }
  // A partir de acá asumimos credit. Zod valida estos campos como requeridos
  // para credit en el superRefine, así que los `!` son seguros.
  const cutDay = card.cutDay as number;
  const daysToPayAfterCut = card.daysToPayAfterCut as number;

  const todayUtc = utcDate(
    today.getUTCFullYear(),
    today.getUTCMonth() + 1,
    today.getUTCDate(),
  );

  const y = todayUtc.getUTCFullYear();
  const m = todayUtc.getUTCMonth() + 1;
  const d = todayUtc.getUTCDate();

  const baseYear = d >= cutDay ? addMonths(y, m, 1).year : y;
  const baseMonth = d >= cutDay ? addMonths(y, m, 1).month : m;

  const clampedCut = clampDay(cutDay, baseYear, baseMonth);
  const cutDate = utcDate(baseYear, baseMonth, clampedCut);

  // paymentDate = cutDate + daysToPayAfterCut días, sin addMonths y sin
  // lógica de día-del-mes. JS Date.setUTCDate hace el overflow correctamente.
  const paymentDate = new Date(cutDate);
  paymentDate.setUTCDate(paymentDate.getUTCDate() + daysToPayAfterCut);

  const daysUntilCut = diffDays(todayUtc, cutDate);
  const daysUntilPayment = diffDays(todayUtc, paymentDate);
  const cycleLengthDays = daysToPayAfterCut;

  return {
    daysUntilCut,
    daysUntilPayment,
    cycleLengthDays,
    cutDate,
    paymentDate,
  };
}

// Mantener import vivo aunque no se use directamente (compat con tests que
// re-importan desde este módulo y futuros consumidores).
void subMonths;
