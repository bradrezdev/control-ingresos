import { db } from '../database';
import { DebtSchema, type Debt, type DebtInput } from '../schemas/debt';

export const debtsRepo = {
  async list(): Promise<Debt[]> {
    return db.debts.orderBy('createdAt').toArray();
  },

  async get(id: string): Promise<Debt | undefined> {
    return db.debts.get(id);
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
};
