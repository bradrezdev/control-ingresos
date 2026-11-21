/**
 * DeleteFixedPaymentConfirm — control-ingresos
 *
 * Destructive-action confirmation modal for fixed payment removal. Mirrors
 * `DeleteCardConfirm`: plain message + Cancel/Delete pair; the Delete
 * button shows a spinner while the store is mutating Dexie.
 */
import { useCallback, useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { useFixedPaymentsStore } from "@/stores/fixedPaymentsStore";
import { useSettingsStore } from "@/stores/settingsStore";
import { formatCurrency } from "@/lib/money/format";
import type { FixedPayment } from "@/db/schemas/fixedPayment";

export interface DeleteFixedPaymentConfirmProps {
  fixedPayment: FixedPayment | null;
  onClose: () => void;
}

export function DeleteFixedPaymentConfirm({
  fixedPayment,
  onClose,
}: DeleteFixedPaymentConfirmProps): React.JSX.Element {
  const remove = useFixedPaymentsStore((s) => s.remove);
  const currency = useSettingsStore((s) => s.settings?.currency ?? "MXN");
  const [submitting, setSubmitting] = useState(false);

  // Stable close reference — `Modal` re-runs its focus effect when the
  // `onClose` identity changes, so an inline no-op would re-trigger it
  // on every render while submitting.
  const handleModalClose = useCallback(() => {
    if (!submitting) onClose();
  }, [submitting, onClose]);

  async function onConfirm(): Promise<void> {
    if (!fixedPayment || submitting) return;
    setSubmitting(true);
    try {
      await remove(fixedPayment.id);
      onClose();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal
      open={!!fixedPayment}
      onClose={handleModalClose}
      title="Eliminar pago fijo"
      size="sm"
      {...(fixedPayment
        ? {
            description: `¿Eliminar "${fixedPayment.description}" (${formatCurrency(fixedPayment.amount, currency)})? Esta acción no se puede deshacer.`,
          }
        : {})}
    >
      <div className="flex justify-end gap-2 pt-2">
        <Button variant="ghost" onClick={onClose} disabled={submitting}>
          Cancelar
        </Button>
        <Button
          variant="danger"
          onClick={onConfirm}
          loading={submitting}
          disabled={submitting}
        >
          Eliminar
        </Button>
      </div>
    </Modal>
  );
}
