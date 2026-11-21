/**
 * Live data hook for the Tarjetas screen (redesign-ui-2026, T5).
 *
 * Same shape as the dashboard's `useDashboardSummary`: live Dexie data in,
 * pure computation out, plus an error channel (the `useLive*` hooks do
 * not expose errors themselves) and a `retry` that re-runs the compute.
 */
import { useMemo, useState } from "react";
import { useLiveCards } from "@/hooks/useLiveCards";
import { useLiveTransactions } from "@/hooks/useLiveTransactions";
import { useLiveSettings } from "@/hooks/useLiveSettings";
import { computeCardAccount, computeWalletOverview } from "./computeCardAccount";
import type { CardAccount, WalletOverview } from "./types";

export interface UseCardAccountsResult {
  accounts: CardAccount[];
  overview: WalletOverview | null;
  isLoading: boolean;
  error: Error | null;
  retry: () => void;
}

export function useCardAccounts(): UseCardAccountsResult {
  const [attempt, setAttempt] = useState(0);

  const cards = useLiveCards();
  const transactions = useLiveTransactions();
  const settings = useLiveSettings();

  const retry = useMemo(() => () => setAttempt((prev) => prev + 1), []);

  return useMemo(() => {
    // `attempt` is read only to force re-computation on retry.
    void attempt;

    if (cards === undefined || transactions === undefined || settings === undefined) {
      return { accounts: [], overview: null, isLoading: true, error: null, retry };
    }

    try {
      const today = new Date();
      const accounts = cards.map((card) =>
        computeCardAccount(card, transactions, today),
      );
      const overview = computeWalletOverview(accounts, settings.currency);
      return { accounts, overview, isLoading: false, error: null, retry };
    } catch (cause) {
      const error =
        cause instanceof Error
          ? cause
          : new Error("No se pudo cargar la sección de tarjetas", { cause });
      return { accounts: [], overview: null, isLoading: false, error, retry };
    }
  }, [cards, transactions, settings, attempt, retry]);
}
