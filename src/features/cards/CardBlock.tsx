/**
 * CardBlock — control-ingresos (redesign-ui-2026, T5)
 *
 * The redesigned card "object": a full-width block with the prototype's
 * 1.586:1 proportions and a flat, sober bank-tinted face (name 20/700,
 * holder, card type — the schema has no `last4` field). Tapping the face
 * opens the card detail sheet.
 *
 * Below the face: the 8px usage bar, an affordance row with the 44px drag
 * handle, the usage summary and the 44px options button, and the cycle row
 * with Corte / Pago (+ status chip) / Disponible. Debit cards render only
 * what applies to them — no cycle, no limit, no usage bar.
 */
import type { Ref } from "react";
import { ChevronRight, GripVertical, MoreHorizontal } from "lucide-react";
import { Amount, PaperCard, ProgressTrack, StatusPill } from "@/components/ui/design";
import { cn } from "@/lib/cn";
import { formatDayAndMonth, formatShortDay, utcDateToLocal } from "@/lib/date/format";
import { tintFor } from "./bankTint";
import type { CardAccount } from "./types";

export interface CardBlockProps {
  account: CardAccount;
  currency: string;
  /**
   * Attached to the drag handle so the parent list can register it as
   * the exclusive drag start point (`draggable({ dragHandle })`).
   */
  handleRef?: Ref<HTMLDivElement>;
  isDragging?: boolean;
  onOpenDetail: (account: CardAccount) => void;
  onOpenMenu: (account: CardAccount) => void;
}

const TYPE_LABEL = {
  credit: "Crédito",
  debit: "Débito",
} as const;

export function CardBlock({
  account,
  currency,
  handleRef,
  isDragging = false,
  onOpenDetail,
  onOpenMenu,
}: CardBlockProps): React.JSX.Element {
  const { card, isCredit } = account;
  const tint = tintFor(card.bank);
  const typeLabel = TYPE_LABEL[card.cardType ?? "credit"];

  return (
    <PaperCard
      aria-label={card.bank}
      className={
        isDragging
          ? "@container p-5 opacity-40 transition-opacity duration-fast"
          : "@container p-5"
      }
    >
      <button
        type="button"
        onClick={() => onOpenDetail(account)}
        aria-label={`Ver detalle de ${card.bank}`}
        className="relative flex aspect-[1.586/1] w-full flex-col justify-between gap-1 border rounded-md p-4 text-left transition-transform duration-fast ease-out-soft hover:-translate-y-px"
        style={{
          backgroundColor: tint.face.bg,
          color: tint.face.ink,
          borderColor: tint.face.edge,
        }}
      >
        <span
          className="text-[11px] font-semibold uppercase tracking-widest"
          style={{ color: tint.face.muted }}
        >
          {typeLabel}
        </span>
        <span className="min-w-0">
          <span className="block truncate text-[20px] font-bold leading-tight tracking-tight">
            {card.bank}
          </span>
          <span
            className="mt-0.5 block truncate text-[13px] font-medium"
            style={{ color: tint.face.muted }}
          >
            {card.holderName}
          </span>
        </span>
        <ChevronRight
          className="absolute right-4 bottom-4 size-4"
          style={{ color: tint.face.muted }}
          strokeWidth={2}
          aria-hidden
        />
      </button>

      {isCredit && account.limitCents !== null ? (
        <div className="mt-4">
          <ProgressTrack
            fill={account.usedPercent ?? 0}
            tone={account.usageTone ?? "primary"}
            className="h-2"
            aria-label={`Uso de ${card.bank}`}
          />
        </div>
      ) : null}

      {/* Affordance row: the 44px drag handle and the card options flank the
          usage summary. Keeping them out of the cycle row leaves the full
          card width for Corte / Pago / Disponible (no mid-word breaks at
          360px). The summary wraps between words; amounts never do. */}
      <div className="mt-2 flex items-center gap-2">
        <div
          ref={handleRef}
          data-dnd-handle
          aria-label="Arrastrar para reordenar"
          className="-ml-2 grid size-11 shrink-0 cursor-grab touch-none select-none place-items-center rounded-md text-muted active:cursor-grabbing"
        >
          <GripVertical className="size-5" strokeWidth={2} aria-hidden />
        </div>

        <p className="min-w-0 flex-1 text-aux text-muted">
          {isCredit ? (
            account.limitCents !== null ? (
              <>
                Usado{" "}
                <Amount
                  cents={account.usedCents ?? 0}
                  currency={currency}
                  className="whitespace-nowrap font-semibold text-ink"
                />{" "}
                de{" "}
                <Amount
                  cents={account.limitCents}
                  currency={currency}
                  className="whitespace-nowrap font-semibold text-ink"
                />
                ,{" "}
                <span className="whitespace-nowrap font-semibold text-ink">
                  {account.usedPercent}%
                </span>
              </>
            ) : (
              <>
                Usado{" "}
                <Amount
                  cents={account.usedCents ?? 0}
                  currency={currency}
                  className="whitespace-nowrap font-semibold text-ink"
                />{" "}
                este mes · sin límite registrado
              </>
            )
          ) : (
            <>Tarjeta de débito · sin ciclo de corte ni límite</>
          )}
        </p>

        <button
          type="button"
          onClick={() => onOpenMenu(account)}
          aria-label={`Opciones de ${card.bank}`}
          className="-mr-2 grid size-11 shrink-0 place-items-center rounded-full text-muted transition-colors duration-fast hover:bg-day"
        >
          <MoreHorizontal className="size-5" strokeWidth={2} aria-hidden />
        </button>
      </div>

      {isCredit ? (
        <div className="mt-3 flex items-start gap-2.5 border-t border-border-subtle pt-3">
          <DataCell className="shrink-0" label="Corte" value={`Día ${card.cutDay}`} />
          <DataCell
            className="min-w-0 flex-1"
            label="Pago"
            value={
              account.paymentDate !== null ? (
                <ShortableDate date={utcDateToLocal(account.paymentDate)} />
              ) : (
                "—"
              )
            }
            chip={
              account.paymentChip ? (
                <StatusPill tone={account.paymentChip.tone}>
                  {account.paymentChip.label}
                </StatusPill>
              ) : undefined
            }
          />
          <DataCell
            className="shrink-0 text-right"
            label="Disponible"
            value={
              account.availableCents !== null ? (
                <Amount
                  cents={account.availableCents}
                  currency={currency}
                  className="whitespace-nowrap"
                />
              ) : (
                "Sin límite"
              )
            }
          />
        </div>
      ) : null}
    </PaperCard>
  );
}

/**
 * Payment date that never breaks: long format ("7 de diciembre") with a
 * container-query fallback to the short form ("7 dic") when the card is
 * too narrow (320px viewports). Only one of the two spans is displayed;
 * display:none keeps the inactive one out of the accessibility tree.
 */
function ShortableDate({ date }: { date: Date }): React.JSX.Element {
  return (
    <span className="whitespace-nowrap">
      <span className="hidden @max-[259px]:inline">
        {formatDayAndMonth(date)}
      </span>
      <span className="@max-[259px]:hidden">{formatShortDay(date)}</span>
    </span>
  );
}

interface DataCellProps {
  label: string;
  value: React.ReactNode;
  chip?: React.ReactNode;
  className?: string;
}

function DataCell({ label, value, chip, className }: DataCellProps): React.JSX.Element {
  return (
    <div className={cn("flex min-w-0 flex-col gap-0.5", className)}>
      <span className="text-aux text-muted">{label}</span>
      <span className="whitespace-nowrap text-body font-semibold tabular-nums text-ink">
        {value}
      </span>
      {chip}
    </div>
  );
}
