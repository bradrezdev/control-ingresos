/**
 * CardsScreen — control-ingresos (redesign-ui-2026, T5)
 *
 * Redesigned Tarjetas screen: header with the reorder help copy, hero
 * summary (Disponible total / Usado total / próximo vencimiento), and
 * the drag-reorderable list of card blocks. Sheets (create/edit form,
 * options menu, card detail, delete confirm) are owned by the page.
 */
import { Plus } from "lucide-react";
import { formatCurrency } from "@/lib/money/format";
import {
  HeroCard,
  IconButton,
  ScreenHeader,
  SettingsButton,
} from "@/components/ui/design";
import { Amount } from "@/components/ui/design";
import { useCardAccounts } from "./useCardAccounts";
import { CardList } from "./CardList";
import { CardsEmpty } from "./CardsEmpty";
import { CardsError } from "./CardsError";
import { CardsSkeleton } from "./CardsSkeleton";
import type { CardAccount } from "./types";

const REORDER_HELP =
  "Mantén presionada el asa y arrastra para ordenar por prioridad.";

export interface CardsScreenProps {
  onCreate: () => void;
  onOpenMenu: (account: CardAccount) => void;
  onOpenDetail: (account: CardAccount) => void;
}

export function CardsScreen({
  onCreate,
  onOpenMenu,
  onOpenDetail,
}: CardsScreenProps): React.JSX.Element {
  const { accounts, overview, isLoading, error, retry } = useCardAccounts();

  return (
    <main className="app-main flex flex-col gap-4">
      <ScreenHeader
        title="Tarjetas"
        subtitle={REORDER_HELP}
        right={
          <div className="flex items-center gap-2">
            <IconButton
              icon={<Plus className="size-5" strokeWidth={2} aria-hidden />}
              aria-label="Nueva tarjeta"
              onClick={onCreate}
            />
            <SettingsButton />
          </div>
        }
      />

      {isLoading ? (
        <CardsSkeleton />
      ) : error !== null ? (
        <CardsError message={error.message} onRetry={retry} />
      ) : accounts.length === 0 ? (
        <CardsEmpty onAdd={onCreate} />
      ) : (
        overview !== null && (
          <>
            <WalletHero overview={overview} />
            <CardList
              accounts={accounts}
              currency={overview.currency}
              onOpenMenu={onOpenMenu}
              onOpenDetail={onOpenDetail}
            />
          </>
        )
      )}
    </main>
  );
}

/**
 * Splits a formatted currency string into whole + fraction parts so the
 * main figure renders 44/800 with the decimals at 22/700 in the hero's
 * dim color (same treatment as the dashboard hero).
 */
function formatHeroParts(
  cents: number,
  currency: string,
): { whole: string; fraction: string } {
  const text = formatCurrency(cents, currency).replace(/^-/, "");
  const dotIndex = text.lastIndexOf(".");
  if (dotIndex === -1) return { whole: text, fraction: "" };
  return { whole: text.slice(0, dotIndex), fraction: text.slice(dotIndex) };
}

function nextDueLabel(bank: string, daysUntil: number): string {
  if (daysUntil === 0) return `${bank}, hoy`;
  if (daysUntil === 1) return `${bank}, mañana`;
  return `${bank}, en ${daysUntil} días`;
}

function WalletHero({
  overview,
}: {
  overview: NonNullable<ReturnType<typeof useCardAccounts>["overview"]>;
}): React.JSX.Element {
  const parts = formatHeroParts(overview.totalAvailableCents, overview.currency);

  return (
    <HeroCard className="p-5" aria-label="Resumen de tus tarjetas">
      <p className="text-aux text-hero-dim">Disponible total</p>
      <div className="flex items-baseline gap-1">
        <span className="text-figure font-extrabold tracking-tight text-hero-text">
          {parts.whole}
        </span>
        {parts.fraction ? (
          <span className="text-figure-fraction font-bold text-hero-dim">
            {parts.fraction}
          </span>
        ) : null}
      </div>

      <div className="mt-4 flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-col gap-0.5">
          <span className="text-aux text-hero-dim">Usado total</span>
          <Amount
            cents={overview.totalUsedCents}
            currency={overview.currency}
            className="text-title font-bold text-hero-text"
          />
        </div>
        {overview.nextDue ? (
          <div className="flex flex-col gap-0.5 text-right">
            <span className="text-aux text-hero-dim">Próximo vencimiento</span>
            <span className="text-body font-semibold text-hero-text">
              {nextDueLabel(overview.nextDue.bank, overview.nextDue.daysUntil)}
            </span>
          </div>
        ) : null}
      </div>
    </HeroCard>
  );
}
