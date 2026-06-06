import { z } from 'zod';

/**
 * Card schema v3 — control-ingresos
 *
 * Migration from v2: `cardType` is added. Existing credit cards get
 * `cardType='credit'` on upgrade (see `db/database.ts` v3 upgrade).
 *
 * - `cardType: 'debit' | 'credit'`. Debit cards have no cut/pay cycle and
 *   no credit limit; those fields become optional at the schema level and
 *   are enforced via `.superRefine` below.
 * - `cutDay`, `daysToPayAfterCut`, `creditLimit` are `.optional()` in the
 *   base shape. The superRefine blocks debit cards from being saved with
 *   credit-only fields and blocks credit cards from being saved without
 *   cycle fields.
 * - `cutDay` and `daysToPayAfterCut` are still required for credit cards
 *   (path-specific errors via superRefine).
 */
export const CardSchema = z
  .object({
    id: z.uuid(),
    bank: z.string().min(1).max(60),
    holderName: z.string().min(1).max(80),
    cardType: z.enum(['debit', 'credit']).default('credit'),
    cutDay: z.number().int().min(1).max(31).optional(),
    daysToPayAfterCut: z.number().int().min(1).max(62).optional(),
    creditLimit: z.number().positive().optional(),
    priority: z.number().int().default(0),
    createdAt: z.iso.datetime(),
    updatedAt: z.iso.datetime(),
  })
  .superRefine((data, ctx) => {
    if (data.cardType === 'credit') {
      if (data.cutDay === undefined) {
        ctx.addIssue({
          path: ['cutDay'],
          code: 'custom',
          message: 'Día de corte requerido para tarjetas de crédito',
        });
      }
      if (data.daysToPayAfterCut === undefined) {
        ctx.addIssue({
          path: ['daysToPayAfterCut'],
          code: 'custom',
          message: 'Días para pagar requerido para tarjetas de crédito',
        });
      }
    } else {
      // Debit: forbid credit-only fields explicitly so a stray value from a
      // legacy form submit doesn't leak through.
      if (data.cutDay !== undefined) {
        ctx.addIssue({
          path: ['cutDay'],
          code: 'custom',
          message: 'Las tarjetas de débito no tienen día de corte',
        });
      }
      if (data.daysToPayAfterCut !== undefined) {
        ctx.addIssue({
          path: ['daysToPayAfterCut'],
          code: 'custom',
          message: 'Las tarjetas de débito no tienen días para pagar',
        });
      }
      if (data.creditLimit !== undefined) {
        ctx.addIssue({
          path: ['creditLimit'],
          code: 'custom',
          message: 'Las tarjetas de débito no tienen límite de crédito',
        });
      }
    }
  });

export type Card = z.infer<typeof CardSchema>;
export type CardInput = Omit<Card, 'id' | 'createdAt' | 'updatedAt'>;
