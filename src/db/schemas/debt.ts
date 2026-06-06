import { z } from 'zod';

export const DebtSchema = z.object({
  id: z.uuid(),
  creditor: z.string().min(1).max(80),
  description: z.string().max(160).optional(),
  originalAmount: z.number().positive(),
  remainingBalance: z.number().nonnegative(),
  fixedMonthlyPayment: z.number().positive(),
  // R-4 (bug 4): date-only para fechas operacionales (sin TZ math).
  startDate: z.iso.date(),
  endDate: z.iso.date().optional(),
  // `createdAt` / `updatedAt` siguen siendo datetime (son timestamps de auditoría,
  // no fechas que el usuario edita).
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});

export type Debt = z.infer<typeof DebtSchema>;
export type DebtInput = Omit<Debt, 'id' | 'createdAt' | 'updatedAt'>;
