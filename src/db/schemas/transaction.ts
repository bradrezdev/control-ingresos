import { z } from 'zod';

export const TransactionType = z.enum(['income', 'expense', 'expense_msi']);
export type TransactionType = z.infer<typeof TransactionType>;

export const PaymentMethod = z.enum(['cash', 'debit', 'credit', 'transfer']);
export type PaymentMethod = z.infer<typeof PaymentMethod>;

// Plazos MSI soportados: rango 1-48 meses (antes era literal union 1/3/6/9/12/18/24).
// El selector ahora ofrece cualquier plazo entero en este rango.
export const MSI_TERM = Array.from({ length: 48 }, (_, i) => i + 1) as readonly number[];
export type MsiTerm = number;
export const MsiMonths = z.number().int().min(1).max(48);
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
