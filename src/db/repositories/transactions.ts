import { db } from '../database';
import {
  TransactionSchema,
  type Transaction,
  type TransactionInput,
} from '../schemas/transaction';
import { normalizeToDateString } from '@/lib/date/local';

/**
 * Read-through normalizer for legacy rows. Filas creadas con la v1 del
 * schema (date en formato `...T00:00:00.000Z`) se normalizan a date-only
 * al salir del repo. Es idempotente: filas nuevas (que ya son date-only)
 * pasan sin tocarse.
 */
function normalizeDateFields(tx: Transaction): Transaction {
  const next: Transaction = {
    ...tx,
    date: normalizeToDateString(tx.date),
  };
  if (next.type === 'expense_msi') {
    (next as { msiStartDate: string }).msiStartDate = normalizeToDateString(
      next.msiStartDate,
    );
  }
  return next;
}

export const transactionsRepo = {
  async list(): Promise<Transaction[]> {
    const all = await db.transactions.orderBy('date').reverse().toArray();
    return all.map(normalizeDateFields);
  },

  async get(id: string): Promise<Transaction | undefined> {
    const tx = await db.transactions.get(id);
    return tx ? normalizeDateFields(tx) : undefined;
  },

  async create(input: TransactionInput): Promise<Transaction> {
    const tx: Transaction = {
      ...input,
      id: crypto.randomUUID(),
    } as Transaction;
    TransactionSchema.parse(tx);
    await db.transactions.add(tx);
    return tx;
  },

  async update(id: string, patch: Partial<Transaction>): Promise<Transaction> {
    const existing = await db.transactions.get(id);
    if (!existing) throw new Error(`Transaction ${id} not found`);
    const updated = { ...existing, ...patch, id: existing.id } as Transaction;
    TransactionSchema.parse(updated);
    await db.transactions.put(updated);
    return updated;
  },

  async delete(id: string): Promise<void> {
    await db.transactions.delete(id);
  },

  async listForCard(cardId: string): Promise<Transaction[]> {
    return db.transactions.where('cardId').equals(cardId).toArray();
  },

  async listMsiForCard(cardId: string): Promise<Transaction[]> {
    const all = await db.transactions.where('cardId').equals(cardId).toArray();
    return all.filter((tx) => tx.type === 'expense_msi');
  },

  async listForDateRange(fromIso: string, toIso: string): Promise<Transaction[]> {
    return db.transactions
      .where('date')
      .between(fromIso, toIso, true, true)
      .toArray();
  },
};
