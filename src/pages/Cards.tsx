/**
 * Cards — control-ingresos
 *
 * F5.2 — Manage credit cards. Top-level page that:
 *   1. Shows the live list (drag-and-drop reorderable).
 *   2. Hosts a Drawer with `CardForm` for create/edit.
 *   3. Hosts a Modal for delete confirmation.
 *
 * The page keeps ephemeral UI state (which card is being edited /
 * deleted / created) in local state. Dexie is the source of truth
 * for the data; the store and `useLiveCards` reflect writes.
 */
import { useState } from "react";
import { Plus } from "lucide-react";
import { PageContainer } from "@/components/layout/PageContainer";
import { Button } from "@/components/ui/Button";
import { Drawer } from "@/components/ui/Drawer";
import { CardList } from "@/features/cards/CardList";
import { CardForm } from "@/features/cards/CardForm";
import { DeleteCardConfirm } from "@/features/cards/DeleteCardConfirm";
import type { Card } from "@/db/schemas/card";

type DrawerMode = "closed" | "create" | "edit";

export function Cards(): React.JSX.Element {
  const [drawer, setDrawer] = useState<DrawerMode>("closed");
  const [editing, setEditing] = useState<Card | null>(null);
  const [deleting, setDeleting] = useState<Card | null>(null);

  function openCreate(): void {
    setEditing(null);
    setDrawer("create");
  }

  function openEdit(card: Card): void {
    setEditing(card);
    setDrawer("edit");
  }

  function closeDrawer(): void {
    setDrawer("closed");
    setEditing(null);
  }

  return (
    <PageContainer
      title="Tarjetas de Crédito"
      description="Ciclos de corte y pago. Arrastrá para reordenar por prioridad."
      actions={
        <Button
          type="button"
          variant="primary"
          leftIcon={<Plus className="size-4" aria-hidden />}
          onClick={openCreate}
        >
          Nueva tarjeta
        </Button>
      }
    >
      <CardList onEdit={openEdit} onDelete={setDeleting} />

      <Drawer
        open={drawer !== "closed"}
        onClose={closeDrawer}
        title={drawer === "edit" ? "Editar tarjeta" : "Nueva tarjeta"}
        description={
          drawer === "edit"
            ? "Modificá los datos de la tarjeta."
            : "Registrá una nueva tarjeta para usarla en tus compras."
        }
      >
        <CardForm
          card={editing ?? undefined}
          onSaved={closeDrawer}
          onCancel={closeDrawer}
        />
      </Drawer>

      <DeleteCardConfirm card={deleting} onClose={() => setDeleting(null)} />
    </PageContainer>
  );
}
