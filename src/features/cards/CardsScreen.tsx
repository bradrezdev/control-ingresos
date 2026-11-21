/**
 * CardsScreen — control-ingresos (Tarjetas · Mis finanzas)
 *
 * La pantalla de la cartera, en el orden de la referencia ejecutable:
 *
 *   1. Encabezado ("Tarjetas" + nueva tarjeta + ajustes)
 *   2. Alerta de vencimiento (cápsula ámbar)
 *   3. Resumen de crédito (azul marino)
 *   4. Mi cartera (selector, plástico, disponible, barra, corte, próximo
 *      pago y menú de opciones)
 *   5. Próximos pagos
 *   6. Compras a meses
 *   7. Pie (moneda, fecha de los datos, tarjetas archivadas)
 *
 * Cada bloque va en su propia tarjeta blanca de 24 px de radio, con
 * 14 px de separación entre bloques (`DESIGN-RULES` §1 y §4).
 */
import { MoreHorizontal, Plus, SlidersHorizontal } from "lucide-react";
import { Link } from "react-router";
import {
  IconButton,
  PaperCard,
  ProgressTrack,
  ScreenHeader,
  SectionHeading,
} from "@/components/ui/design";
import { formatCurrency } from "@/lib/money/format";
import { formatShortDay, utcDateToLocal } from "@/lib/date/format";
import { cn } from "@/lib/cn";
import { CardPlastic } from "./CardPlastic";
import { CardSelector } from "./CardSelector";
import { CreditSummary } from "./CreditSummary";
import { DueAlert } from "./DueAlert";
import { MsiPurchasesPreview } from "./MsiPurchasesPreview";
import { UpcomingPayments } from "./UpcomingPayments";
import { WalletFooter } from "./WalletFooter";
import type { WalletPayment } from "@/engine/wallet";
import type { WalletView } from "./wallet";

export interface CardsScreenProps {
  view: WalletView;
  onCreate: () => void;
  onSelectCard: (cardId: string) => void;
  onOpenInfo: () => void;
  onOpenPayment: (payment: WalletPayment) => void;
  onOpenCard: (cardId: string) => void;
  onOpenMenu: (cardId: string) => void;
  onOpenReorder: () => void;
  onOpenArchived: () => void;
  onOpenAllPurchases: () => void;
}

/** Tono de la barra de uso: ≤60 principal, 61-85 ámbar, >85 alerta. */
function usageTone(percent: number): "primary" | "warning" | "danger" {
  if (percent > 85) return "danger";
  if (percent > 60) return "warning";
  return "primary";
}

/**
 * Acceso a Ajustes. La referencia usa el pictograma de filtros, no el
 * engranaje: son dos controles de 44 px separados por 8 px.
 */
function AjustesButton(): React.JSX.Element {
  return (
    <Link
      to="/settings"
      aria-label="Ajustes"
      className={cn(
        "inline-flex size-11 shrink-0 items-center justify-center rounded-full",
        "bg-surface text-primary",
        "transition-colors duration-fast ease-out-soft",
        "hover:bg-day",
      )}
    >
      <SlidersHorizontal className="size-5" aria-hidden strokeWidth={2} />
    </Link>
  );
}

export function CardsScreen({
  view,
  onCreate,
  onSelectCard,
  onOpenInfo,
  onOpenPayment,
  onOpenCard,
  onOpenMenu,
  onOpenReorder,
  onOpenArchived,
  onOpenAllPurchases,
}: CardsScreenProps): React.JSX.Element {
  const alert = view.payments[0] ?? null;
  const selected = view.selectedUsage;
  const selectedCard = selected?.card ?? null;

  return (
    <div className="flex flex-col gap-3.5">
      <ScreenHeader
        title="Tarjetas"
        right={
          <div className="flex items-center gap-2">
            <IconButton
              icon={<Plus className="size-5" strokeWidth={2} aria-hidden />}
              aria-label="Nueva tarjeta"
              onClick={onCreate}
            />
            <AjustesButton />
          </div>
        }
      />

      {alert ? (
        <DueAlert
          payment={alert}
          currency={view.currency}
          onOpen={() => onOpenPayment(alert)}
        />
      ) : null}

      <CreditSummary
        portfolio={view.portfolio}
        currency={view.currency}
        onOpenInfo={onOpenInfo}
      />

      <PaperCard className="p-2.5 px-5 pb-5">
        <SectionHeading
          title="Mi cartera"
          action={
            view.cards.length > 1 ? (
              <button
                type="button"
                onClick={onOpenReorder}
                className="inline-flex min-h-11 items-center text-aux font-semibold text-primary"
              >
                Reordenar
              </button>
            ) : null
          }
        />

        {view.cards.length === 0 ? (
          <>
            <p className="mt-1 text-aux text-muted">
              Aún no tienes tarjetas registradas.
            </p>
            <button
              type="button"
              onClick={onCreate}
              className="mt-2 inline-flex min-h-11 items-center text-aux font-semibold text-primary"
            >
              Agregar tarjeta
            </button>
          </>
        ) : (
          <>
            <div className="mt-3">
              <CardSelector
                cards={view.cards}
                selectedId={view.selectedCardId}
                onSelect={onSelectCard}
              />
            </div>

            {selectedCard && selected ? (
              <>
                <div className="mt-3">
                  <CardPlastic
                    card={selectedCard}
                    onOpenDetail={() => onOpenCard(selectedCard.id)}
                    onSwipe={(direction) => {
                      const index = view.cards.findIndex(
                        (card) => card.id === view.selectedCardId,
                      );
                      if (index < 0 || view.cards.length === 0) return;
                      const next =
                        view.cards[
                          (index + direction + view.cards.length) %
                            view.cards.length
                        ];
                      if (next) onSelectCard(next.id);
                    }}
                  />
                </div>

                <div className="mt-3 flex items-baseline justify-between gap-3">
                  <span className="text-aux text-muted">
                    Disponible estimado
                  </span>
                  <b className="text-lg font-bold tabular-nums text-ink">
                    {formatCurrency(selected.availableCents, view.currency)}
                  </b>
                </div>

                <ProgressTrack
                  fill={selected.percent}
                  tone={usageTone(selected.percent)}
                  size="sm"
                  className="mt-2"
                  aria-label={`Uso de ${selectedCard.bank}`}
                />

                <div className="mt-1.5 flex items-baseline justify-between gap-2 text-xs text-muted">
                  <span>
                    Usado{" "}
                    <b className="font-semibold text-ink">{selected.percent}%</b>
                  </span>
                  <span>
                    {formatCurrency(selected.usedCents, view.currency)} de{" "}
                    {formatCurrency(selected.limitCents, view.currency)}
                  </span>
                </div>

                <div className="mt-3 flex items-end justify-between gap-3 border-t border-border-subtle pt-3">
                  <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <span className="text-aux text-muted">Corte</span>
                    <span className="whitespace-nowrap text-base font-bold tabular-nums text-ink">
                      {view.selectedCycle
                        ? formatShortDay(
                            utcDateToLocal(view.selectedCycle.cut),
                          )
                        : "—"}
                    </span>
                  </div>
                  <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <span className="text-aux text-muted">Próximo pago</span>
                    <span className="whitespace-nowrap text-base font-bold tabular-nums text-ink">
                      {view.selectedDeadline
                        ? formatShortDay(
                            utcDateToLocal(view.selectedDeadline.due),
                          )
                        : "—"}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => onOpenMenu(selectedCard.id)}
                    aria-label={`Opciones de ${selectedCard.bank}`}
                    className={cn(
                      "-mr-2 grid size-11 shrink-0 place-items-center rounded-full",
                      "text-muted transition-colors duration-fast hover:bg-day",
                    )}
                  >
                    <MoreHorizontal className="size-5" strokeWidth={2} aria-hidden />
                  </button>
                </div>
              </>
            ) : null}
          </>
        )}
      </PaperCard>

      {view.cards.length > 0 ? (
        <>
          <PaperCard className="p-2.5 px-5 pb-5">
            <SectionHeading title="Próximos pagos" />
            <div className="mt-2">
              <UpcomingPayments
                payments={view.payments}
                currency={view.currency}
                onOpen={onOpenPayment}
              />
            </div>
          </PaperCard>

          <PaperCard className="p-2.5 px-5 pb-5">
            <SectionHeading
              title="Compras a meses"
              action={
                view.purchases.length > 3 ? (
                  <button
                    type="button"
                    onClick={onOpenAllPurchases}
                    className="inline-flex min-h-11 items-center text-aux font-semibold text-primary"
                  >
                    Ver las {view.purchases.length}
                  </button>
                ) : null
              }
            />
            <div className="mt-2">
              <MsiPurchasesPreview
                purchases={view.purchases.slice(0, 3)}
                cards={view.cards}
                currency={view.currency}
              />
            </div>
          </PaperCard>
        </>
      ) : null}

      <WalletFooter
        currency={view.currency}
        referenceDate={view.referenceDate}
        archivedCount={view.archived.length}
        onOpenArchived={onOpenArchived}
      />
    </div>
  );
}
