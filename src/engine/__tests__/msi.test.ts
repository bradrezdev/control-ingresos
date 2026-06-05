import { describe, it, expect } from 'vitest';
import {
  getMsiMonthlyAmount,
  computeMsiSchedule,
  getActiveMsiForCurrentMonth,
} from '../msi';
import type { MsiExpense, Transaction } from '@/db/schemas/transaction';

const today = new Date('2026-06-04T12:00:00Z');

function makeMsi(overrides: Partial<MsiExpense> = {}): MsiExpense {
  return {
    id: '11111111-1111-4111-8111-111111111111',
    type: 'expense_msi',
    amount: 1200,
    currency: 'MXN',
    description: 'Laptop MSI',
    date: '2026-05-15T10:00:00.000Z',
    paymentMethod: 'credit',
    cardId: '22222222-2222-4222-8222-222222222222',
    msiMonths: 12,
    msiStartDate: '2026-05-15T10:00:00.000Z',
    ...overrides,
  } as MsiExpense;
}

describe('getMsiMonthlyAmount', () => {
  it('prorratea exactamente cuando amount es divisible', () => {
    expect(getMsiMonthlyAmount(1200, 12)).toBe(100);
  });

  it('redondea hacia arriba al centavo para no perder precisión', () => {
    // 1000 / 3 = 333.333... → 333.34
    expect(getMsiMonthlyAmount(1000, 3)).toBe(333.34);
  });

  it('maneja 18 meses', () => {
    // 1800 / 18 = 100 exacto
    expect(getMsiMonthlyAmount(1800, 18)).toBe(100);
  });

  it('maneja 24 meses', () => {
    // 2400 / 24 = 100 exacto
    expect(getMsiMonthlyAmount(2400, 24)).toBe(100);
  });

  it('devuelve 0 si el monto es 0', () => {
    expect(getMsiMonthlyAmount(0, 12)).toBe(0);
  });

  it('devuelve el monto si months es 0 (caso patológico)', () => {
    // 0 meses no debería ocurrir (Zod lo bloquea) pero defendemos el motor.
    expect(getMsiMonthlyAmount(100, 0 as never)).toBe(100);
  });
});

describe('computeMsiSchedule', () => {
  it('genera N entradas empezando el mes siguiente a msiStartDate', () => {
    // amount=1000/3=333.33... → redondeado a 333.34
    const tx = makeMsi({ amount: 1000, msiMonths: 3, msiStartDate: '2026-05-15T10:00:00.000Z' });
    const schedule = computeMsiSchedule(tx, today);
    expect(schedule).toHaveLength(3);
    expect(schedule[0]).toEqual({ year: 2026, month: 6, amount: 333.34 });
    expect(schedule[1]).toEqual({ year: 2026, month: 7, amount: 333.34 });
    expect(schedule[2]).toEqual({ year: 2026, month: 8, amount: 333.34 });
  });

  it('atraviesa fin de año correctamente (diciembre → enero)', () => {
    const tx = makeMsi({ msiMonths: 3, msiStartDate: '2026-11-10T10:00:00.000Z' });
    const schedule = computeMsiSchedule(tx, today);
    expect(schedule.map((e) => `${e.year}-${e.month}`)).toEqual([
      '2026-12',
      '2027-1',
      '2027-2',
    ]);
  });

  it('genera 24 entradas para MSI a 24 meses', () => {
    const tx = makeMsi({ msiMonths: 24, msiStartDate: '2025-01-15T10:00:00.000Z' });
    const schedule = computeMsiSchedule(tx, today);
    expect(schedule).toHaveLength(24);
    expect(schedule[0]!.year).toBe(2025);
    expect(schedule[0]!.month).toBe(2);
    expect(schedule[23]!.year).toBe(2027);
    expect(schedule[23]!.month).toBe(1);
  });

  it('el mes de inicio correcto es el siguiente al msiStartDate', () => {
    const tx = makeMsi({ msiMonths: 6, msiStartDate: '2026-01-31T10:00:00.000Z' });
    const schedule = computeMsiSchedule(tx, today);
    expect(schedule[0]).toEqual({ year: 2026, month: 2, amount: expect.any(Number) });
  });
});

describe('getActiveMsiForCurrentMonth', () => {
  it('devuelve vacío si no hay transacciones', () => {
    expect(getActiveMsiForCurrentMonth([], today)).toEqual([]);
  });

  it('ignora ingresos y gastos directos', () => {
    const txs: Transaction[] = [
      {
        id: 'a',
        type: 'income',
        amount: 1000,
        currency: 'MXN',
        description: 'Salario',
        date: '2026-06-01T00:00:00.000Z',
        paymentMethod: 'transfer',
      } as Transaction,
      {
        id: 'b',
        type: 'expense',
        amount: 200,
        currency: 'MXN',
        description: 'Comida',
        date: '2026-06-03T00:00:00.000Z',
        paymentMethod: 'cash',
      } as Transaction,
    ];
    expect(getActiveMsiForCurrentMonth(txs, today)).toEqual([]);
  });

  it('detecta MSI cuya cuota cae en el mes actual', () => {
    // MSI empezó en mayo, hoy es junio → junio es la 1ª cuota
    const tx = makeMsi({ msiMonths: 12, msiStartDate: '2026-05-15T10:00:00.000Z' });
    const result = getActiveMsiForCurrentMonth([tx], today);
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      cardId: tx.cardId,
      amount: 1200,
      monthsTotal: 12,
      monthIndex: 1,
    });
  });

  it('no incluye MSI que ya terminaron', () => {
    const tx = makeMsi({ msiMonths: 3, msiStartDate: '2025-01-15T10:00:00.000Z' });
    const result = getActiveMsiForCurrentMonth([tx], today);
    expect(result).toEqual([]);
  });

  it('no incluye MSI que aún no inician', () => {
    const tx = makeMsi({ msiMonths: 6, msiStartDate: '2026-07-15T10:00:00.000Z' });
    const result = getActiveMsiForCurrentMonth([tx], today);
    expect(result).toEqual([]);
  });
});
