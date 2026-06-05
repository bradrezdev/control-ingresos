import { describe, it, expect } from 'vitest';
import {
  computeMonthlySpending,
  computeBudgetStatus,
  computePaymentForCurrentMonth,
} from '../budget';
import type { Transaction } from '@/db/schemas/transaction';

const today = new Date('2026-06-04T12:00:00Z');

function makeExpense(
  amount: number,
  category: string | undefined,
  date: string,
  overrides: Partial<Transaction> = {},
): Transaction {
  return {
    id: crypto.randomUUID(),
    type: 'expense',
    amount,
    currency: 'MXN',
    description: 'x',
    date,
    paymentMethod: 'cash',
    category,
    ...overrides,
  } as Transaction;
}

describe('computeMonthlySpending', () => {
  it('suma sólo gastos del mes actual, no de otros meses', () => {
    const txs: Transaction[] = [
      makeExpense(100, 'comida', '2026-06-01T00:00:00.000Z'),
      makeExpense(200, 'comida', '2026-06-03T00:00:00.000Z'),
      makeExpense(500, 'comida', '2026-05-30T00:00:00.000Z'), // mes anterior
      {
        id: crypto.randomUUID(),
        type: 'income',
        amount: 1000,
        currency: 'MXN',
        description: 'salario',
        date: '2026-06-01T00:00:00.000Z',
        paymentMethod: 'transfer',
      } as Transaction,
    ];
    const result = computeMonthlySpending(txs, today);
    expect(result.total).toBe(300);
    expect(result.byCategory).toEqual({ comida: 300 });
  });

  it('agrupa correctamente por categoría', () => {
    const txs: Transaction[] = [
      makeExpense(100, 'comida', '2026-06-01T00:00:00.000Z'),
      makeExpense(200, 'transporte', '2026-06-02T00:00:00.000Z'),
      makeExpense(150, 'comida', '2026-06-03T00:00:00.000Z'),
      makeExpense(50, undefined, '2026-06-04T00:00:00.000Z'),
    ];
    const result = computeMonthlySpending(txs, today);
    expect(result.total).toBe(500);
    expect(result.byCategory).toEqual({
      comida: 250,
      transporte: 200,
      __uncategorized__: 50,
    });
  });

  it('devuelve vacío si no hay gastos', () => {
    expect(computeMonthlySpending([], today)).toEqual({ total: 0, byCategory: {} });
  });
});

describe('computeBudgetStatus', () => {
  it('safe cuando el uso es < 60%', () => {
    const status = computeBudgetStatus(500, 1000);
    expect(status.percent).toBe(50);
    expect(status.status).toBe('safe');
  });

  it('warning cuando el uso está entre 60% y 80%', () => {
    expect(computeBudgetStatus(700, 1000).status).toBe('warning');
    expect(computeBudgetStatus(800, 1000).status).toBe('warning');
  });

  it('danger cuando el uso es > 80%', () => {
    expect(computeBudgetStatus(810, 1000).status).toBe('danger');
    expect(computeBudgetStatus(1500, 1000).status).toBe('danger');
  });

  it('safe cuando monthlyLimit es 0 (no configurado)', () => {
    const status = computeBudgetStatus(1000, 0);
    expect(status.percent).toBe(0);
    expect(status.status).toBe('safe');
  });

  it('percent = 0 cuando no hay gastos', () => {
    expect(computeBudgetStatus(0, 5000).percent).toBe(0);
  });
});

describe('computePaymentForCurrentMonth', () => {
  it('suma gastos directos + MSI del mes en la tarjeta indicada', () => {
    const cardId = '11111111-1111-4111-8111-111111111111';
    const txs: Transaction[] = [
      makeExpense(100, undefined, '2026-06-01T00:00:00.000Z', { cardId }),
      makeExpense(50, undefined, '2026-06-02T00:00:00.000Z', { cardId }),
      {
        id: crypto.randomUUID(),
        type: 'expense_msi',
        amount: 1200,
        currency: 'MXN',
        description: 'MSI',
        date: '2026-05-15T10:00:00.000Z',
        paymentMethod: 'credit',
        cardId,
        msiMonths: 12,
        msiStartDate: '2026-05-15T10:00:00.000Z',
      } as Transaction,
    ];
    // directo: 100 + 50 = 150
    // MSI: 1200/12 = 100
    // total: 250
    const total = computePaymentForCurrentMonth(cardId, txs, today);
    expect(total).toBe(250);
  });

  it('ignora gastos de otras tarjetas', () => {
    const cardA = 'a';
    const cardB = 'b';
    const txs: Transaction[] = [
      makeExpense(100, undefined, '2026-06-01T00:00:00.000Z', { cardId: cardA }),
      makeExpense(999, undefined, '2026-06-01T00:00:00.000Z', { cardId: cardB }),
    ];
    expect(computePaymentForCurrentMonth(cardA, txs, today)).toBe(100);
  });

  it('ignora gastos de meses anteriores', () => {
    const cardId = 'a';
    const txs: Transaction[] = [
      makeExpense(100, undefined, '2026-05-01T00:00:00.000Z', { cardId }),
    ];
    expect(computePaymentForCurrentMonth(cardId, txs, today)).toBe(0);
  });
});
