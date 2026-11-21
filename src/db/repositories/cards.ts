import { db } from '../database';
import { CardSchema, type Card, type CardInput } from '../schemas/card';

export const cardsRepo = {
  async list(): Promise<Card[]> {
    return db.cards.orderBy('priority').toArray();
  },

  /**
   * Tarjetas de la cartera: las que no están archivadas, en orden de
   * prioridad. "Archivada" significa que la persona la retiró de su
   * cartera: sus movimientos y sus reglas de pagos fijos se conservan.
   */
  async listActive(): Promise<Card[]> {
    const cards = await db.cards.orderBy('priority').toArray();
    return cards.filter((card) => card.archived !== true);
  },

  /** Tarjetas retiradas de la cartera, para poder restaurarlas. */
  async listArchived(): Promise<Card[]> {
    const cards = await db.cards.orderBy('priority').toArray();
    return cards.filter((card) => card.archived === true);
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

  /**
   * Retira la tarjeta de la cartera sin borrar nada: se archiva, y sus
   * movimientos y reglas de pagos fijos siguen intactos.
   */
  async archive(id: string): Promise<Card> {
    return this.update(id, { archived: true });
  },

  /**
   * Devuelve una tarjeta archivada a la cartera, al final (prioridad
   * más baja entre las activas).
   */
  async restore(id: string): Promise<Card> {
    const [card, active] = await Promise.all([
      db.cards.get(id),
      this.listActive(),
    ]);
    if (!card) throw new Error(`Card ${id} not found`);
    const lastPriority = active.reduce(
      (max, other) => Math.max(max, other.priority),
      -1,
    );
    return this.update(id, {
      archived: false,
      priority: lastPriority + 1,
    });
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
