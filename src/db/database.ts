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
    this.version(1).stores({
      transactions:
        'id, type, date, cardId, [type+date], [cardId+date]',
      cards: 'id, bank, priority, createdAt',
      debts: 'id, creditor, startDate, createdAt',
      settings: 'id',
    });
  }
}

export const db = new ControlIngresosDB();
