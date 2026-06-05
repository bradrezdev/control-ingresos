/**
 * DeleteTransactionConfirm — control-ingresos
 *
 * Modal confirmation for deleting a transaction. Shows the
 * description + amount so the user has context.
 */
import { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { formatCurrency } from "@/lib/money/format";
import type { Transaction } from "@/db/schemas/transaction";

export interface DeleteTransactionConfirmProps {
  transaction: Transaction | null;
  currency: string;
  onConfirm: (tx: Transaction) => Promise<void> | void;
  onClose: () => void;
}

export function DeleteTransactionConfirm({
  transaction,
  currency,
  onConfirm,
  onClose,
}: DeleteTransactionConfirmProps): React.JSX.Element {
  const [busy, setBusy] = useState(false);
  const isOpen = !!transaction;

  async function handleConfirm(): Promise<void> {
    if (!transaction || busy) return;
    setBusy(true);
    try {
      await onConfirm(transaction);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal
      open={isOpen}
      onClose={busy ? () => undefined : onClose}
      title="Eliminar transacción"
      size="sm"
      {...(transaction
        ? {
            description: `¿Eliminar "${transaction.description}" (${formatCurrency(transaction.amount, currency)})? Esta acción no se puede deshacer.`,
          }
        : {})}
    >
      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="ghost" onClick={onClose} disabled={busy}>
          Cancelar
        </Button>
        <Button
          type="button"
          variant="danger"
          loading={busy}
          onClick={handleConfirm}
        >
          Eliminar
        </Button>
      </div>
    </Modal>
  );
}
