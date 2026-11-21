import { useMemo, useState } from "react";
import { useLiveTransactions } from "@/hooks/useLiveTransactions";
import { useLiveCards } from "@/hooks/useLiveCards";
import { useLiveFixedPayments } from "@/hooks/useLiveFixedPayments";
import { useLiveSettings } from "@/hooks/useLiveSettings";
import { computeDashboardSummary } from "./computeDashboardSummary";
import type { DashboardSummary, SelectedMonth } from "./types";

export interface UseDashboardSummaryResult {
  summary: DashboardSummary | undefined;
  isLoading: boolean;
  error: Error | null;
  retry: () => void;
}

export function useDashboardSummary(
  selectedMonth: SelectedMonth,
): UseDashboardSummaryResult {
  const [attempt, setAttempt] = useState(0);

  const transactions = useLiveTransactions();
  const cards = useLiveCards();
  const fixedPayments = useLiveFixedPayments();
  const settings = useLiveSettings();

  const retry = useMemo(
    () => () => setAttempt((prev) => prev + 1),
    [],
  );

  return useMemo(() => {
    // `attempt` is read only to force re-computation when the user clicks retry.
    void attempt;

    if (
      transactions === undefined ||
      cards === undefined ||
      fixedPayments === undefined ||
      settings === undefined
    ) {
      return { summary: undefined, isLoading: true, error: null, retry };
    }

    try {
      const summary = computeDashboardSummary(
        { transactions, cards, fixedPayments, settings },
        selectedMonth,
      );
      return { summary, isLoading: false, error: null, retry };
    } catch (cause) {
      const error =
        cause instanceof Error
          ? cause
          : new Error("No se pudo cargar el resumen", { cause });
      return { summary: undefined, isLoading: false, error, retry };
    }
  }, [transactions, cards, fixedPayments, settings, selectedMonth, attempt, retry]);
}
