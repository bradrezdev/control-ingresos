import { z } from 'zod';

export const CardSchema = z.object({
  id: z.uuid(),
  bank: z.string().min(1).max(60),
  holderName: z.string().min(1).max(80),
  last4: z.string().regex(/^\d{4}$/, { error: 'last4 must be exactly 4 digits' }),
  cutDay: z.number().int().min(1).max(31),
  paymentDueDay: z.number().int().min(1).max(31),
  creditLimit: z.number().positive().optional(),
  priority: z.number().int().default(0),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});

export type Card = z.infer<typeof CardSchema>;
export type CardInput = Omit<Card, 'id' | 'createdAt' | 'updatedAt'>;
