/**
 * DebtList — control-ingresos
 *
 * Simple list of debts. No drag-and-drop. The list reads from the
 * `useLiveDebts` Dexie hook so any external change (including from the
 * store's write-through) reflects immediately.
 */
import { Coins } from "lucide-react";
import { EmptyState } from "@/components/feedback/EmptyState";
import { Skeleton } from "@/components/ui/Skeleton";
import { useLiveDebts } from "@/hooks/useLiveDebts";
import type { Debt } from "@/db/schemas/debt";
import { DebtListItem } from "./DebtListItem";

interface DebtListProps {
  onEdit: (debt: Debt) => void;
  onDelete: (debt: Debt) => void;
  onPayMonthly: (debt: Debt) => void;
}

export function DebtList({
  onEdit,
  onDelete,
  onPayMonthly,
}: DebtListProps): React.JSX.Element {
  const liveDebts = useLiveDebts();

  if (!liveDebts) {
    return (
      <div className="space-y-3" role="status" aria-label="Cargando deudas">
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="h-28 w-full" rounded="lg" />
        ))}
      </div>
    );
  }

  if (liveDebts.length === 0) {
    return (
      <EmptyState
        icon={<Coins className="size-5" aria-hidden />}
        title="No tenés deudas registradas"
        description="Las deudas son préstamos o financiamientos a meses que querés trackear. Empezá creando la primera."
      />
    );
  }

  return (
    <ul
      className="space-y-3 list-none p-0"
      role="list"
      aria-label="Deudas"
    >
      {liveDebts.map((debt) => (
        <li key={debt.id}>
          <DebtListItem
            debt={debt}
            onEdit={onEdit}
            onDelete={onDelete}
            onPayMonthly={onPayMonthly}
          />
        </li>
      ))}
    </ul>
  );
}
