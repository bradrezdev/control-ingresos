import type { Card } from '@/db/schemas/card';
import { subMonths } from 'date-fns';

const MONTHS_ES = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
] as const;

/** "5 de julio" — interprets the date in UTC (not local TZ) to keep
 *  the user's mental model stable across timezones. */
function formatSpanishDateUtc(d: Date): string {
  const day = d.getUTCDate();
  const month = MONTHS_ES[d.getUTCMonth()] ?? '';
  return `${day} de ${month}`;
}

export interface CutCycleInfo {
  daysUntilCut: number;
  daysUntilPayment: number;
  cycleLengthDays: number;
  cutDate: Date;
  paymentDate: Date;
}

export interface BestCardResult {
  card: Card;
  cycleLengthDays: number;
  rationale: string;
}

export interface UpcomingCut {
  card: Card;
  daysUntilCut: number;
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
 * Última fecha de corte que ocurrió estrictamente ANTES de `today`. Itera
 * hasta 3 meses hacia atrás para cubrir tarjetas con cutDay tardío en el
 * mes previo (cutDay=31 + mes de 30 días → corte cae en el mes -2).
 */
function previousCutDate(card: Card, today: Date): Date {
  const y = today.getUTCFullYear();
  const m = today.getUTCMonth() + 1;
  for (let offset = 0; offset <= 2; offset += 1) {
    const candidate = addMonths(y, m, -offset);
    const clamped = clampDay(card.cutDay, candidate.year, candidate.month);
    const dt = utcDate(candidate.year, candidate.month, clamped);
    if (dt.getTime() < today.getTime()) return dt;
  }
  return utcDate(y, m, 1);
}

/**
 * Calcula el próximo ciclo de corte y pago de una tarjeta (modelo v2):
 *   - `cutDate` = próxima ocurrencia de `cutDay` >= hoy
 *   - `paymentDate` = cutDate + `daysToPayAfterCut` días
 *   - `cycleLengthDays` === `daysToPayAfterCut` (constante por tarjeta)
 */
export function computeCutCycle(card: Card, today: Date): CutCycleInfo {
  const todayUtc = utcDate(
    today.getUTCFullYear(),
    today.getUTCMonth() + 1,
    today.getUTCDate(),
  );

  const y = todayUtc.getUTCFullYear();
  const m = todayUtc.getUTCMonth() + 1;
  const d = todayUtc.getUTCDate();

  const baseYear = d >= card.cutDay ? addMonths(y, m, 1).year : y;
  const baseMonth = d >= card.cutDay ? addMonths(y, m, 1).month : m;

  const clampedCut = clampDay(card.cutDay, baseYear, baseMonth);
  const cutDate = utcDate(baseYear, baseMonth, clampedCut);

  // paymentDate = cutDate + daysToPayAfterCut días, sin addMonths y sin
  // lógica de día-del-mes. JS Date.setUTCDate hace el overflow correctamente.
  const paymentDate = new Date(cutDate);
  paymentDate.setUTCDate(paymentDate.getUTCDate() + card.daysToPayAfterCut);

  const daysUntilCut = diffDays(todayUtc, cutDate);
  const daysUntilPayment = diffDays(todayUtc, paymentDate);
  const cycleLengthDays = card.daysToPayAfterCut;

  return {
    daysUntilCut,
    daysUntilPayment,
    cycleLengthDays,
    cutDate,
    paymentDate,
  };
}

/**
 * Devuelve la tarjeta con el ciclo de financiamiento más largo (mejor para
 * comprar hoy). Si hay empate, gana la de mayor `priority` numérico. Si no hay
 * tarjetas, devuelve null.
 *
 * El rationale es HONESTO: refleja los días reales desde el último corte
 * y la fecha exacta del próximo pago. No es un string fijo.
 */
export function computeBestCardToUseToday(
  cards: Card[],
  today: Date,
): BestCardResult | null {
  if (cards.length === 0) return null;

  let best: { card: Card; cycle: number; priority: number } | null = null;
  for (const card of cards) {
    const cycle = computeCutCycle(card, today);
    const priority = card.priority;
    if (
      best === null ||
      cycle.cycleLengthDays > best.cycle ||
      (cycle.cycleLengthDays === best.cycle && priority > best.priority)
    ) {
      best = { card, cycle: cycle.cycleLengthDays, priority };
    }
  }

  if (!best) return null;

  // "Próximo pago" se refiere al pago asociado al PRÓXIMO corte (no al
  // corte anterior). Si el usuario compra hoy, su compra entra en el
  // próximo ciclo de pago, que es lo que le importa para decidir la tarjeta.
  const cycle = computeCutCycle(best.card, today);
  const previous = previousCutDate(best.card, today);
  // Diff en días calendario (UTC-midnight → UTC-midnight) para evitar
  // el drift de 12h que produce Math.round((t1 - t2) / 86_400_000).
  const todayMid = Date.UTC(
    today.getUTCFullYear(),
    today.getUTCMonth(),
    today.getUTCDate(),
  );
  const previousMid = Date.UTC(
    previous.getUTCFullYear(),
    previous.getUTCMonth(),
    previous.getUTCDate(),
  );
  const daysSinceLastCut = Math.max(
    0,
    Math.round((todayMid - previousMid) / 86_400_000),
  );
  const daysUntilPayment = Math.max(0, cycle.daysUntilPayment);
  const daysLabel = daysSinceLastCut === 1 ? 'día' : 'días';
  const daysPaymentLabel = daysUntilPayment === 1 ? 'día' : 'días';
  // Render del "próximo pago" en UTC explícito: las fechas en este
  // dominio son date-only (no instantes), y un usuario en UTC-6 no
  // debe ver "4 de julio" cuando el corte es el 5 jul UTC.
  const formattedPayment = formatSpanishDateUtc(cycle.paymentDate);
  const rationale =
    `Tu tarjeta ${best.card.bank} cortó hace ${daysSinceLastCut} ${daysLabel}. ` +
    `Tu próximo pago es el ${formattedPayment}. ` +
    `Tenés ${daysUntilPayment} ${daysPaymentLabel} para pagar.`;

  return {
    card: best.card,
    cycleLengthDays: best.cycle,
    rationale,
  };
}

/**
 * Smart Shopper: alerta si alguna tarjeta está a <= `withinDays` días de
 * cortar (conviene esperar para que la compra caiga en el siguiente ciclo).
 * Devuelve la tarjeta con el corte más inminente o null si no hay ninguna.
 */
export function findUpcomingConvenientCut(
  cards: Card[],
  today: Date,
  withinDays: number = 2,
): UpcomingCut | null {
  let soonest: UpcomingCut | null = null;
  for (const card of cards) {
    const cycle = computeCutCycle(card, today);
    if (cycle.daysUntilCut > withinDays) continue;
    if (soonest === null || cycle.daysUntilCut < soonest.daysUntilCut) {
      soonest = { card, daysUntilCut: cycle.daysUntilCut };
    }
  }
  return soonest;
}

// Mantener import vivo aunque no se use directamente (compat con tests que
// re-importan desde este módulo y futuros consumidores).
void subMonths;
