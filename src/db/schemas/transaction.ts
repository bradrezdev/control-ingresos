import { z } from 'zod';

export const TransactionType = z.enum(['income', 'expense', 'expense_msi']);
export type TransactionType = z.infer<typeof TransactionType>;

export const PaymentMethod = z.enum(['cash', 'debit', 'credit', 'transfer']);
export type PaymentMethod = z.infer<typeof PaymentMethod>;

export const MSI_TERM = [1, 3, 6, 9, 12, 18, 24] as const;
export type MsiTerm = (typeof MSI_TERM)[number];
export const MsiMonths = z.union([
  z.literal(1),
  z.literal(3),
  z.literal(6),
  z.literal(9),
  z.literal(12),
  z.literal(18),
  z.literal(24),
]);
export type MsiMonths = z.infer<typeof MsiMonths>;

const BaseTransaction = z.object({
  id: z.uuid(),
  amount: z.number().positive(),
  currency: z.string().length(3),
  description: z.string().min(1).max(120),
  // R-4 (bug 4): date-only storage (YYYY-MM-DD) para evitar el drift por
  // zona horaria. Helpers de boundary en `src/lib/date/local.ts`.
  date: z.iso.date(),
  category: z.string().optional(),
});

/** Ingreso: sin tarjeta, sin MSI. */
export const IncomeSchema = BaseTransaction.extend({
  type: z.literal('income'),
  paymentMethod: z.enum(['cash', 'transfer']),
});

/** Gasto directo (no MSI). */
export const DirectExpenseSchema = BaseTransaction.extend({
  type: z.literal('expense'),
  paymentMethod: z.enum(['cash', 'debit', 'credit', 'transfer']),
  cardId: z.uuid().optional(),
}).refine((data) => data.paymentMethod !== 'credit' || data.cardId !== undefined, {
  message: 'cardId is required when paymentMethod is credit',
  path: ['cardId'],
});

/** Gasto a MSI — siempre con tarjeta. */
export const MsiExpenseSchema = BaseTransaction.extend({
  type: z.literal('expense_msi'),
  paymentMethod: z.literal('credit'),
  cardId: z.uuid(),
  msiMonths: MsiMonths,
  msiStartDate: z.iso.date(),
});

export const TransactionSchema = z.discriminatedUnion('type', [
  IncomeSchema,
  DirectExpenseSchema,
  MsiExpenseSchema,
]);

export type Transaction = z.infer<typeof TransactionSchema>;
export type Income = z.infer<typeof IncomeSchema>;
export type DirectExpense = z.infer<typeof DirectExpenseSchema>;
export type MsiExpense = z.infer<typeof MsiExpenseSchema>;

/** Input sin `id` para formularios y repositorios. */
export type TransactionInput = Omit<Transaction, 'id'>;
