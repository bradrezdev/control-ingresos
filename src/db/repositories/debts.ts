import { db } from '../database';
import { DebtSchema, type Debt, type DebtInput } from '../schemas/debt';
import { normalizeToDateString } from '@/lib/date/local';

/** Read-through normalizer: rows legacy con `...T00:00:00.000Z` se acortan
 *  a date-only. Filas nuevas (ya date-only) pasan sin tocarse. */
function normalizeDateFields(debt: Debt): Debt {
  return {
    ...debt,
    startDate: normalizeToDateString(debt.startDate),
    ...(debt.endDate ? { endDate: normalizeToDateString(debt.endDate) } : {}),
  };
}

export const debtsRepo = {
  async list(): Promise<Debt[]> {
    const all = await db.debts.orderBy('createdAt').toArray();
    return all.map(normalizeDateFields);
  },

  async get(id: string): Promise<Debt | undefined> {
    const debt = await db.debts.get(id);
    return debt ? normalizeDateFields(debt) : undefined;
  },

  async create(input: DebtInput): Promise<Debt> {
    const now = new Date().toISOString();
    const debt: Debt = {
      ...input,
      id: crypto.randomUUID(),
      createdAt: now,
      updatedAt: now,
    };
    DebtSchema.parse(debt);
    await db.debts.add(debt);
    return debt;
  },

  async update(id: string, patch: Partial<Debt>): Promise<Debt> {
    const existing = await db.debts.get(id);
    if (!existing) throw new Error(`Debt ${id} not found`);
    const updated: Debt = {
      ...existing,
      ...patch,
      id: existing.id,
      createdAt: existing.createdAt,
      updatedAt: new Date().toISOString(),
    };
    DebtSchema.parse(updated);
    await db.debts.put(updated);
    return updated;
  },

  async delete(id: string): Promise<void> {
    await db.debts.delete(id);
  },

  /**
   * Apply a payment to a debt. `amount` is the value to subtract from
   * `remainingBalance`. The result is clamped at 0 (a payment larger
   * than the remaining balance is allowed and zeroes the debt).
   */
  async recordPayment(id: string, amount: number): Promise<Debt> {
    const existing = await db.debts.get(id);
    if (!existing) throw new Error(`Debt ${id} not found`);
    if (!Number.isFinite(amount) || amount <= 0) {
      throw new Error("Payment amount must be a positive number");
    }
    const newBalance = Math.max(0, existing.remainingBalance - amount);
    const updated: Debt = {
      ...existing,
      remainingBalance: newBalance,
      id: existing.id,
      createdAt: existing.createdAt,
      updatedAt: new Date().toISOString(),
    };
    DebtSchema.parse(updated);
    await db.debts.put(updated);
    return updated;
  },
};
