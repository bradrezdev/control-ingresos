/**
 * CardBlock — control-ingresos (redesign-ui-2026, T5)
 *
 * The redesigned card "object": a full-width block with the prototype's
 * 1.586:1 proportions and a flat, sober bank-tinted face (name 20/700,
 * holder, card type — the schema has no `last4` field). Tapping the face
 * opens the card detail sheet.
 *
 * Below the face: the 8px usage bar with "Usado $X de $Y, Z%" (the
 * percent always in text), and the data row with the 44px drag handle,
 * Corte / Pago (+ status chip) / Disponible, and the 44px options
 * button. Debit cards render only what applies to them — no cycle, no
 * limit, no usage bar.
 */
import type { Ref } from "react";
import { ChevronRight, GripVertical, MoreHorizontal } from "lucide-react";
import { Amount, PaperCard, ProgressTrack, StatusPill } from "@/components/ui/design";
import { formatDayAndMonth } from "@/lib/date/format";
import { toLocalDay } from "./computeCardAccount";
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
      className={isDragging ? "p-5 opacity-40 transition-opacity duration-fast" : "p-5"}
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
          <p className="mt-1.5 text-aux text-muted">
            Usado{" "}
            <Amount
              cents={account.usedCents ?? 0}
              currency={currency}
              className="font-semibold text-ink"
            />{" "}
            de{" "}
            <Amount
              cents={account.limitCents}
              currency={currency}
              className="font-semibold text-ink"
            />
            ,{" "}
            <span className="font-semibold text-ink">{account.usedPercent}%</span>
          </p>
        </div>
      ) : isCredit ? (
        <p className="mt-4 text-aux text-muted">
          Usado{" "}
          <Amount
            cents={account.usedCents ?? 0}
            currency={currency}
            className="font-semibold text-ink"
          />{" "}
          este mes · sin límite registrado
        </p>
      ) : null}

      <div className="mt-4 grid grid-cols-[44px_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_44px] items-center gap-1 border-t border-border-subtle pt-3">
        <div
          ref={handleRef}
          data-dnd-handle
          aria-label="Arrastrar para reordenar"
          className="grid size-11 cursor-grab touch-none select-none place-items-center rounded-md text-muted active:cursor-grabbing"
        >
          <GripVertical className="size-5" strokeWidth={2} aria-hidden />
        </div>

        {isCredit ? (
          <>
            <DataCell label="Corte" value={`Día ${card.cutDay}`} />
            <DataCell
              label="Pago"
              value={
                account.paymentDate !== null
                  ? formatDayAndMonth(toLocalDay(account.paymentDate))
                  : "—"
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
              label="Disponible"
              value={
                account.availableCents !== null ? (
                  <Amount
                    cents={account.availableCents}
                    currency={currency}
                    className="tabular-nums"
                  />
                ) : (
                  "Sin límite"
                )
              }
            />
          </>
        ) : (
          <p className="col-span-3 text-aux text-muted">
            Tarjeta de débito · sin ciclo de corte ni límite
          </p>
        )}

        <button
          type="button"
          onClick={() => onOpenMenu(account)}
          aria-label={`Opciones de ${card.bank}`}
          className="grid size-11 place-items-center rounded-full text-muted transition-colors duration-fast hover:bg-day"
        >
          <MoreHorizontal className="size-5" strokeWidth={2} aria-hidden />
        </button>
      </div>
    </PaperCard>
  );
}

interface DataCellProps {
  label: string;
  value: React.ReactNode;
  chip?: React.ReactNode;
}

function DataCell({ label, value, chip }: DataCellProps): React.JSX.Element {
  return (
    <div className="flex min-w-0 flex-col gap-0.5">
      <span className="text-chip font-semibold text-muted">{label}</span>
      <span className="text-[13px] font-semibold text-ink tabular-nums break-words">
        {value}
      </span>
      {chip}
    </div>
  );
}
