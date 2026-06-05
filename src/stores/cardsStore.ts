/**
 * Cards store — control-ingresos
 *
 * Cache layer for Card data. Dexie is the source of truth; this store
 * keeps an in-memory copy and exposes write-through actions so React
 * components can subscribe via `useShallow` selectors.
 *
 * For READS, prefer `useLiveCards` (Dexie reactive query) — it
 * auto-updates when data changes anywhere. This store is mainly for
 * imperative write actions.
 */
import { create } from "zustand";
import { cardsRepo } from "@/db/repositories";
import type { Card, CardInput } from "@/db/schemas/card";

export interface CardsState {
  cards: Card[];
  loading: boolean;

  refresh: () => Promise<void>;
  create: (input: CardInput) => Promise<Card>;
  update: (id: string, patch: Partial<Card>) => Promise<Card>;
  remove: (id: string) => Promise<void>;
  reorder: (orderedIds: string[]) => Promise<void>;
}

const sortByPriority = (cards: Card[]): Card[] =>
  [...cards].sort((a, b) => a.priority - b.priority);

export const useCardsStore = create<CardsState>((set) => ({
  cards: [],
  loading: true,

  refresh: async () => {
    const cards = await cardsRepo.list();
    set({ cards: sortByPriority(cards), loading: false });
  },

  create: async (input) => {
    const card = await cardsRepo.create(input);
    set((s) => ({ cards: sortByPriority([...s.cards, card]) }));
    return card;
  },

  update: async (id, patch) => {
    const card = await cardsRepo.update(id, patch);
    set((s) => ({
      cards: sortByPriority(s.cards.map((c) => (c.id === id ? card : c))),
    }));
    return card;
  },

  remove: async (id) => {
    await cardsRepo.delete(id);
    set((s) => ({ cards: s.cards.filter((c) => c.id !== id) }));
  },

  reorder: async (orderedIds) => {
    await cardsRepo.reorder(orderedIds);
    set((s) => {
      const byId = new Map(s.cards.map((c) => [c.id, c]));
      const reordered: Card[] = [];
      orderedIds.forEach((id, priority) => {
        const card = byId.get(id);
        if (!card) {
          throw new Error(`Card ${id} not found in store`);
        }
        reordered.push({ ...card, priority });
      });
      return { cards: reordered };
    });
  },
}));
