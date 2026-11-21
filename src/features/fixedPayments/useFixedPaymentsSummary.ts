/**
 * useFixedPaymentsSummary — control-ingresos (redesign-ui-2026, T6)
 *
 * Live data hook for the Pagos fijos screen. Same shape as the cards
 * screen's `useCardAccounts`: live Dexie data in, pure computation out,
 * plus an error channel (the `useLive*` hooks do not expose errors
 * themselves) and a `retry` that re-runs the compute.
 */
import { useMemo, useState } from "react";
import { useLiveFixedPayments } from "@/hooks/useLiveFixedPayments";
import { useLiveSettings } from "@/hooks/useLiveSettings";
import { computeFixedPaymentsSummary } from "./computeFixedPaymentsSummary";
import type { FixedPaymentsSummary, SelectedMonth } from "./types";

export interface UseFixedPaymentsSummaryResult {
  summary: FixedPaymentsSummary | undefined;
  isLoading: boolean;
  error: Error | null;
  retry: () => void;
}

export function useFixedPaymentsSummary(
  selectedMonth: SelectedMonth,
): UseFixedPaymentsSummaryResult {
  const [attempt, setAttempt] = useState(0);

  const fixedPayments = useLiveFixedPayments();
  const settings = useLiveSettings();

  const retry = useMemo(() => () => setAttempt((prev) => prev + 1), []);

  return useMemo(() => {
    // `attempt` is read only to force re-computation on retry.
    void attempt;

    if (fixedPayments === undefined || settings === undefined) {
      return { summary: undefined, isLoading: true, error: null, retry };
    }

    try {
      const summary = computeFixedPaymentsSummary(
        fixedPayments,
        settings.currency,
        selectedMonth,
      );
      return { summary, isLoading: false, error: null, retry };
    } catch (cause) {
      const error =
        cause instanceof Error
          ? cause
          : new Error("No se pudieron calcular los pagos fijos", { cause });
      return { summary: undefined, isLoading: false, error, retry };
    }
  }, [fixedPayments, settings, selectedMonth, attempt, retry]);
}
