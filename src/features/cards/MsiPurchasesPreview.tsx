/**
 * MsiPurchasesPreview — control-ingresos (Tarjetas · Mis finanzas)
 *
 * Las tres compras a meses con mayor saldo restante entre todas las
 * tarjetas: miniatura de la tarjeta, descripción, emisor, cuotas por
 * cubrir y saldo pendiente. Si hay más de tres, la pantalla ofrece
 * "Ver las N" con la cantidad real.
 */
import { formatCurrency } from "@/lib/money/format";
import { MiniCard } from "./MiniCard";
import type { WalletMsiPurchase } from "@/engine/wallet";
import type { Card } from "@/db/schemas";

export interface MsiPurchasesPreviewProps {
  purchases: WalletMsiPurchase[];
  cards: Card[];
  currency: string;
}

export function MsiPurchasesPreview({
  purchases,
  cards,
  currency,
}: MsiPurchasesPreviewProps): React.JSX.Element {
  if (purchases.length === 0) {
    return <p className="text-aux text-muted">Sin compras a meses activas.</p>;
  }

  const cardById = new Map(cards.map((card) => [card.id, card]));

  return (
    <>
      <ul className="flex list-none flex-col p-0" role="list">
        {purchases.map((purchase) => {
          const card = cardById.get(purchase.cardId);
          return (
            <li
              key={purchase.id}
              className="flex min-h-16 items-center gap-3 border-t border-border-subtle py-2"
            >
              {card ? <MiniCard card={card} /> : null}
              <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                <b className="text-base font-semibold text-ink">
                  {purchase.description}
                </b>
                <span className="text-aux text-muted">
                  {purchase.cardName} · {purchase.installmentsLeft} cuotas por
                  cubrir
                </span>
              </span>
              <span className="flex shrink-0 flex-col items-end">
                <b className="text-base font-bold tabular-nums text-ink">
                  {formatCurrency(purchase.remainingCents, currency)}
                </b>
              </span>
            </li>
          );
        })}
      </ul>
    </>
  );
}
