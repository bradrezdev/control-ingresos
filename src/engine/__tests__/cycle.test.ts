import { describe, it, expect } from 'vitest';
import {
  computeCutCycle,
  computeBestCardToUseToday,
  findUpcomingConvenientCut,
} from '../cycle';
import type { Card } from '@/db/schemas/card';

const today = new Date('2026-06-04T12:00:00Z');

function makeCard(overrides: Partial<Card> = {}): Card {
  return {
    id: '11111111-1111-4111-8111-111111111111',
    bank: 'BBVA',
    holderName: 'Bryan N',
    last4: '1234',
    cutDay: 15,
    paymentDueDay: 5,
    priority: 0,
    createdAt: '2025-01-01T00:00:00.000Z',
    updatedAt: '2025-01-01T00:00:00.000Z',
    ...overrides,
  };
}

describe('computeCutCycle', () => {
  it('cutDay futuro este mes → próximo corte este mes', () => {
    // hoy 4 jun, cutDay 15 → próximo corte = 15 jun (mismo mes)
    const card = makeCard({ cutDay: 15, paymentDueDay: 5 });
    const cycle = computeCutCycle(card, today);
    expect(cycle.cutDate.getUTCMonth() + 1).toBe(6);
    expect(cycle.cutDate.getUTCDate()).toBe(15);
    expect(cycle.daysUntilCut).toBe(11);
  });

  it('cutDay ya pasado este mes → próximo corte mes siguiente', () => {
    // hoy 4 jun, cutDay 1 → próximo corte = 1 jul
    const card = makeCard({ cutDay: 1, paymentDueDay: 20 });
    const cycle = computeCutCycle(card, today);
    expect(cycle.cutDate.getUTCMonth() + 1).toBe(7);
    expect(cycle.cutDate.getUTCDate()).toBe(1);
  });

  it('cutDay hoy → próximo corte es el ciclo siguiente (~30 días)', () => {
    // hoy 4 jun, cutDay 4 → el corte de hoy ya pasó, el próximo es en ~30 días
    const card = makeCard({ cutDay: 4, paymentDueDay: 25 });
    const cycle = computeCutCycle(card, today);
    expect(cycle.daysUntilCut).toBe(30);
    expect(cycle.cutDate.getUTCMonth() + 1).toBe(7);
    expect(cycle.cutDate.getUTCDate()).toBe(4);
  });

  it('cutDay 31 en febrero se clampa a 28', () => {
    // 4 feb 2026 (no bisiesto) cutDay 31 → 28 feb
    const feb4 = new Date('2026-02-04T12:00:00Z');
    const card = makeCard({ cutDay: 31, paymentDueDay: 10 });
    const cycle = computeCutCycle(card, feb4);
    expect(cycle.cutDate.getUTCMonth() + 1).toBe(2);
    expect(cycle.cutDate.getUTCDate()).toBe(28);
  });

  it('cutDay 31 en febrero bisiesto se clampa a 29', () => {
    const feb4_2028 = new Date('2028-02-04T12:00:00Z');
    const card = makeCard({ cutDay: 31, paymentDueDay: 10 });
    const cycle = computeCutCycle(card, feb4_2028);
    expect(cycle.cutDate.getUTCMonth() + 1).toBe(2);
    expect(cycle.cutDate.getUTCDate()).toBe(29);
  });

  it('paymentDueDay < cutDay → pago cae en mes siguiente al corte', () => {
    // cut 15 jun, payment 5 jun → pago = 5 jul
    const card = makeCard({ cutDay: 15, paymentDueDay: 5 });
    const cycle = computeCutCycle(card, today);
    expect(cycle.cutDate.getUTCMonth() + 1).toBe(6);
    expect(cycle.paymentDate.getUTCMonth() + 1).toBe(7);
    expect(cycle.cycleLengthDays).toBe(20);
  });

  it('paymentDueDay > cutDay → pago cae en mismo mes que el corte', () => {
    // cut 5 jun, payment 25 jun → pago = 25 jun
    const card = makeCard({ cutDay: 5, paymentDueDay: 25 });
    const cycle = computeCutCycle(card, today);
    expect(cycle.cutDate.getUTCMonth() + 1).toBe(6);
    expect(cycle.cutDate.getUTCDate()).toBe(5);
    expect(cycle.paymentDate.getUTCMonth() + 1).toBe(6);
    expect(cycle.paymentDate.getUTCDate()).toBe(25);
    expect(cycle.cycleLengthDays).toBe(20);
  });

  it('atraviesa fin de año: cut en diciembre, payment en enero', () => {
    const dec = new Date('2026-12-04T12:00:00Z');
    const card = makeCard({ cutDay: 15, paymentDueDay: 5 });
    const cycle = computeCutCycle(card, dec);
    expect(cycle.cutDate.getUTCMonth() + 1).toBe(12);
    expect(cycle.cutDate.getUTCFullYear()).toBe(2026);
    expect(cycle.paymentDate.getUTCMonth() + 1).toBe(1);
    expect(cycle.paymentDate.getUTCFullYear()).toBe(2027);
  });
});

describe('computeBestCardToUseToday', () => {
  it('devuelve null si no hay tarjetas', () => {
    expect(computeBestCardToUseToday([], today)).toBeNull();
  });

  it('elige la tarjeta con mayor cycleLengthDays', () => {
    const short = makeCard({ id: 'a', last4: '1111', cutDay: 5, paymentDueDay: 25, priority: 0 });
    const long = makeCard({ id: 'b', last4: '2222', cutDay: 1, paymentDueDay: 28, priority: 0 });
    const best = computeBestCardToUseToday([short, long], today);
    expect(best).not.toBeNull();
    expect(best!.card.id).toBe('b');
    expect(best!.cycleLengthDays).toBe(27);
  });

  it('en empate gana la tarjeta con mayor priority', () => {
    const a = makeCard({ id: 'a', last4: '1111', cutDay: 5, paymentDueDay: 25, priority: 0 });
    const b = makeCard({ id: 'b', last4: '2222', cutDay: 5, paymentDueDay: 25, priority: 5 });
    const best = computeBestCardToUseToday([a, b], today);
    expect(best!.card.id).toBe('b');
  });

  it('incluye rationale en español', () => {
    const card = makeCard({ bank: 'Banamex', last4: '9999' });
    const best = computeBestCardToUseToday([card], today);
    expect(best!.rationale).toContain('Banamex');
    expect(best!.rationale).toContain('9999');
  });
});

describe('findUpcomingConvenientCut', () => {
  it('devuelve null si no hay tarjetas', () => {
    expect(findUpcomingConvenientCut([], today)).toBeNull();
  });

  it('devuelve la tarjeta con el corte más inminente dentro de la ventana', () => {
    // hoy 4 jun; card A corta en 3 días (7 jun), card B corta en 1 día (5 jun)
    const a = makeCard({ id: 'a', cutDay: 7, paymentDueDay: 27 });
    const b = makeCard({ id: 'b', cutDay: 5, paymentDueDay: 25 });
    const result = findUpcomingConvenientCut([a, b], today, 2);
    expect(result).not.toBeNull();
    expect(result!.card.id).toBe('b');
    expect(result!.daysUntilCut).toBe(1);
  });

  it('ignora tarjetas cuyo corte está fuera de la ventana', () => {
    const a = makeCard({ id: 'a', cutDay: 20, paymentDueDay: 10 });
    expect(findUpcomingConvenientCut([a], today, 2)).toBeNull();
  });

  it('acepta ventana personalizada (withinDays)', () => {
    const a = makeCard({ id: 'a', cutDay: 10, paymentDueDay: 30 });
    // 6 días de distancia, dentro de ventana de 7 pero no de 2
    expect(findUpcomingConvenientCut([a], today, 2)).toBeNull();
    expect(findUpcomingConvenientCut([a], today, 7)).not.toBeNull();
  });
});
