/**
 * DeleteCardConfirm — control-ingresos
 *
 * Destructive-action confirmation modal for card removal. Tells the user
 * how many transactions of that card will be affected before they
 * confirm, then removes the card through the store (Dexie keeps the
 * transactions themselves; they simply lose their card association).
 */
import { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { useCardsStore } from "@/stores/cardsStore";
import type { Card } from "@/db/schemas/card";

export interface DeleteCardConfirmProps {
  card: Card | null;
  /** Transactions associated with the card being deleted. */
  affectedCount: number;
  onClose: () => void;
}

function affectedSentence(count: number): string {
  if (count <= 0) return "No hay transacciones asociadas a esta tarjeta.";
  if (count === 1) return "1 transacción se verá afectada.";
  return `${count} transacciones se verán afectadas.`;
}

export function DeleteCardConfirm({
  card,
  affectedCount,
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
            description: `¿Eliminar la tarjeta de ${card.bank}? ${affectedSentence(affectedCount)} Esta acción no se puede deshacer.`,
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
