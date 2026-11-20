/**
 * FixedPayments — control-ingresos (redesign, T6)
 *
 * Thin page that mounts the redesigned Pagos fijos screen and owns its
 * sheets: the create/edit form, the fixed payment detail (with the
 * Editar / Eliminar actions) and the delete confirmation.
 *
 * Every handler passed to `Drawer`/`Modal` is a stable `useCallback`
 * reference — those components re-run their focus effect when the
 * `onClose` identity changes, which steals focus from inputs on each
 * keystroke (defect already seen in T4).
 */
import { useCallback, useState } from "react";
import { Drawer } from "@/components/ui/Drawer";
import { useLiveSettings } from "@/hooks/useLiveSettings";
import { FixedPaymentsScreen } from "@/features/fixedPayments/FixedPaymentsScreen";
import { FixedPaymentForm } from "@/features/fixedPayments/FixedPaymentForm";
import { FixedPaymentDetail } from "@/features/fixedPayments/FixedPaymentDetail";
import { DeleteFixedPaymentConfirm } from "@/features/fixedPayments/DeleteFixedPaymentConfirm";
import type { FixedPayment } from "@/db/schemas/fixedPayment";

type DrawerMode = "closed" | "create" | "edit";

export function FixedPayments(): React.JSX.Element {
  const [drawer, setDrawer] = useState<DrawerMode>("closed");
  const [editing, setEditing] = useState<FixedPayment | null>(null);
  const [detail, setDetail] = useState<FixedPayment | null>(null);
  const [deleting, setDeleting] = useState<FixedPayment | null>(null);

  const settings = useLiveSettings();
  const currency = settings?.currency ?? "MXN";

  const openCreate = useCallback(() => {
    setEditing(null);
    setDrawer("create");
  }, []);

  const openDetail = useCallback((fp: FixedPayment) => {
    setDetail(fp);
  }, []);

  const openEdit = useCallback((fp: FixedPayment) => {
    setDetail(null);
    setEditing(fp);
    setDrawer("edit");
  }, []);

  const openDelete = useCallback((fp: FixedPayment) => {
    setDetail(null);
    setDeleting(fp);
  }, []);

  // Stable closers — see the module doc.
  const closeDrawer = useCallback(() => {
    setDrawer("closed");
    setEditing(null);
  }, []);
  const closeDetail = useCallback(() => setDetail(null), []);
  const closeDeleting = useCallback(() => setDeleting(null), []);

  return (
    <>
      <FixedPaymentsScreen onCreate={openCreate} onSelect={openDetail} />

      <Drawer
        open={drawer !== "closed"}
        onClose={closeDrawer}
        title={drawer === "edit" ? "Editar pago fijo" : "Nuevo pago fijo"}
        description={
          drawer === "edit"
            ? "Modifica los datos del pago recurrente."
            : "Registra un gasto que se repite cada cierto período."
        }
      >
        <FixedPaymentForm
          fixedPayment={editing ?? undefined}
          onSaved={closeDrawer}
          onCancel={closeDrawer}
        />
      </Drawer>

      <Drawer
        open={detail !== null}
        onClose={closeDetail}
        title={detail?.description ?? ""}
      >
        {detail ? (
          <FixedPaymentDetail
            fixedPayment={detail}
            currency={currency}
            onEdit={openEdit}
            onDelete={openDelete}
          />
        ) : null}
      </Drawer>

      <DeleteFixedPaymentConfirm
        fixedPayment={deleting}
        onClose={closeDeleting}
      />
    </>
  );
}
