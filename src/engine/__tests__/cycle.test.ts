import { describe, it, expect } from 'vitest';
import { computeActivePaymentDate } from '../cycle';
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

describe('computeActivePaymentDate (last-cut based)', () => {
  it('hoy después del cutDay → pago del ciclo vigente (último corte fue este mes)', () => {
    // hoy 27 jul, cutDay 15 → último corte = 15 jul, +20 → 4 ago
    const jul27 = new Date('2026-07-27T12:00:00Z');
    const card = makeCard({ cutDay: 15, daysToPayAfterCut: 20 });
    const pay = computeActivePaymentDate(card, jul27);
    expect(pay.getUTCMonth() + 1).toBe(8);
    expect(pay.getUTCDate()).toBe(4);
  });

  it('hoy antes del cutDay → pago del ciclo previo (último corte fue el mes pasado)', () => {
    // hoy 4 jun, cutDay 15 → último corte = 15 may, +20 → 4 jun
    const card = makeCard({ cutDay: 15, daysToPayAfterCut: 20 });
    const pay = computeActivePaymentDate(card, today);
    expect(pay.getUTCMonth() + 1).toBe(6);
    expect(pay.getUTCDate()).toBe(4);
  });

  it('hoy == cutDay → pago del ciclo que empieza hoy', () => {
    // hoy 15 jun == cutDay 15 → último corte = 15 jun, +20 → 5 jul
    const jun15 = new Date('2026-06-15T12:00:00Z');
    const card = makeCard({ cutDay: 15, daysToPayAfterCut: 20 });
    const pay = computeActivePaymentDate(card, jun15);
    expect(pay.getUTCMonth() + 1).toBe(7);
    expect(pay.getUTCDate()).toBe(5);
  });

  it('cutDay 31 en mes de 30 días → clampa al último día', () => {
    // hoy 15 jun, cutDay 31 → último corte fue 31 may, +10 → 10 jun
    const card = makeCard({ cutDay: 31, daysToPayAfterCut: 10 });
    const pay = computeActivePaymentDate(card, today);
    expect(pay.getUTCMonth() + 1).toBe(6);
    expect(pay.getUTCDate()).toBe(10);
  });

  it('cutDay 31 en febrero → clampa a 28 y el pago cae en marzo', () => {
    // hoy 15 mar, cutDay 31 → último corte fue 28 feb, +10 → 10 mar
    const mar15 = new Date('2026-03-15T12:00:00Z');
    const card = makeCard({ cutDay: 31, daysToPayAfterCut: 10 });
    const pay = computeActivePaymentDate(card, mar15);
    expect(pay.getUTCMonth() + 1).toBe(3);
    expect(pay.getUTCDate()).toBe(10);
  });

  it('daysToPayAfterCut largo cruza fin de mes → JS Date overflow correcto', () => {
    // hoy 27 jul, cutDay 25, daysToPayAfterCut 15 → último corte = 25 jul, +15 → 9 ago
    const jul27 = new Date('2026-07-27T12:00:00Z');
    const card = makeCard({ cutDay: 25, daysToPayAfterCut: 15 });
    const pay = computeActivePaymentDate(card, jul27);
    expect(pay.getUTCMonth() + 1).toBe(8);
    expect(pay.getUTCDate()).toBe(9);
  });

  it('lanza error si la tarjeta es de débito', () => {
    const card = makeCard({ cardType: 'debit' });
    expect(() => computeActivePaymentDate(card, today)).toThrow(/débito/);
  });

  it('caso usuario: hoy 27 jul, Stori cutDay=15 daysToPayAfterCut=20 → 4 ago', () => {
    const jul27 = new Date('2026-07-27T12:00:00Z');
    const stori = makeCard({ bank: 'Stori', cutDay: 15, daysToPayAfterCut: 20 });
    const pay = computeActivePaymentDate(stori, jul27);
    expect(pay.getUTCFullYear()).toBe(2026);
    expect(pay.getUTCMonth() + 1).toBe(8);
    expect(pay.getUTCDate()).toBe(4);
  });
});
