/**
 * FixedPaymentList — control-ingresos
 *
 * Reads fixed payments via the reactive `useLiveFixedPayments` hook. Shows
 * a Skeleton while Dexie hasn't returned, an EmptyState when the list is
 * empty, and a `<ul>` of `FixedPaymentListItem` otherwise.
 */
import { CalendarDays } from "lucide-react";
import { EmptyState } from "@/components/feedback/EmptyState";
import { Skeleton } from "@/components/ui/Skeleton";
import { useLiveFixedPayments } from "@/hooks/useLiveFixedPayments";
import type { FixedPayment } from "@/db/schemas/fixedPayment";
import { FixedPaymentListItem } from "./FixedPaymentListItem";

interface FixedPaymentListProps {
  onEdit: (fp: FixedPayment) => void;
  onDelete: (fp: FixedPayment) => void;
}

export function FixedPaymentList({
  onEdit,
  onDelete,
}: FixedPaymentListProps): React.JSX.Element {
  const fixedPayments = useLiveFixedPayments();

  if (!fixedPayments) {
    return (
      <div className="space-y-3" role="status" aria-label="Cargando pagos fijos">
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="h-20 w-full" rounded="lg" />
        ))}
      </div>
    );
  }

  if (fixedPayments.length === 0) {
    return (
      <EmptyState
        icon={<CalendarDays className="size-5" aria-hidden />}
        title="No tenés pagos fijos registrados"
        description="Sumá rentas, servicios o suscripciones para verlos reflejados en tu presupuesto del mes."
      />
    );
  }

  return (
    <ul className="space-y-3 list-none p-0" role="list" aria-label="Pagos fijos">
      {fixedPayments.map((fp) => (
        <FixedPaymentListItem
          key={fp.id}
          fixedPayment={fp}
          onEdit={onEdit}
          onDelete={onDelete}
        />
      ))}
    </ul>
  );
}
