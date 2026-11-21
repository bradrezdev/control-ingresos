import Dexie, { type EntityTable } from 'dexie';
import type { Transaction } from './schemas/transaction';
import type { Card, CardSkin } from './schemas/card';
import type { FixedPayment } from './schemas/fixedPayment';
import type { Settings } from './schemas/settings';
import { skinForBank } from '@/lib/cards/skin';

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
    // v4: card finish + archive flag, MSI plan rounding rule.
    // - Cards get `skin` (visual finish, backfilled from the issuer name)
    //   and `archived` (false for every existing card: nothing is hidden
    //   from the user without them asking for it).
    // - MSI transactions get `msiPlanRule='last'`, the rule the app has
    //   always used, so existing plans keep their exact amounts.
    this.version(4)
      .stores({
        transactions:
          'id, type, date, cardId, [type+date], [cardId+date]',
        cards: 'id, bank, priority, createdAt',
        fixedPayments: 'id, period, paymentDay, createdAt',
        settings: 'id',
      })
      .upgrade(async (tx) => {
        await tx
          .table('cards')
          .toCollection()
          .modify((raw: unknown) => {
            const c = raw as {
              bank?: string;
              skin?: CardSkin;
              archived?: boolean;
            };
            if (c.archived === undefined) c.archived = false;
            if (c.skin === undefined && typeof c.bank === 'string') {
              c.skin = skinForBank(c.bank);
            }
          });
        await tx
          .table('transactions')
          .toCollection()
          .modify((raw: unknown) => {
            const t = raw as { type?: string; msiPlanRule?: string };
            if (t.type === 'expense_msi' && t.msiPlanRule === undefined) {
              t.msiPlanRule = 'last';
            }
          });
      });
  }
}

export const db = new ControlIngresosDB();
