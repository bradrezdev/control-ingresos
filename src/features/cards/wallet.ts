/**
 * Vista de la cartera — control-ingresos (Tarjetas · Mis finanzas)
 *
 * Convierte los datos vivos (tarjetas, movimientos, pagos fijos) en el
 * modelo de vista que consume la pantalla. Toda la aritmética vive en
 * `src/engine/wallet.ts`; aquí sólo se une y se ordena.
 *
 * Contrato de la referencia ejecutable (`Tarjetas-autonoma.html`) y de
 * `odd/tasks/tarjetas-mis-finanzas.md` (C1-C8).
 */
import { useMemo, useState } from "react";
import { useLiveCards } from "@/hooks/useLiveCards";
import { useLiveTransactions } from "@/hooks/useLiveTransactions";
import { useLiveFixedPayments } from "@/hooks/useLiveFixedPayments";
import { useLiveSettings } from "@/hooks/useLiveSettings";
import { useUiStore } from "@/stores/uiStore";
import {
  computeCardUsage,
  computeMsiPurchases,
  computeMsiTerms,
  computeNextDeadline,
  computePortfolio,
  computeUpcomingPayments,
  computeWalletCycle,
  referenceDate,
  type WalletCardUsage,
  type WalletCycle,
  type WalletDeadline,
  type WalletMsiPurchase,
  type WalletPayment,
  type WalletPortfolio,
} from "@/engine/wallet";
import type { Card, FixedPayment, Transaction } from "@/db/schemas";

/** Modelo de vista de la pantalla Tarjetas. */
export interface WalletView {
  /** Moneda de la cuenta (ISO-4217). */
  currency: string;
  /** Fecha de referencia de los cálculos. */
  referenceDate: Date;
  /** Tarjetas de la cartera, en orden de prioridad. */
  cards: Card[];
  /** Uso de crédito por tarjeta (mismo orden que `cards`). */
  usages: WalletCardUsage[];
  /** Totales de la cartera. */
  portfolio: WalletPortfolio;
  /** Próximos pagos con importe positivo, del más próximo al más lejano. */
  payments: WalletPayment[];
  /** Compra a meses activas de toda la cartera, de mayor a menor saldo. */
  purchases: WalletMsiPurchase[];
  /** Plazos disponibles como filtro (de mayor a menor). */
  terms: number[];
  /** Tarjeta retirada de la cartera (archivada). */
  archived: Card[];
  /** Tarjeta seleccionada. */
  selectedCardId: string | null;
  /** Uso de la tarjeta seleccionada. */
  selectedUsage: WalletCardUsage | null;
  /** Corte y próximo pago de la tarjeta seleccionada. */
  selectedDeadline: WalletDeadline | null;
  /** Ciclo en curso de la tarjeta seleccionada (corte, inicio y vencimiento). */
  selectedCycle: WalletCycle | null;
}

/** Estado de la pantalla: datos, seleccionado y errores. */
export interface UseWalletViewResult {
  view: WalletView | null;
  isLoading: boolean;
  error: Error | null;
  retry: () => void;
  /** Cambia la tarjeta seleccionada (persistido en `uiStore`). */
  selectCard: (cardId: string) => void;
}
export interface BuildWalletViewInput {
  cards: Card[];
  transactions: Transaction[];
  fixedPayments: FixedPayment[];
  currency: string;
  referenceDate: Date;
  selectedCardId: string | null;
}

/**
 * Construye el modelo de vista de la cartera.
 *
 * La selección cae en la primera tarjeta activa por prioridad cuando la
 * seleccionada ya no está en la cartera (archivada o borrada).
 */
export function buildWalletView({
  cards,
  transactions,
  fixedPayments,
  currency,
  referenceDate: ref,
  selectedCardId,
}: BuildWalletViewInput): WalletView {
  const usages = cards.map((card) => computeCardUsage(card, transactions, ref));
  const portfolio = computePortfolio(usages);
  const payments = computeUpcomingPayments(cards, transactions, fixedPayments, ref);
  const purchases = computeMsiPurchases(cards, transactions, ref);

  const active = selectedCardId
    ? cards.find((card) => card.id === selectedCardId)
    : undefined;
  const selected = active ?? cards[0] ?? null;
  const selectedUsage = selected
    ? usages.find((usage) => usage.card.id === selected.id) ?? null
    : null;
  const selectedDeadline =
    selected && selected.cardType === "credit"
      ? computeNextDeadline(selected, ref)
      : null;
  const selectedCycle =
    selected && selected.cardType === "credit"
      ? computeWalletCycle(selected, ref)
      : null;

  return {
    currency,
    referenceDate: ref,
    cards,
    usages,
    portfolio,
    payments,
    purchases,
    terms: computeMsiTerms(purchases),
    archived: [],
    selectedCardId: selected?.id ?? null,
    selectedUsage,
    selectedDeadline,
    selectedCycle,
  };
}

/**
 * Datos vivos de la cartera. Los hooks `useLive*` no exponen errores,
 * así que el canal de error es el try/catch del cómputo más un `retry`
 * que vuelve a lanzar el cálculo.
 */
export function useWalletView(): UseWalletViewResult {
  const [attempt, setAttempt] = useState(0);
  const cards = useLiveCards();
  const transactions = useLiveTransactions();
  const fixedPayments = useLiveFixedPayments();
  const settings = useLiveSettings();
  const selectedCardId = useUiStore((s) => s.selectedCardId);
  const setSelectedCardId = useUiStore((s) => s.setSelectedCardId);

  const result = useMemo(() => {
    // `attempt` se lee a propósito: el botón "Reintentar" lo incrementa
    // para volver a ejecutar este cálculo (puro y estable) después de
    // un fallo.
    void attempt;
    if (
      cards === undefined ||
      transactions === undefined ||
      fixedPayments === undefined ||
      settings === undefined
    ) {
      return { status: "loading" } as const;
    }
    try {
      const ref = referenceDate();
      const active = cards.filter((card) => card.archived !== true);
      const built = buildWalletView({
        cards: active,
        transactions,
        fixedPayments,
        currency: settings.currency,
        referenceDate: ref,
        selectedCardId,
      });
      return {
        status: "ready",
        view: {
          ...built,
          archived: cards.filter((card) => card.archived === true),
        },
      } as const;
    } catch (cause) {
      return {
        status: "error",
        error:
          cause instanceof Error
            ? cause
            : new Error("No se pudo leer la cartera guardada.", { cause }),
      } as const;
    }
  }, [cards, transactions, fixedPayments, settings, selectedCardId, attempt]);

  const retry = useMemo(() => () => setAttempt((prev) => prev + 1), []);

  return {
    view: result.status === "ready" ? result.view : null,
    isLoading: result.status === "loading",
    error: result.status === "error" ? result.error : null,
    retry,
    selectCard: setSelectedCardId,
  };
}
