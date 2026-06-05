import type { Card } from '@/db/schemas/card';

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
  // month es 1-12
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
 * Calcula el próximo ciclo de corte y pago de una tarjeta.
 *   - `cutDate` = próxima ocurrencia de `cutDay` >= hoy
 *   - `paymentDate` = primera ocurrencia de `paymentDueDay` >= cutDate
 *   - `cycleLengthDays` = días entre cutDate y paymentDate
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

  // Si el día actual >= cutDay, el próximo corte es el mes siguiente.
  const baseYear = d >= card.cutDay ? addMonths(y, m, 1).year : y;
  const baseMonth = d >= card.cutDay ? addMonths(y, m, 1).month : m;

  const clampedCut = clampDay(card.cutDay, baseYear, baseMonth);
  const cutDate = utcDate(baseYear, baseMonth, clampedCut);

  // Payment due: primer día >= cutDate que coincida con paymentDueDay.
  let payYear = baseYear;
  let payMonth = baseMonth;
  let clampedPay = clampDay(card.paymentDueDay, payYear, payMonth);
  let paymentDate = utcDate(payYear, payMonth, clampedPay);
  if (paymentDate.getTime() < cutDate.getTime()) {
    const next = addMonths(payYear, payMonth, 1);
    payYear = next.year;
    payMonth = next.month;
    clampedPay = clampDay(card.paymentDueDay, payYear, payMonth);
    paymentDate = utcDate(payYear, payMonth, clampedPay);
  }

  const daysUntilCut = diffDays(todayUtc, cutDate);
  const daysUntilPayment = diffDays(todayUtc, paymentDate);
  const cycleLengthDays = diffDays(cutDate, paymentDate);

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

  const day = best.card.cutDay.toString().padStart(2, '0');
  const month = best.card.cutDay.toString(); // solo decorativo
  void month;
  return {
    card: best.card,
    cycleLengthDays: best.cycle,
    rationale: `Tu tarjeta ${best.card.bank} (${best.card.last4}) cortó hace poco, tenés hasta el día ${day} para pagar (${best.cycle} días de financiamiento).`,
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
