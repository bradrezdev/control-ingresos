import { db } from '../database';
import { CardSchema, type Card, type CardInput } from '../schemas/card';

export const cardsRepo = {
  async list(): Promise<Card[]> {
    return db.cards.orderBy('priority').toArray();
  },

  async get(id: string): Promise<Card | undefined> {
    return db.cards.get(id);
  },

  async create(input: CardInput): Promise<Card> {
    const now = new Date().toISOString();
    const card: Card = {
      ...input,
      id: crypto.randomUUID(),
      createdAt: now,
      updatedAt: now,
    };
    CardSchema.parse(card);
    await db.cards.add(card);
    return card;
  },

  async update(id: string, patch: Partial<Card>): Promise<Card> {
    const existing = await db.cards.get(id);
    if (!existing) throw new Error(`Card ${id} not found`);
    const updated: Card = {
      ...existing,
      ...patch,
      id: existing.id,
      createdAt: existing.createdAt,
      updatedAt: new Date().toISOString(),
    };
    CardSchema.parse(updated);
    await db.cards.put(updated);
    return updated;
  },

  async delete(id: string): Promise<void> {
    await db.cards.delete(id);
  },

  async reorder(orderedIds: string[]): Promise<void> {
    const now = new Date().toISOString();
    await db.transaction('rw', db.cards, async () => {
      await Promise.all(
        orderedIds.map((id, priority) =>
          db.cards.update(id, { priority, updatedAt: now }),
        ),
      );
    });
  },
};
