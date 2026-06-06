import { describe, it, expect } from 'vitest';
import {
  getMsiMonthlyAmount,
  getMsiInstallmentAmount,
  computeMsiSchedule,
  getActiveMsiForCurrentMonth,
} from '../msi';
import type { MsiExpense, Transaction } from '@/db/schemas/transaction';

const today = new Date('2026-06-04T12:00:00Z');

/**
 * Engine operates in INTEGER CENTS per ADR-03. Test fixtures are scaled
 * 100× from display: $1000 → 100000, $123.45 → 12345.
 */

function makeMsi(overrides: Partial<MsiExpense> = {}): MsiExpense {
  return {
    id: '11111111-1111-4111-8111-111111111111',
    type: 'expense_msi',
    amount: 100000, // $1000.00 in cents
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

describe('getMsiMonthlyAmount (cents contract)', () => {
  it('prorratea exactamente cuando amount es divisible', () => {
    // $1200 a 12 meses → $100/mes → 10000 cents
    expect(getMsiMonthlyAmount(120000, 12)).toBe(10000);
  });

  it('plazo 1: la cuota regular es el monto total (sin división)', () => {
    // $1200 a 1 mes → $1200 cuota única
    expect(getMsiMonthlyAmount(120000, 1)).toBe(120000);
  });

  it('redondea hacia ABAJO al centavo (la última cuota absorbe el residuo)', () => {
    // $10 a 3 meses → 3.33 / 3.33 / 3.34 → 333 / 333 / 334 cents
    expect(getMsiMonthlyAmount(1000, 3)).toBe(333);
  });

  it('maneja 18 meses', () => {
    // $1800 / 18 = $100 exacto → 10000 cents
    expect(getMsiMonthlyAmount(180000, 18)).toBe(10000);
  });

  it('maneja 24 meses', () => {
    // $2400 / 24 = $100 exacto → 10000 cents
    expect(getMsiMonthlyAmount(240000, 24)).toBe(10000);
  });

  it('devuelve 0 si el monto es 0', () => {
    expect(getMsiMonthlyAmount(0, 12)).toBe(0);
  });

  it('devuelve el monto si months es 0 (caso patológico)', () => {
    // 0 meses no debería ocurrir (Zod lo bloquea) pero defendemos el motor.
    expect(getMsiMonthlyAmount(100, 0 as never)).toBe(100);
  });
});

describe('getMsiInstallmentAmount (cents contract)', () => {
  it('plazo 1: la única cuota es el monto total', () => {
    // $1200 a 1 mes → 1 sola cuota de 120000 cents
    expect(getMsiInstallmentAmount(120000, 1, 1)).toBe(120000);
  });

  it('plazo 1: monthIndex fuera de [1, 1] devuelve 0', () => {
    expect(getMsiInstallmentAmount(120000, 1, 2)).toBe(0);
    expect(getMsiInstallmentAmount(120000, 1, 0)).toBe(0);
  });

  it('devuelve la cuota regular para índices 1..N-1', () => {
    const amount = 1000; // $10
    const months = 3;
    for (let i = 1; i < months; i += 1) {
      expect(getMsiInstallmentAmount(amount, months, i)).toBe(333);
    }
  });

  it('la última cuota absorbe el residuo', () => {
    // $10 / 3 → 3 cuotas: 333, 333, 334 cents
    expect(getMsiInstallmentAmount(1000, 3, 3)).toBe(334);
  });

  it('Σ de N cuotas === amount exacto (invariante del motor, en cents)', () => {
    const cases: Array<[number, 3 | 6 | 9 | 12 | 18 | 24]> = [
      [100000, 3],
      [10000, 3],
      [99900, 6],
      [123400, 9],
      [120000, 12],
      [150000, 18],
      [240000, 24],
      [100, 3],
      [9900, 6],
    ];
    for (const [amount, months] of cases) {
      const sum = Array.from({ length: months }, (_, i) =>
        getMsiInstallmentAmount(amount, months, i + 1),
      ).reduce((a, b) => a + b, 0);
      expect(sum).toBe(amount);
    }
  });

  it('Σ preserva exactitud para montos con muchos decimales', () => {
    // Caso patológico: $10.01 / 3 → varias decimales, pero la suma debe cerrar.
    const amount = 1001;
    const months = 3;
    const sum = Array.from({ length: months }, (_, i) =>
      getMsiInstallmentAmount(amount, months, i + 1),
    ).reduce((a, b) => a + b, 0);
    expect(sum).toBe(amount);
  });

  it('devuelve 0 para monthIndex fuera de rango', () => {
    expect(getMsiInstallmentAmount(1000, 3, 0)).toBe(0);
    expect(getMsiInstallmentAmount(1000, 3, 4)).toBe(0);
    expect(getMsiInstallmentAmount(1000, 3, -1)).toBe(0);
  });

  it('devuelve 0 para monto inválido', () => {
    expect(getMsiInstallmentAmount(0, 3, 1)).toBe(0);
    expect(getMsiInstallmentAmount(-100, 3, 1)).toBe(0);
  });
});

describe('computeMsiSchedule (cents contract)', () => {
  it('plazo 1: genera 1 sola entrada con el monto total', () => {
    const tx = makeMsi({ amount: 120000, msiMonths: 1, msiStartDate: '2026-05-15T10:00:00.000Z' });
    const schedule = computeMsiSchedule(tx, today);
    expect(schedule).toHaveLength(1);
    expect(schedule[0]).toEqual({ year: 2026, month: 6, amount: 120000 });
  });

  it('genera N entradas con la última absorbiendo el residuo (Σ === amount, en cents)', () => {
    // $10 / 3 → 3.33 / 3.33 / 3.34 → 333 / 333 / 334 cents
    const tx = makeMsi({ amount: 1000, msiMonths: 3, msiStartDate: '2026-05-15T10:00:00.000Z' });
    const schedule = computeMsiSchedule(tx, today);
    expect(schedule).toHaveLength(3);
    expect(schedule[0]).toEqual({ year: 2026, month: 6, amount: 333 });
    expect(schedule[1]).toEqual({ year: 2026, month: 7, amount: 333 });
    expect(schedule[2]).toEqual({ year: 2026, month: 8, amount: 334 });
    // Invariante
    const sum = schedule.reduce((acc, e) => acc + e.amount, 0);
    expect(sum).toBe(1000);
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

  it('Σ del schedule completo === amount (invariante global, varios plazos)', () => {
    const cases: Array<[number, 3 | 6 | 9 | 12 | 18 | 24]> = [
      [100000, 3],
      [99900, 6],
      [123400, 9],
      [150000, 18],
      [777700, 24],
    ];
    for (const [amount, msiMonths] of cases) {
      const tx = makeMsi({ amount, msiMonths, msiStartDate: '2026-05-15T10:00:00.000Z' });
      const schedule = computeMsiSchedule(tx, today);
      const sum = schedule.reduce((acc, e) => acc + e.amount, 0);
      expect(sum).toBe(amount);
    }
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
      amount: 100000,
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
