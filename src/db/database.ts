import Dexie, { type EntityTable } from 'dexie';
import type { Transaction } from './schemas/transaction';
import type { Card } from './schemas/card';
import type { FixedPayment } from './schemas/fixedPayment';
import type { Settings } from './schemas/settings';

export class ControlIngresosDB extends Dexie {
  transactions!: EntityTable<Transaction, 'id'>;
  cards!: EntityTable<Card, 'id'>;
  fixedPayments!: EntityTable<FixedPayment, 'id'>;
  settings!: EntityTable<Settings, 'id'>;

  constructor() {
    super('control-ingresos');
    // v1: legacy shape (paymentDueDay, last4)
    this.version(1).stores({
      transactions:
        'id, type, date, cardId, [type+date], [cardId+date]',
      cards: 'id, bank, priority, createdAt',
      debts: 'id, creditor, startDate, createdAt',
      settings: 'id',
    });
    // v2: card cycle migrated to daysToPayAfterCut; last4 removed.
    this.version(2)
      .stores({
        transactions:
          'id, type, date, cardId, [type+date], [cardId+date]',
        cards: 'id, bank, priority, createdAt',
        debts: 'id, creditor, startDate, createdAt',
        settings: 'id',
      })
      .upgrade(async (tx) => {
        await tx
          .table('cards')
          .toCollection()
          .modify((raw: unknown) => {
            const c = raw as {
              paymentDueDay?: number;
              cutDay: number;
              last4?: string;
              daysToPayAfterCut?: number;
            };
            if (
              c.paymentDueDay !== undefined &&
              c.daysToPayAfterCut === undefined
            ) {
              const rawDelta =
                c.paymentDueDay >= c.cutDay
                  ? c.paymentDueDay - c.cutDay
                  : 30 - c.cutDay + c.paymentDueDay;
              c.daysToPayAfterCut = rawDelta === 0 ? 30 : rawDelta;
            }
            delete c.last4;
            delete c.paymentDueDay;
          });
      });
    // v3: drop `debts`, add `fixedPayments`, backfill `cardType` on cards.
    // - `debts` had no user data in production (feature was deprecated before
    //   release). Dexie handles `null` automatically — no upgrade needed.
    // - `fixedPayments` is a new object store.
    // - All existing cards get `cardType='credit'` (backfill) so the new
    //   `cardType` field never reads as `undefined` for legacy rows.
    this.version(3)
      .stores({
        transactions:
          'id, type, date, cardId, [type+date], [cardId+date]',
        cards: 'id, bank, priority, createdAt',
        debts: null,
        fixedPayments: 'id, period, paymentDay, createdAt',
        settings: 'id',
      })
      .upgrade(async (tx) => {
        await tx
          .table('cards')
          .toCollection()
          .modify((raw: unknown) => {
            const c = raw as { cardType?: 'debit' | 'credit' };
            if (!c.cardType) c.cardType = 'credit';
          });
      });
  }
}

export const db = new ControlIngresosDB();
