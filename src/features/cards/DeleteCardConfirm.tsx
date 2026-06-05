/**
 * DeleteCardConfirm — control-ingresos
 *
 * Destructive-action confirmation modal for card removal. Renders a
 * plain confirmation message and a Cancel/Delete pair. The Delete
 * button is `variant="danger"` and a spinner replaces the label while
 * the store is mutating Dexie.
 */
import { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { useCardsStore } from "@/stores/cardsStore";
import type { Card } from "@/db/schemas/card";

export interface DeleteCardConfirmProps {
  card: Card | null;
  onClose: () => void;
}

export function DeleteCardConfirm({
  card,
  onClose,
}: DeleteCardConfirmProps): React.JSX.Element {
  const remove = useCardsStore((s) => s.remove);
  const [submitting, setSubmitting] = useState(false);

  async function onConfirm(): Promise<void> {
    if (!card || submitting) return;
    setSubmitting(true);
    try {
      await remove(card.id);
      onClose();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal
      open={!!card}
      onClose={submitting ? () => undefined : onClose}
      title="Eliminar tarjeta"
      size="sm"
      {...(card
        ? {
            description: `¿Eliminar la tarjeta de ${card.bank} (**** ${card.last4})? Esta acción no se puede deshacer.`,
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
