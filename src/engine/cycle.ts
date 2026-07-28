import type { Card } from '@/db/schemas/card';

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

/** Suma N meses a (year, month 1-12) y devuelve el resultado normalizado. */
function addMonths(year: number, month: number, n: number): { year: number; month: number } {
  const total = (year * 12 + (month - 1)) + n;
  return { year: Math.floor(total / 12), month: (total % 12) + 1 };
}

/**
 * Última fecha de corte de la tarjeta ocurrida en o antes de `today`.
 * Itera hasta 3 meses hacia atrás para cubrir tarjetas con cutDay tardío
 * en el mes previo (cutDay=31 + mes de 30 días → corte cae en el mes -2).
 *
 * Se considera "en o antes" (`<=`) para que cuando `today` coincide
 * exactamente con el cutDay, el corte de hoy cuente como el ciclo
 * vigente (el usuario acaba de entrar al nuevo ciclo de pago).
 */
function lastCutDateOnOrBefore(card: Card, today: Date): Date {
  if (card.cardType === "debit") {
    throw new Error(
      "lastCutDateOnOrBefore no aplica a tarjetas de débito (no tienen ciclo de corte/pago)",
    );
  }
  const cutDay = card.cutDay as number;
  const y = today.getUTCFullYear();
  const m = today.getUTCMonth() + 1;
  for (let offset = 0; offset <= 2; offset += 1) {
    const candidate = addMonths(y, m, -offset);
    const clamped = clampDay(cutDay, candidate.year, candidate.month);
    const dt = utcDate(candidate.year, candidate.month, clamped);
    if (dt.getTime() <= today.getTime()) return dt;
  }
  return utcDate(y, m, 1);
}

/**
 * Fecha de pago del ciclo vigente de una tarjeta de crédito: el ciclo
 * cuyo corte ya ocurrió (o está ocurriendo hoy) y cuyo pago es la
 * obligación inmediata del usuario.
 *
 * El día del corte NO se cuenta: el día siguiente es el día 1 del
 * periodo de pago. La operación es:
 *
 *   paymentDate = lastCutDate + daysToPayAfterCut días
 *
 * Ejemplo: cutDay=13 y daysToPayAfterCut=20.
 * 14 jul es el día 1 y el día 20 cae el 2 ago.
 *
 * Es la fecha que el dashboard muestra como "fecha límite de pago" en la
 * tarjeta de presupuesto, porque refleja la obligación vigente — no la
 * del ciclo siguiente. Usar la convención "próximo corte + N días"
 * mostraba fechas ~1 mes adelante de la realidad.
 *
 * Aplica SOLO a tarjetas de crédito. Las tarjetas de débito no tienen
 * ciclo de corte/pago: el caller debe filtrarlas antes de invocar.
 */
export function computeActivePaymentDate(card: Card, today: Date): Date {
  if (card.cardType === "debit") {
    throw new Error(
      "computeActivePaymentDate no aplica a tarjetas de débito (no tienen ciclo de corte/pago)",
    );
  }
  // A partir de acá asumimos credit. Zod valida estos campos como requeridos
  // para credit en el superRefine, así que los `!` son seguros.
  const daysToPayAfterCut = card.daysToPayAfterCut as number;
  const lastCut = lastCutDateOnOrBefore(card, today);

  // paymentDate = lastCut + daysToPayAfterCut días, sin addMonths y sin
  // lógica de día-del-mes. JS Date.setUTCDate hace el overflow correctamente
  // (ej.: 25 jul + 15 días → 9 ago).
  const paymentDate = new Date(lastCut);
  paymentDate.setUTCDate(paymentDate.getUTCDate() + daysToPayAfterCut);

  return paymentDate;
}
