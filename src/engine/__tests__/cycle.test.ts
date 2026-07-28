import { describe, it, expect } from 'vitest';
import { computeCutCycle } from '../cycle';
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
    cardType: 'credit',
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
