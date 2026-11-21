/**
 * CardsSheets — control-ingresos (Tarjetas · Mis finanzas)
 *
 * Monta la hoja que pide la URL. La pantalla Tarjetas no abre hojas
 * con estado local: cada destino es una URL (`?sheet=…&id=…`), así que
 * un enlace recargado devuelve el mismo contexto (S14) y el foco
 * vuelve al control de origen al cerrar (S15).
 *
 * Contrato de URL:
 *
 *   ?sheet=card&id=<cardId>&tab=resumen|actividad|msi  ficha
 *   ?sheet=payment&id=<cardId>                         desglose del pago
 *   ?sheet=credit                                       cómo se estima
 *   ?sheet=reorder                                      ordenar la cartera
 *   ?sheet=archived                                     tarjetas archivadas
 *   ?sheet=menu&id=<cardId>                             opciones
 *   ?sheet=remove&id=<cardId>                           confirmar archiving
 *   ?sheet=new                                          alta de tarjeta
 *   ?sheet=edit&id=<cardId>                             edición de tarjeta
 */
import { useCallback, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { cardsRepo } from "@/db/repositories";
import { useLiveTransactions } from "@/hooks/useLiveTransactions";
import { computeCardUsage, referenceDate } from "@/engine/wallet";
import type { CardInput } from "@/db/schemas";
import { useWalletView } from "./wallet";
import { ArchiveCardConfirm } from "./sheets/ArchiveCardConfirm";
import { ArchivedCardsSheet } from "./sheets/ArchivedCardsSheet";
import { CardDetailSheet } from "./sheets/CardDetailSheet";
import { CardFormSheet } from "./sheets/CardFormSheet";
import { CardOptionsMenu } from "./sheets/CardOptionsMenu";
import { CreditInfoSheet } from "./sheets/CreditInfoSheet";
import { PaymentDetailSheet } from "./sheets/PaymentDetailSheet";
import { ReorderSheet } from "./sheets/ReorderSheet";

type CardTab = "resumen" | "actividad" | "msi";

const TABS: CardTab[] = ["resumen", "actividad", "msi"];

function isCardTab(value: string | null): value is CardTab {
  return value !== null && (TABS as string[]).includes(value);
}

/** "YYYY-MM-DD" de una fecha UTC. */
function isoDay(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function CardsSheets(): React.JSX.Element | null {
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const { view, selectCard } = useWalletView();
  const transactions = useLiveTransactions();

  const sheet = params.get("sheet");
  const id = params.get("id");
  const rawTab = params.get("tab");
  const tab: CardTab = isCardTab(rawTab) ? rawTab : "resumen";

  const updateParams = useCallback(
    (next: Record<string, string | null>) => {
      const copy = new URLSearchParams(params);
      for (const [key, value] of Object.entries(next)) {
        if (value === null) copy.delete(key);
        else copy.set(key, value);
      }
      setParams(copy);
    },
    [params, setParams],
  );

  const close = useCallback(
    () => updateParams({ sheet: null, id: null, tab: null }),
    [updateParams],
  );

  const openSheet = useCallback(
    (next: Record<string, string | null>) =>
      updateParams({ sheet: null, id: null, tab: null, ...next }),
    [updateParams],
  );

  const activeCards = useMemo(() => view?.cards ?? [], [view]);
  const archivedCards = useMemo(() => view?.archived ?? [], [view]);
  const card = useMemo(
    () => activeCards.find((c) => c.id === id) ?? archivedCards.find((c) => c.id === id),
    [activeCards, archivedCards, id],
  );

  const cardTransactions = useMemo(
    () =>
      (transactions ?? []).filter(
        (tx) => "cardId" in tx && tx.cardId === id,
      ),
    [transactions, id],
  );

  const plans = useMemo(() => {
    if (!card || card.cardType !== "credit") return [];
    return computeCardUsage(card, cardTransactions, referenceDate()).plans;
  }, [card, cardTransactions]);

  const payment = useMemo(
    () => (view?.payments ?? []).find((item) => item.card.id === id) ?? null,
    [view, id],
  );

  if (sheet === null || view === null) return null;

  switch (sheet) {
    case "credit":
      return <CreditInfoSheet onClose={close} />;

    case "card":
      if (!card) return null;
      return (
        <CardDetailSheet
          card={card}
          tab={tab}
          onTabChange={(next) => updateParams({ tab: next })}
          transactions={cardTransactions}
          plans={plans}
          payment={payment}
          currency={view.currency}
          onClose={close}
          onEdit={() => openSheet({ sheet: "edit", id: card.id })}
          onViewHistory={() => {
            const dates = cardTransactions.map((tx) => tx.date).sort();
            const from = dates[0] ?? isoDay(referenceDate());
            const to = isoDay(referenceDate());
            void navigate(`/transactions?card=${card.id}&from=${from}&to=${to}`);
          }}
        />
      );

    case "payment":
      if (!payment) return null;
      return (
        <PaymentDetailSheet
          payment={payment}
          currency={view.currency}
          onClose={close}
          onOpenCard={() => openSheet({ sheet: "card", id: payment.card.id, tab: "resumen" })}
        />
      );

    case "menu":
      if (!card) return null;
      return (
        <CardOptionsMenu
          card={card}
          canReorder={activeCards.length > 1}
          onClose={close}
          onOpenDetail={() => openSheet({ sheet: "card", id: card.id, tab: "resumen" })}
          onEdit={() => openSheet({ sheet: "edit", id: card.id })}
          onReorder={() => openSheet({ sheet: "reorder" })}
          onArchive={() => openSheet({ sheet: "remove", id: card.id })}
        />
      );

    case "reorder":
      return (
        <ReorderSheet
          cards={activeCards}
          onClose={close}
          onSave={async (orderedIds) => {
            await cardsRepo.reorder(orderedIds);
            close();
          }}
        />
      );

    case "archived":
      return (
        <ArchivedCardsSheet
          cards={archivedCards}
          onClose={close}
          onRestore={async (cardId) => {
            await cardsRepo.restore(cardId);
            close();
          }}
        />
      );

    case "remove":
      if (!card) return null;
      return (
        <ArchiveCardConfirm
          card={card}
          onClose={close}
          onConfirm={async () => {
            await cardsRepo.archive(card.id);
            close();
          }}
        />
      );

    case "new":
    case "edit": {
      const existingNames = [...activeCards, ...archivedCards]
        .filter((other) => other.id !== card?.id)
        .map((other) => other.bank);
      return (
        <CardFormSheet
          {...(card ? { card } : {})}
          existingNames={existingNames}
          onClose={close}
          onSubmit={async (input: CardInput) => {
            if (card) {
              await cardsRepo.update(card.id, input);
              selectCard(card.id);
            } else {
              const lastPriority = activeCards.reduce(
                (max, other) => Math.max(max, other.priority),
                -1,
              );
              const created = await cardsRepo.create({
                ...input,
                priority: lastPriority + 1,
              });
              selectCard(created.id);
            }
            close();
          }}
        />
      );
    }

    default:
      return null;
  }
}
