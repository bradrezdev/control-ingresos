/**
 * Live query for a card's MSI transactions (redesign-ui-2026, T5).
 *
 * Bridges `transactionsRepo.listMsiForCard` to React through Dexie's
 * reactive `useLiveQuery`, so the card detail sheet shows the card's
 * installment purchases without reimplementing any MSI logic.
 */
import { useLiveQuery } from "dexie-react-hooks";
import { transactionsRepo } from "@/db/repositories";
import type { Transaction } from "@/db/schemas";

export function useLiveMsiForCard(cardId: string): Transaction[] | undefined {
  return useLiveQuery(() => transactionsRepo.listMsiForCard(cardId), [cardId]);
}
