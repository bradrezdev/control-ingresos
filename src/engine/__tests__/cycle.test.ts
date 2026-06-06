import { describe, it, expect } from 'vitest';
import {
  computeCutCycle,
  computeBestCardToUseToday,
  findUpcomingConvenientCut,
} from '../cycle';
import type { Card } from '@/db/schemas/card';

const today = new Date('2026-06-04T12:00:00Z');

/**
 * Engine operates on `daysToPayAfterCut` (constant per card) starting
 * from v2 (see AD-2). `last4` is no longer on the Card type.
 */
function makeCard(overrides: Partial<Card> = {}): Card {
  return {
    id: '11111111-1111-4111-8111-111111111111',
    bank: 'BBVA',
    holderName: 'Bryan N',
    cutDay: 15,
    daysToPayAfterCut: 20,
    priority: 0,
    createdAt: '2025-01-01T00:00:00.000Z',
    updatedAt: '2025-01-01T00:00:00.000Z',
    ...overrides,
  };
}

describe('computeCutCycle (daysToPayAfterCut model)', () => {
  it('paymentDate = cutDate + daysToPayAfterCut days', () => {
    // hoy 4 jun, cutDay 15 → cutDate=15 jun, daysToPayAfterCut=20 → paymentDate=5 jul
    const card = makeCard({ cutDay: 15, daysToPayAfterCut: 20 });
    const cycle = computeCutCycle(card, today);
    expect(cycle.cutDate.getUTCMonth() + 1).toBe(6);
    expect(cycle.cutDate.getUTCDate()).toBe(15);
    expect(cycle.paymentDate.getUTCMonth() + 1).toBe(7);
    expect(cycle.paymentDate.getUTCDate()).toBe(5);
    expect(cycle.cycleLengthDays).toBe(20);
  });

  it('cutDay futuro este mes → próximo corte este mes', () => {
    // hoy 4 jun, cutDay 15 → próximo corte = 15 jun (mismo mes)
    const card = makeCard({ cutDay: 15, daysToPayAfterCut: 20 });
    const cycle = computeCutCycle(card, today);
    expect(cycle.cutDate.getUTCMonth() + 1).toBe(6);
    expect(cycle.cutDate.getUTCDate()).toBe(15);
    expect(cycle.daysUntilCut).toBe(11);
  });

  it('cutDay ya pasado este mes → próximo corte mes siguiente', () => {
    // hoy 4 jun, cutDay 1 → próximo corte = 1 jul
    const card = makeCard({ cutDay: 1, daysToPayAfterCut: 25 });
    const cycle = computeCutCycle(card, today);
    expect(cycle.cutDate.getUTCMonth() + 1).toBe(7);
    expect(cycle.cutDate.getUTCDate()).toBe(1);
  });

  it('cutDay hoy → próximo corte es el ciclo siguiente (~30 días)', () => {
    // hoy 4 jun, cutDay 4 → el corte de hoy ya pasó, el próximo es en ~30 días
    const card = makeCard({ cutDay: 4, daysToPayAfterCut: 25 });
    const cycle = computeCutCycle(card, today);
    expect(cycle.daysUntilCut).toBe(30);
    expect(cycle.cutDate.getUTCMonth() + 1).toBe(7);
    expect(cycle.cutDate.getUTCDate()).toBe(4);
  });

  it('cutDay 31 en febrero se clampa a 28', () => {
    // 4 feb 2026 (no bisiesto) cutDay 31 → 28 feb
    const feb4 = new Date('2026-02-04T12:00:00Z');
    const card = makeCard({ cutDay: 31, daysToPayAfterCut: 10 });
    const cycle = computeCutCycle(card, feb4);
    expect(cycle.cutDate.getUTCMonth() + 1).toBe(2);
    expect(cycle.cutDate.getUTCDate()).toBe(28);
  });

  it('cycleLengthDays === daysToPayAfterCut (constante por tarjeta)', () => {
    const a = makeCard({ cutDay: 5, daysToPayAfterCut: 15 });
    const b = makeCard({ cutDay: 27, daysToPayAfterCut: 30 });
    expect(computeCutCycle(a, today).cycleLengthDays).toBe(15);
    expect(computeCutCycle(b, today).cycleLengthDays).toBe(30);
  });

  it('paymentDate usa daysToPayAfterCut directo (no addMonths, no día-del-mes)', () => {
    // cut 15 jun + 20 days = 5 jul
    const card = makeCard({ cutDay: 15, daysToPayAfterCut: 20 });
    const cycle = computeCutCycle(card, today);
    const cut = cycle.cutDate;
    const pay = cycle.paymentDate;
    const diffMs = pay.getTime() - cut.getTime();
    expect(Math.round(diffMs / 86_400_000)).toBe(20);
  });
});

describe('computeBestCardToUseToday', () => {
  it('devuelve null si no hay tarjetas', () => {
    expect(computeBestCardToUseToday([], today)).toBeNull();
  });

  it('elige la tarjeta con mayor cycleLengthDays (mayor daysToPayAfterCut)', () => {
    const short = makeCard({ id: 'a', cutDay: 5, daysToPayAfterCut: 15, priority: 0 });
    const long = makeCard({ id: 'b', cutDay: 1, daysToPayAfterCut: 28, priority: 0 });
    const best = computeBestCardToUseToday([short, long], today);
    expect(best).not.toBeNull();
    expect(best!.card.id).toBe('b');
    expect(best!.cycleLengthDays).toBe(28);
  });

  it('en empate gana la tarjeta con mayor priority', () => {
    const a = makeCard({ id: 'a', cutDay: 5, daysToPayAfterCut: 15, priority: 0 });
    const b = makeCard({ id: 'b', cutDay: 5, daysToPayAfterCut: 15, priority: 5 });
    const best = computeBestCardToUseToday([a, b], today);
    expect(best!.card.id).toBe('b');
  });

  it('rationale NO contiene el literal "cortó hace poco" (ya no es un string fijo)', () => {
    const card = makeCard({ bank: 'Banamex' });
    const best = computeBestCardToUseToday([card], today);
    expect(best!.rationale).not.toContain('cortó hace poco');
  });

  it('rationale refleja días reales desde el último corte', () => {
    // hoy 4 jun, cutDay=15 → último corte fue 15 may (hace 20 días)
    const card = makeCard({ bank: 'BBVA', cutDay: 15, daysToPayAfterCut: 20 });
    const best = computeBestCardToUseToday([card], today);
    expect(best!.rationale).toMatch(/hace 20 días/);
  });

  it('rationale incluye la fecha real del próximo pago', () => {
    // cutDay=15, daysToPayAfterCut=20 → cut 15 jun, pay 5 jul
    const card = makeCard({ bank: 'BBVA', cutDay: 15, daysToPayAfterCut: 20 });
    const best = computeBestCardToUseToday([card], today);
    expect(best!.rationale).toMatch(/5 de julio/);
  });

  it('rationale incluye el banco', () => {
    const card = makeCard({ bank: 'Banamex' });
    const best = computeBestCardToUseToday([card], today);
    expect(best!.rationale).toContain('Banamex');
  });
});

describe('findUpcomingConvenientCut', () => {
  it('devuelve null si no hay tarjetas', () => {
    expect(findUpcomingConvenientCut([], today)).toBeNull();
  });

  it('devuelve la tarjeta con el corte más inminente dentro de la ventana', () => {
    // hoy 4 jun; card A corta en 3 días (7 jun), card B corta en 1 día (5 jun)
    const a = makeCard({ id: 'a', cutDay: 7, daysToPayAfterCut: 20 });
    const b = makeCard({ id: 'b', cutDay: 5, daysToPayAfterCut: 20 });
    const result = findUpcomingConvenientCut([a, b], today, 2);
    expect(result).not.toBeNull();
    expect(result!.card.id).toBe('b');
    expect(result!.daysUntilCut).toBe(1);
  });

  it('ignora tarjetas cuyo corte está fuera de la ventana', () => {
    const a = makeCard({ id: 'a', cutDay: 20, daysToPayAfterCut: 10 });
    expect(findUpcomingConvenientCut([a], today, 2)).toBeNull();
  });

  it('acepta ventana personalizada (withinDays)', () => {
    const a = makeCard({ id: 'a', cutDay: 10, daysToPayAfterCut: 20 });
    // 6 días de distancia, dentro de ventana de 7 pero no de 2
    expect(findUpcomingConvenientCut([a], today, 2)).toBeNull();
    expect(findUpcomingConvenientCut([a], today, 7)).not.toBeNull();
  });
});
