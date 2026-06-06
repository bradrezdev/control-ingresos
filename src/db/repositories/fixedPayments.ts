import { db } from '../database';
import {
  FixedPaymentSchema,
  type FixedPayment,
  type FixedPaymentInput,
} from '../schemas/fixedPayment';

export const fixedPaymentsRepo = {
  async list(): Promise<FixedPayment[]> {
    return db.fixedPayments.orderBy('createdAt').toArray();
  },

  async get(id: string): Promise<FixedPayment | undefined> {
    return db.fixedPayments.get(id);
  },

  async create(input: FixedPaymentInput): Promise<FixedPayment> {
    const now = new Date().toISOString();
    const fp: FixedPayment = {
      ...input,
      id: crypto.randomUUID(),
      createdAt: now,
      updatedAt: now,
    };
    FixedPaymentSchema.parse(fp);
    await db.fixedPayments.add(fp);
    return fp;
  },

  async update(id: string, patch: Partial<FixedPayment>): Promise<FixedPayment> {
    const existing = await db.fixedPayments.get(id);
    if (!existing) throw new Error(`FixedPayment ${id} not found`);
    const updated: FixedPayment = {
      ...existing,
      ...patch,
      id: existing.id,
      createdAt: existing.createdAt,
      updatedAt: new Date().toISOString(),
    };
    FixedPaymentSchema.parse(updated);
    await db.fixedPayments.put(updated);
    return updated;
  },

  async delete(id: string): Promise<void> {
    await db.fixedPayments.delete(id);
  },
};
