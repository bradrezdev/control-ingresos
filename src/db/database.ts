import Dexie, { type EntityTable } from 'dexie';
import type { Transaction } from './schemas/transaction';
import type { Card } from './schemas/card';
import type { Debt } from './schemas/debt';
import type { Settings } from './schemas/settings';

export class ControlIngresosDB extends Dexie {
  transactions!: EntityTable<Transaction, 'id'>;
  cards!: EntityTable<Card, 'id'>;
  debts!: EntityTable<Debt, 'id'>;
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
  }
}

export const db = new ControlIngresosDB();
