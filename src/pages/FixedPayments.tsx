/**
 * FixedPayments — control-ingresos
 *
 * F5.3 (replacement) — Manage fixed (recurring) payments. Top-level
 * page that:
 *   1. Shows the live list of fixed payments.
 *   2. Hosts a Drawer with `FixedPaymentForm` for create/edit.
 *   3. Hosts a Modal for delete confirmation.
 *
 * The page keeps ephemeral UI state (which payment is being edited /
 * deleted / created) in local state. Dexie is the source of truth for
 * the data; `useLiveFixedPayments` reflects writes.
 */
import { useState } from "react";
import { Plus } from "lucide-react";
import { PageContainer } from "@/components/layout/PageContainer";
import { Button } from "@/components/ui/Button";
import { Drawer } from "@/components/ui/Drawer";
import { FixedPaymentList } from "@/features/fixedPayments/FixedPaymentList";
import { FixedPaymentForm } from "@/features/fixedPayments/FixedPaymentForm";
import { DeleteFixedPaymentConfirm } from "@/features/fixedPayments/DeleteFixedPaymentConfirm";
import type { FixedPayment } from "@/db/schemas/fixedPayment";

type DrawerMode = "closed" | "create" | "edit";

export function FixedPayments(): React.JSX.Element {
  const [drawer, setDrawer] = useState<DrawerMode>("closed");
  const [editing, setEditing] = useState<FixedPayment | null>(null);
  const [deleting, setDeleting] = useState<FixedPayment | null>(null);

  function openCreate(): void {
    setEditing(null);
    setDrawer("create");
  }

  function openEdit(fp: FixedPayment): void {
    setEditing(fp);
    setDrawer("edit");
  }

  function closeDrawer(): void {
    setDrawer("closed");
    setEditing(null);
  }

  return (
    <PageContainer
      title="Pagos fijos"
      description="Pagos recurrentes mensuales, bimestrales o trimestrales."
      actions={
        <Button
          type="button"
          variant="primary"
          leftIcon={<Plus className="size-4" aria-hidden />}
          onClick={openCreate}
        >
          Nuevo pago fijo
        </Button>
      }
    >
      <FixedPaymentList onEdit={openEdit} onDelete={setDeleting} />

      <Drawer
        open={drawer !== "closed"}
        onClose={closeDrawer}
        title={drawer === "edit" ? "Editar pago fijo" : "Nuevo pago fijo"}
        description={
          drawer === "edit"
            ? "Modificá los datos del pago recurrente."
            : "Registrá un gasto que se repite cada cierto período."
        }
      >
        {editing ? (
          <FixedPaymentForm
            fixedPayment={editing}
            onSaved={closeDrawer}
            onCancel={closeDrawer}
          />
        ) : (
          <FixedPaymentForm
            onSaved={closeDrawer}
            onCancel={closeDrawer}
          />
        )}
      </Drawer>

      <DeleteFixedPaymentConfirm
        fixedPayment={deleting}
        onClose={() => setDeleting(null)}
      />
    </PageContainer>
  );
}
