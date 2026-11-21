import { Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Amount } from "@/components/ui/design/Amount";
import { ProgressTrack } from "@/components/ui/design/ProgressTrack";
import { CategoryAvatar } from "@/components/ui/design/CategoryAvatar";
import { formatDate } from "@/lib/date/format";
import { parseISO } from "date-fns";
import { getMsiMonthlyAmount } from "@/engine/msi";
import type { Card } from "@/db/schemas/card";
import type { TransactionListItem } from "./types";

export interface TransactionDetailProps {
  item: TransactionListItem | null;
  card?: Card | undefined;
  currency: string;
  onEdit: () => void;
  onDelete: () => void;
}

const TYPE_LABEL: Record<string, string> = {
  income: "Ingreso",
  expense: "Gasto",
  expense_msi: "Compra a meses",
};

export function TransactionDetail({
  item,
  card,
  currency,
  onEdit,
  onDelete,
}: TransactionDetailProps): React.JSX.Element | null {
  if (!item) return null;

  const { tx, displayDate, installmentIndex, installmentTotal } = item;
  const isMsi = tx.type === "expense_msi";
  const isIncome = tx.type === "income";

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col items-center gap-3 py-2">
        <CategoryAvatar category={tx.category} className="size-14 text-lg" />
        <h3 className="text-title font-bold text-primary text-center">{tx.description}</h3>
        <Amount
          cents={isIncome ? tx.amount : -tx.amount}
          currency={currency}
          sign={isIncome ? "positive" : "negative"}
          {...(isIncome ? { prefix: "+" as const } : {})}
          className={`text-secondary-figure font-extrabold ${isIncome ? "text-positive" : "text-ink"}`}
        />
        <span className="text-aux text-muted">{isMsi ? "Importe total de la compra" : "Importe del movimiento"}</span>
      </div>

      <dl className="grid grid-cols-[1fr_2fr] gap-y-3 text-body">
        <dt className="text-muted">Fecha del movimiento</dt>
        <dd className="text-ink text-right">{formatDate(parseISO(displayDate))}</dd>

        {installmentIndex !== undefined ? (
          <>
            <dt className="text-muted">Fecha de compra</dt>
            <dd className="text-ink text-right">{formatDate(parseISO(tx.date))}</dd>
          </>
        ) : null}

        <dt className="text-muted">Tarjeta</dt>
        <dd className="text-ink text-right">{card?.bank ?? "—"}</dd>

        <dt className="text-muted">Categoría</dt>
        <dd className="text-ink text-right">{tx.category ?? "—"}</dd>

        <dt className="text-muted">Tipo</dt>
        <dd className="text-ink text-right">{TYPE_LABEL[tx.type] ?? tx.type}</dd>
      </dl>

      {isMsi && installmentIndex !== undefined && installmentTotal !== undefined ? (
        <div className="flex flex-col gap-3 p-4 rounded-md bg-surface-inset">
          <div className="flex items-center justify-between">
            <span className="text-body font-semibold text-ink">Cuota mensual</span>
            <Amount cents={-getMsiMonthlyAmount(tx.amount, tx.msiMonths)} currency={currency} sign="negative" />
          </div>
          <div className="flex items-center justify-between text-aux text-muted">
            <span>Plazo</span>
            <span>{tx.msiMonths} meses</span>
          </div>
          <div className="flex items-center justify-between text-body font-semibold text-ink">
            <span>{`Cuota ${installmentIndex} de ${installmentTotal}`}</span>
          </div>
          <ProgressTrack fill={(installmentIndex / installmentTotal) * 100} />
        </div>
      ) : null}

      <div className="flex gap-3 pt-2">
        <Button type="button" variant="secondary" className="flex-1" onClick={onEdit} leftIcon={<Pencil className="size-4" strokeWidth={2} />}>
          Editar
        </Button>
        <Button type="button" variant="danger" className="flex-1" onClick={onDelete} leftIcon={<Trash2 className="size-4" strokeWidth={2} />}>
          Eliminar
        </Button>
      </div>
    </div>
  );
}
