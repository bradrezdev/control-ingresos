import { z } from 'zod';

export const FixedPaymentPeriod = z.enum(['monthly', 'bimonthly', 'quarterly']);
export type FixedPaymentPeriod = z.infer<typeof FixedPaymentPeriod>;

export const FixedPaymentSchema = z
  .object({
    id: z.uuid(),
    amount: z.number().positive(), // centavos enteros (ADR-03)
    description: z.string().min(1).max(120),
    paymentDay: z.number().int().min(1).max(31),
    period: FixedPaymentPeriod,
    category: z.string().max(60).optional(),
    paymentMethod: z.enum(['cash', 'debit', 'credit', 'transfer']),
    cardId: z.uuid().optional(),
    msiMonths: z.number().int().min(1).max(48).optional(),
    createdAt: z.iso.datetime(),
    updatedAt: z.iso.datetime(),
  })
  .superRefine((data, ctx) => {
    if (
      (data.paymentMethod === 'debit' || data.paymentMethod === 'credit') &&
      !data.cardId
    ) {
      ctx.addIssue({
        path: ['cardId'],
        code: 'custom',
        message: 'Seleccioná una tarjeta',
      });
    }
    if (data.paymentMethod !== 'credit' && data.msiMonths !== undefined) {
      ctx.addIssue({
        path: ['msiMonths'],
        code: 'custom',
        message: 'Solo crédito puede tener MSI',
      });
    }
  });

export type FixedPayment = z.infer<typeof FixedPaymentSchema>;
export type FixedPaymentInput = Omit<
  FixedPayment,
  'id' | 'createdAt' | 'updatedAt'
>;
