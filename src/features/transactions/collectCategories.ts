/**
 * collectCategories — control-ingresos (T7)
 *
 * The app has no category catalog: the entry screen builds its chips
 * from the categories the person already uses in their live
 * transactions. Deduped, trimmed, alphabetically sorted (es collation).
 */
import type { Transaction } from "@/db/schemas/transaction";

export function collectCategories(
  transactions: readonly Transaction[],
): string[] {
  const seen = new Set<string>();
  for (const tx of transactions) {
    const category = tx.category?.trim();
    if (category) seen.add(category);
  }
  return [...seen].sort((a, b) => a.localeCompare(b, "es"));
}
