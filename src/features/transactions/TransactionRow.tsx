import { parseISO } from "date-fns";
import { ListRow } from "@/components/ui/design/ListRow";
import { Amount } from "@/components/ui/design/Amount";
import { CategoryAvatar } from "@/components/ui/design/CategoryAvatar";
import { formatShortDay } from "@/lib/date/format";
import type { Card } from "@/db/schemas/card";
import type { TransactionListItem } from "./types";

const METHOD_LABEL: Record<string, string> = {
  cash: "Efectivo",
  debit: "Débito",
  credit: "Crédito",
  transfer: "Transferencia",
};

export interface TransactionRowProps {
  item: TransactionListItem;
  card?: Card | undefined;
  currency: string;
  onClick: () => void;
}

export function TransactionRow({
  item,
  card,
  currency,
  onClick,
}: TransactionRowProps): React.JSX.Element {
  const { tx, displayDate, displayAmount, installmentIndex, installmentTotal } = item;
  const isIncome = tx.type === "income";

  const accountLabel = card?.bank ?? METHOD_LABEL[tx.paymentMethod] ?? tx.paymentMethod;
  const subtitle = tx.category ? `${accountLabel} · ${tx.category}` : accountLabel;

  const msiBadge =
    tx.type === "expense_msi" ? (
      <span className="inline-flex h-5 items-center rounded-pill bg-cyan-bg px-2 text-chip font-semibold text-cyan">
        {installmentIndex !== undefined && installmentTotal !== undefined
          ? `${installmentIndex}/${installmentTotal} meses`
          : "MSI"}
      </span>
    ) : null;

  return (
    <ListRow
      title={tx.description}
      subtitle={subtitle}
      leading={<CategoryAvatar category={tx.category} />}
      onClick={onClick}
      trailing={
        <div className="flex flex-col items-end gap-0.5">
          <Amount
            cents={displayAmount}
            currency={currency}
            sign={isIncome ? "positive" : "negative"}
            {...(isIncome ? { prefix: "+" as const } : {})}
            className={`text-body font-bold ${isIncome ? "text-positive" : "text-ink"}`}
          />
          <div className="flex items-center gap-1.5">
            <span className="text-chip text-muted">{formatShortDay(parseISO(displayDate))}</span>
            {msiBadge}
          </div>
        </div>
      }
    />
  );
}
