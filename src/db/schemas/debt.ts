import { z } from 'zod';

export const DebtSchema = z.object({
  id: z.uuid(),
  creditor: z.string().min(1).max(80),
  description: z.string().max(160).optional(),
  originalAmount: z.number().positive(),
  remainingBalance: z.number().nonnegative(),
  fixedMonthlyPayment: z.number().positive(),
  startDate: z.iso.datetime(),
  endDate: z.iso.datetime().optional(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});

export type Debt = z.infer<typeof DebtSchema>;
export type DebtInput = Omit<Debt, 'id' | 'createdAt' | 'updatedAt'>;
