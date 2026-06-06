import { z } from 'zod';

/**
 * Card schema v2 — control-ingresos
 *
 * Migration from v1: `paymentDueDay: 1..31` and `last4` are removed.
 *   - `paymentDueDay` → `daysToPayAfterCut: 1..62` (constant per card;
 *     `cycleLengthDays === daysToPayAfterCut`).
 *   - `last4` → removed entirely. The UI never displays it anymore.
 *
 * Backfill on upgrade is in `db/database.ts`. The Tarjeta P edge case
 * (cut=pay) backfills to 30 (a 0 fallback). User must verify post-merge.
 */
export const CardSchema = z.object({
  id: z.uuid(),
  bank: z.string().min(1).max(60),
  holderName: z.string().min(1).max(80),
  cutDay: z.number().int().min(1).max(31),
  daysToPayAfterCut: z.number().int().min(1).max(62),
  creditLimit: z.number().positive().optional(),
  priority: z.number().int().default(0),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});

export type Card = z.infer<typeof CardSchema>;
export type CardInput = Omit<Card, 'id' | 'createdAt' | 'updatedAt'>;
