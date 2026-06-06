import { describe, it, expect } from 'vitest';
import {
  computeMonthlySpending,
  computeBudgetStatus,
  computePaymentForCurrentMonth,
  computeFixedPaymentsForMonth,
} from '../budget';
import type { Transaction } from '@/db/schemas/transaction';
import type { FixedPayment } from '@/db/schemas/fixedPayment';

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
  it('safe cuando el uso es < 80%', () => {
    const status = computeBudgetStatus(500, 1000);
    expect(status.percent).toBe(50);
    expect(status.status).toBe('safe');
  });

  it('safe cuando el uso es 79% (justo debajo del umbral de warning)', () => {
    expect(computeBudgetStatus(790, 1000).status).toBe('safe');
  });

  it('warning cuando el uso es 80% (umbral explícito per spec del usuario)', () => {
    expect(computeBudgetStatus(800, 1000).status).toBe('warning');
  });

  it('warning cuando el uso está entre 80% y 99%', () => {
    expect(computeBudgetStatus(850, 1000).status).toBe('warning');
    expect(computeBudgetStatus(999, 1000).status).toBe('warning');
  });

  it('warning cuando el uso es exactamente 99% (justo debajo del 100%)', () => {
    // 990 / 1000 = 99 → todavía warning, no danger
    expect(computeBudgetStatus(990, 1000).status).toBe('warning');
  });

  it('danger cuando el uso es 100% (exacto)', () => {
    expect(computeBudgetStatus(1000, 1000).status).toBe('danger');
  });

  it('danger cuando el uso es > 100% (excedió el límite)', () => {
    expect(computeBudgetStatus(1100, 1000).status).toBe('danger');
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
    // MSI: started May, today June → monthsSinceStart=1, cuota 2 = 1200/12 = 100
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

  // R-7 (bug 7-A): el gate original `< 1 || > msiMonths` saltaba la
  // primera cuota. MSI que empezó este mes debe contar la cuota 1.
  it('R-7-A: MSI que empezó este mes cuenta la cuota 1 en computeMonthlySpending', () => {
    const txs: Transaction[] = [
      {
        id: crypto.randomUUID(),
        type: 'expense_msi',
        amount: 1200,
        currency: 'MXN',
        description: 'MSI mismo mes',
        date: '2026-06-01T00:00:00.000Z',
        paymentMethod: 'credit',
        cardId: 'a',
        msiMonths: 12,
        msiStartDate: '2026-06-01T00:00:00.000Z',
      } as Transaction,
    ];
    const result = computeMonthlySpending(txs, today);
    // cuota 1 = 1200/12 = 100
    expect(result.total).toBe(100);
  });

  it('R-7-A: MSI con msiStartDate anterior cuenta la cuota del mes actual', () => {
    // started mayo, today junio → monthsSinceStart=1, cuota 2
    const txs: Transaction[] = [
      {
        id: crypto.randomUUID(),
        type: 'expense_msi',
        amount: 1200,
        currency: 'MXN',
        description: 'MSI',
        date: '2026-05-15T10:00:00.000Z',
        paymentMethod: 'credit',
        cardId: 'a',
        msiMonths: 12,
        msiStartDate: '2026-05-15T10:00:00.000Z',
      } as Transaction,
    ];
    const result = computeMonthlySpending(txs, today);
    expect(result.total).toBe(100);
  });

  it('R-7-A: MSI que ya terminó (mes > msiMonths) no se cuenta', () => {
    const txs: Transaction[] = [
      {
        id: crypto.randomUUID(),
        type: 'expense_msi',
        amount: 300,
        currency: 'MXN',
        description: 'MSI terminada',
        date: '2026-01-15T10:00:00.000Z',
        paymentMethod: 'credit',
        cardId: 'a',
        msiMonths: 3,
        msiStartDate: '2026-01-15T10:00:00.000Z',
      } as Transaction,
    ];
    const result = computeMonthlySpending(txs, today);
    expect(result.total).toBe(0);
  });

  it('R-7-B: cada paymentMethod (cash, debit, credit, transfer) contribuye al budget', () => {
    const cardId = 'a';
    const txs: Transaction[] = [
      // cash gasto directo
      {
        ...makeExpense(100, 'comida', '2026-06-01T00:00:00.000Z'),
        paymentMethod: 'cash',
      } as Transaction,
      // debit gasto directo
      {
        ...makeExpense(200, 'comida', '2026-06-02T00:00:00.000Z'),
        paymentMethod: 'debit',
      } as Transaction,
      // credit gasto directo (con tarjeta)
      {
        ...makeExpense(300, 'comida', '2026-06-03T00:00:00.000Z', { cardId }),
        paymentMethod: 'credit',
      } as Transaction,
      // transfer gasto directo
      {
        ...makeExpense(400, 'comida', '2026-06-04T00:00:00.000Z'),
        paymentMethod: 'transfer',
      } as Transaction,
    ];
    const result = computeMonthlySpending(txs, today);
    expect(result.total).toBe(1000);
  });
});

function makeFixedPayment(
  amount: number,
  period: FixedPayment['period'],
  createdAt: string,
): FixedPayment {
  return {
    id: crypto.randomUUID(),
    amount,
    description: 'Test FP',
    paymentDay: 15,
    period,
    paymentMethod: 'cash',
    createdAt,
    updatedAt: createdAt,
  };
}

describe('computeFixedPaymentsForMonth', () => {
  it('lista vacía devuelve 0', () => {
    expect(computeFixedPaymentsForMonth([], today)).toBe(0);
  });

  it('un único pago monthly devuelve su amount en cents', () => {
    // Verifica explícitamente que el contrato sigue siendo cents (ADR-03).
    const fp = makeFixedPayment(1000, 'monthly', '2026-05-01T00:00:00.000Z');
    expect(computeFixedPaymentsForMonth([fp], today)).toBe(1000);
  });

  it('suma monthly + bimonthly creado este mes (monthsDiff=0, ambos true)', () => {
    const monthly = makeFixedPayment(1000, 'monthly', '2026-06-01T00:00:00.000Z');
    const bimonthly = makeFixedPayment(2500, 'bimonthly', '2026-06-01T00:00:00.000Z');
    expect(computeFixedPaymentsForMonth([monthly, bimonthly], today)).toBe(3500);
  });

  it('con monthly + bimonthly creado hace 1 mes, sólo cuenta el monthly', () => {
    // today = 2026-06, bimonthly creado en mayo → monthsDiff=1 → false
    const monthly = makeFixedPayment(1000, 'monthly', '2026-05-01T00:00:00.000Z');
    const bimonthly = makeFixedPayment(2500, 'bimonthly', '2026-05-01T00:00:00.000Z');
    expect(computeFixedPaymentsForMonth([monthly, bimonthly], today)).toBe(1000);
  });

  it('monthly + quarterly creado hace 3 meses (monthsDiff=3) → suma ambos', () => {
    // today = 2026-06, quarterly creado en marzo → monthsDiff=3 → true
    const monthly = makeFixedPayment(1000, 'monthly', '2026-03-01T00:00:00.000Z');
    const quarterly = makeFixedPayment(4000, 'quarterly', '2026-03-01T00:00:00.000Z');
    expect(computeFixedPaymentsForMonth([monthly, quarterly], today)).toBe(5000);
  });

  it('retorna cents (no pesos): amount=1000 → 1000', () => {
    const fp = makeFixedPayment(1000, 'monthly', '2026-05-15T12:00:00.000Z');
    expect(computeFixedPaymentsForMonth([fp], today)).toBe(1000);
  });
});
