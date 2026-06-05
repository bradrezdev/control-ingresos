/**
 * Debts — control-ingresos
 *
 * F5.3 — Manage debts (préstamos / financiamientos). Top-level page
 * that:
 *   1. Shows the live list with progress bars.
 *   2. Hosts a Drawer with `DebtForm` for create/edit.
 *   3. Hosts a Modal for delete confirmation.
 *   4. Hosts a Modal for monthly payment confirmation.
 */
import { useState } from "react";
import { Plus } from "lucide-react";
import { PageContainer } from "@/components/layout/PageContainer";
import { Button } from "@/components/ui/Button";
import { Drawer } from "@/components/ui/Drawer";
import { Modal } from "@/components/ui/Modal";
import { DebtList } from "@/features/debts/DebtList";
import { DebtForm } from "@/features/debts/DebtForm";
import { PaymentConfirm } from "@/features/debts/PaymentConfirm";
import { useDebtsStore } from "@/stores/debtsStore";
import { formatCurrency } from "@/lib/money/format";
import { useSettingsStore } from "@/stores/settingsStore";
import type { Debt } from "@/db/schemas/debt";

type DrawerMode = "closed" | "create" | "edit";

export function Debts(): React.JSX.Element {
  const [drawer, setDrawer] = useState<DrawerMode>("closed");
  const [editing, setEditing] = useState<Debt | null>(null);
  const [deleting, setDeleting] = useState<Debt | null>(null);
  const [paying, setPaying] = useState<Debt | null>(null);
  const [deletingNow, setDeletingNow] = useState(false);
  const remove = useDebtsStore((s) => s.remove);
  const currency = useSettingsStore((s) => s.settings?.currency ?? "MXN");

  function openCreate(): void {
    setEditing(null);
    setDrawer("create");
  }

  function openEdit(debt: Debt): void {
    setEditing(debt);
    setDrawer("edit");
  }

  function closeDrawer(): void {
    setDrawer("closed");
    setEditing(null);
  }

  async function onConfirmDelete(): Promise<void> {
    if (!deleting || deletingNow) return;
    setDeletingNow(true);
    try {
      await remove(deleting.id);
      setDeleting(null);
    } finally {
      setDeletingNow(false);
    }
  }

  return (
    <PageContainer
      title="Deudas"
      description="Préstamos y financiamientos a meses. Llevá el control de los pagos."
      actions={
        <Button
          type="button"
          variant="primary"
          leftIcon={<Plus className="size-4" aria-hidden />}
          onClick={openCreate}
        >
          Nueva deuda
        </Button>
      }
    >
      <DebtList
        onEdit={openEdit}
        onDelete={setDeleting}
        onPayMonthly={setPaying}
      />

      <Drawer
        open={drawer !== "closed"}
        onClose={closeDrawer}
        title={drawer === "edit" ? "Editar deuda" : "Nueva deuda"}
        description={
          drawer === "edit"
            ? "Modificá los datos de la deuda."
            : "Registrá un préstamo o financiamiento que querés ir pagando mes a mes."
        }
      >
        <DebtForm
          debt={editing ?? undefined}
          onSaved={closeDrawer}
          onCancel={closeDrawer}
        />
      </Drawer>

      <Modal
        open={!!deleting}
        onClose={deletingNow ? () => undefined : () => setDeleting(null)}
        title="Eliminar deuda"
        size="sm"
        {...(deleting
          ? {
              description: `¿Eliminar la deuda con ${deleting.creditor} (saldo ${formatCurrency(deleting.remainingBalance, currency)})? Esta acción no se puede deshacer.`,
            }
          : {})}
      >
        <div className="flex justify-end gap-2 pt-2">
          <Button
            type="button"
            variant="ghost"
            onClick={() => setDeleting(null)}
            disabled={deletingNow}
          >
            Cancelar
          </Button>
          <Button
            type="button"
            variant="danger"
            loading={deletingNow}
            onClick={onConfirmDelete}
          >
            Eliminar
          </Button>
        </div>
      </Modal>

      <PaymentConfirm debt={paying} onClose={() => setPaying(null)} />
    </PageContainer>
  );
}
