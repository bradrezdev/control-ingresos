import { describe, it, expect } from 'vitest';
import { summarizeMsiByTenure } from '../msiSummary';
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
    // MSI a 12 meses iniciada en mayo, hoy es junio → vigente.
    // monthsSinceStart = 1 (1 mes después del inicio).
    // remaining = 12 - 1 = 11 cuotas pendientes (junio en adelante).
    // monthly = getMsiInstallmentAmount(1200, 12, 2) = base = 100 cents.
    // totalDebt = 11 * 100 = 1100.
    const tx = makeMsi({ msiMonths: 12, msiStartDate: '2026-05-15T10:00:00.000Z' });
    const result = summarizeMsiByTenure([tx], today);
    expect(result[12]).toEqual({ activeCount: 1, totalDebt: 1100 });
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
    // tx1: started May, today June → monthsSinceStart=1, remaining=11.
    //   monthly=getMsiInstallmentAmount(1200, 12, 2)=100, totalDebt=11*100=1100.
    // tx2: started April, today June → monthsSinceStart=2, remaining=10.
    //   monthly=getMsiInstallmentAmount(2400, 12, 3)=200, totalDebt=10*200=2000.
    // total: 1100 + 2000 = 3100.
    expect(result[12]).toEqual({ activeCount: 2, totalDebt: 3100 });
  });

  it('distingue entre plazos distintos', () => {
    const tx3 = makeMsi({ msiMonths: 3, msiStartDate: '2026-05-15T10:00:00.000Z', amount: 600 });
    const tx6 = makeMsi({ msiMonths: 6, msiStartDate: '2026-04-15T10:00:00.000Z', amount: 1200 });
    const result = summarizeMsiByTenure([tx3, tx6], today);
    // tx3: started May, today June → monthsSinceStart=1, remaining=2.
    //   monthly=getMsiInstallmentAmount(600, 3, 2)=200, totalDebt=2*200=400.
    // tx6: started April, today June → monthsSinceStart=2, remaining=4.
    //   monthly=getMsiInstallmentAmount(1200, 6, 3)=200, totalDebt=4*200=800.
    expect(result[3]).toEqual({ activeCount: 1, totalDebt: 400 });
    expect(result[6]).toEqual({ activeCount: 1, totalDebt: 800 });
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
    // remaining = 12 - 6 = 6 meses
    // monthly = getMsiInstallmentAmount(1200, 12, 7) = 100
    // totalDebt = 6 * 100 = 600
    const tx = makeMsi({ msiMonths: 12, msiStartDate: '2025-12-15T10:00:00.000Z' });
    const result = summarizeMsiByTenure([tx], today);
    expect(result[12]).toEqual({ activeCount: 1, totalDebt: 600 });
  });
});
