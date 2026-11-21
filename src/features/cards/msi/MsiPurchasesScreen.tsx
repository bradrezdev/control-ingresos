/**
 * MsiPurchasesScreen — control-ingresos (Tarjetas · Mis finanzas)
 *
 * Pantalla de "Compras a meses": resumen azul marino, filtro horizontal
 * de plazos y lista de compras activas navegables a su ficha.
 */
import { HeroCard, PaperCard, ScreenHeader, SectionHeading } from "@/components/ui/design";
import { MiniCard } from "@/features/cards/MiniCard";
import { formatCurrency } from "@/lib/money/format";
import { cn } from "@/lib/cn";
import { MsiTermFilter } from "./MsiTermFilter";
import type { WalletMsiPurchase } from "@/engine/wallet";
import type { Card } from "@/db/schemas";

export interface MsiPurchasesScreenProps {
  /** Mes que se muestra (YYYY-MM). */
  month: string;
  /** Compras visibles según el filtro actual. */
  purchases: WalletMsiPurchase[];
  /** Plazos disponibles, de mayor a menor. */
  terms: number[];
  /** Plazo seleccionado (null = sin filtro). */
  selectedTerm: number | null;
  /** Moneda de visualización. */
  currency: string;
  /** Tarjetas para pintar la miniatura de cada compra. */
  cards?: Card[];
  /** Cambia o quita el filtro de plazo. */
  onSelectTerm: (term: number | null) => void;
  /** Abre la ficha de la compra. */
  onOpenPurchase: (purchaseId: string, month: string) => void;
}

/** Parte la cifra en enteros y centavos para el tratamiento tipográfico. */
function splitAmount(cents: number, currency: string): {
  whole: string;
  fraction: string;
} {
  const text = formatCurrency(cents, currency).replace(/^-/, "");
  const dot = text.lastIndexOf(".");
  if (dot === -1) return { whole: text, fraction: "" };
  return { whole: text.slice(0, dot), fraction: text.slice(dot) };
}

function PurchaseRow({
  purchase,
  month,
  card,
  currency,
  onOpen,
}: {
  purchase: WalletMsiPurchase;
  month: string;
  card?: Card | undefined;
  currency: string;
  onOpen: (purchaseId: string, month: string) => void;
}): React.JSX.Element {
  return (
    <li className="border-t border-border-subtle first:border-t-0">
      <button
        type="button"
        onClick={() => onOpen(purchase.id, month)}
        className={cn(
          "flex min-h-16 w-full items-center gap-3 py-2 text-left",
          "transition-colors duration-fast ease-out-soft hover:bg-day",
        )}
      >
        {card ? <MiniCard card={card} /> : null}
        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
          <b className="text-base font-semibold text-ink">
            {purchase.description}
          </b>
          <span className="text-aux text-muted">
            {purchase.cardName} · {purchase.installmentsLeft} cuotas por cubrir
          </span>
        </span>
        <span className="flex shrink-0 flex-col items-end">
          <b className="text-base font-bold tabular-nums text-ink">
            {formatCurrency(purchase.remainingCents, currency)}
          </b>
        </span>
      </button>
    </li>
  );
}

export function MsiPurchasesScreen({
  month,
  purchases,
  terms,
  selectedTerm,
  currency,
  cards = [],
  onSelectTerm,
  onOpenPurchase,
}: MsiPurchasesScreenProps): React.JSX.Element {
  const totalRemaining = purchases.reduce(
    (sum, purchase) => sum + purchase.remainingCents,
    0,
  );
  const count = purchases.length;
  const parts = splitAmount(totalRemaining, currency);

  const cardById = new Map(cards.map((card) => [card.id, card]));

  const summaryLabel = selectedTerm
    ? `${count} ${count === 1 ? "compra activa" : "compras activas"} a ${selectedTerm} meses`
    : `${count} ${count === 1 ? "compra activa" : "compras activas"}`;

  const emptyMessage =
    selectedTerm === null
      ? "Sin compras a meses activas."
      : `Sin compras activas a ${selectedTerm} meses.`;

  return (
    <div className="flex flex-col gap-3.5">
      <ScreenHeader
        title="Compras a meses"
        back={{ to: "/cards", label: "Volver" }}
      />

      <HeroCard className="wallet-hero" aria-label="Resumen de compras a meses">
        <p className="text-aux text-wallet-hero-dim">Saldo restante estimado</p>
        <div className="flex items-baseline gap-1">
          <span className="text-figure font-extrabold tracking-tight text-wallet-hero-text">
            {parts.whole}
          </span>
          {parts.fraction ? (
            <span className="text-figure-fraction font-bold text-wallet-hero-dim">
              {parts.fraction}
            </span>
          ) : null}
        </div>
        <p className="text-aux text-wallet-hero-dim">{summaryLabel}</p>
      </HeroCard>

      {terms.length > 0 ? (
        <MsiTermFilter
          terms={terms}
          term={selectedTerm}
          onSelect={onSelectTerm}
        />
      ) : null}

      <PaperCard className="p-2.5 px-5 pb-5">
        <SectionHeading
          title="Compras activas"
          action={
            selectedTerm !== null ? (
              <button
                type="button"
                onClick={() => onSelectTerm(null)}
                className="inline-flex min-h-11 items-center text-aux font-semibold text-primary"
              >
                Quitar filtro
              </button>
            ) : null
          }
        />

        {purchases.length === 0 ? (
          <p className="mt-2 text-aux text-muted">{emptyMessage}</p>
        ) : (
          <ul className="mt-2 flex list-none flex-col p-0" role="list">
            {purchases.map((purchase) => (
              <PurchaseRow
                key={purchase.id}
                purchase={purchase}
                month={month}
                card={cardById.get(purchase.cardId)}
                currency={currency}
                onOpen={onOpenPurchase}
              />
            ))}
          </ul>
        )}
      </PaperCard>
    </div>
  );
}
