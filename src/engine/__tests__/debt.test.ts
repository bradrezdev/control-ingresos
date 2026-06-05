import { describe, it, expect } from 'vitest';
import { summarizeMsiByTenure } from '../debt';
import type { MsiExpense } from '@/db/schemas/transaction';

const today = new Date('2026-06-04T12:00:00Z');

function makeMsi(overrides: Partial<MsiExpense> = {}): MsiExpense {
  return {
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
    ...overrides,
  } as MsiExpense;
}

describe('summarizeMsiByTenure', () => {
  it('devuelve contadores en cero si no hay MSI', () => {
    const result = summarizeMsiByTenure([], today);
    expect(result[3]).toEqual({ activeCount: 0, totalDebt: 0 });
    expect(result[12]).toEqual({ activeCount: 0, totalDebt: 0 });
    expect(result[24]).toEqual({ activeCount: 0, totalDebt: 0 });
  });

  it('cuenta MSI activas por plazo y suma su deuda restante', () => {
    // MSI a 12 meses iniciada en mayo, hoy es junio → vigente, 12 cuotas pendientes (incluye mes actual)
    // monthly = ceil(1200/12 * 100) / 100 = 100
    // totalDebt = 12 * 100 = 1200
    const tx = makeMsi({ msiMonths: 12, msiStartDate: '2026-05-15T10:00:00.000Z' });
    const result = summarizeMsiByTenure([tx], today);
    expect(result[12]).toEqual({ activeCount: 1, totalDebt: 1200 });
    expect(result[6]).toEqual({ activeCount: 0, totalDebt: 0 });
  });

  it('ignora MSI que ya terminaron', () => {
    // MSI a 3 meses iniciada en enero 2026 → terminó en marzo, no cuenta en junio
    const tx = makeMsi({ msiMonths: 3, msiStartDate: '2026-01-15T10:00:00.000Z' });
    const result = summarizeMsiByTenure([tx], today);
    expect(result[3]).toEqual({ activeCount: 0, totalDebt: 0 });
  });

  it('ignora MSI que aún no inician', () => {
    const tx = makeMsi({ msiMonths: 6, msiStartDate: '2026-07-15T10:00:00.000Z' });
    const result = summarizeMsiByTenure([tx], today);
    expect(result[6]).toEqual({ activeCount: 0, totalDebt: 0 });
  });

  it('suma múltiples MSI del mismo plazo', () => {
    const tx1 = makeMsi({ msiMonths: 12, msiStartDate: '2026-05-15T10:00:00.000Z', amount: 1200 });
    const tx2 = makeMsi({ msiMonths: 12, msiStartDate: '2026-04-15T10:00:00.000Z', amount: 2400 });
    const result = summarizeMsiByTenure([tx1, tx2], today);
    // tx1: 12 meses restantes (incluye actual) * 100 = 1200
    // tx2: 11 meses restantes * 200 = 2200
    expect(result[12]).toEqual({ activeCount: 2, totalDebt: 3400 });
  });

  it('distingue entre plazos distintos', () => {
    const tx3 = makeMsi({ msiMonths: 3, msiStartDate: '2026-05-15T10:00:00.000Z', amount: 600 });
    const tx6 = makeMsi({ msiMonths: 6, msiStartDate: '2026-04-15T10:00:00.000Z', amount: 1200 });
    const result = summarizeMsiByTenure([tx3, tx6], today);
    // tx3: 3 meses restantes (incluye actual) * 200 = 600
    expect(result[3]).toEqual({ activeCount: 1, totalDebt: 600 });
    // tx6: 5 meses restantes * 200 = 1000
    expect(result[6]).toEqual({ activeCount: 1, totalDebt: 1000 });
    expect(result[12]).toEqual({ activeCount: 0, totalDebt: 0 });
  });

  it('funciona con MSI ya terminada que cruza fin de año', () => {
    // MSI a 3 meses empezó en diciembre 2025 → terminó en febrero 2026
    // hoy es junio 2026 → mesesTranscurridos = 6 > 3 → no cuenta
    const tx = makeMsi({ msiMonths: 3, msiStartDate: '2025-12-15T10:00:00.000Z' });
    const result = summarizeMsiByTenure([tx], today);
    expect(result[3]).toEqual({ activeCount: 0, totalDebt: 0 });
  });

  it('incluye MSI que inició en diciembre y aún tiene meses en junio del año siguiente', () => {
    // MSI a 12 meses empezó en diciembre 2025, hoy es junio 2026
    // mesesTranscurridos = 6 → vigente
    // remaining = 12 - 6 + 1 = 7 meses
    // monthly = ceil(1200/12 * 100) / 100 = 100
    // totalDebt = 7 * 100 = 700
    const tx = makeMsi({ msiMonths: 12, msiStartDate: '2025-12-15T10:00:00.000Z' });
    const result = summarizeMsiByTenure([tx], today);
    expect(result[12]).toEqual({ activeCount: 1, totalDebt: 700 });
  });
});
