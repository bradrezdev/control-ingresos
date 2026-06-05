/**
 * PaymentConfirm — control-ingresos
 *
 * Modal that confirms a monthly payment for a debt. The default
 * amount is the debt's `fixedMonthlyPayment`, but the user can adjust
 * it (e.g. to clear the remaining balance or pay extra). Submitting
 * calls `useDebtsStore.recordPayment`, which clamps the balance at 0
 * and persists the change.
 */
import { useState, useEffect } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { CurrencyInput } from "@/components/form/CurrencyInput";
import { formatCurrency } from "@/lib/money/format";
import { useSettingsStore } from "@/stores/settingsStore";
import { useDebtsStore } from "@/stores/debtsStore";
import type { Debt } from "@/db/schemas/debt";

export interface PaymentConfirmProps {
  debt: Debt | null;
  onClose: () => void;
}

export function PaymentConfirm({ debt, onClose }: PaymentConfirmProps): React.JSX.Element {
  const currency = useSettingsStore((s) => s.settings?.currency ?? "MXN");
  const recordPayment = useDebtsStore((s) => s.recordPayment);
  const [amountDisplay, setAmountDisplay] = useState<number>(0);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset the amount whenever the target debt changes.
  useEffect(() => {
    if (debt) {
      setAmountDisplay(debt.fixedMonthlyPayment);
      setError(null);
    } else {
      setAmountDisplay(0);
    }
  }, [debt]);

  async function onConfirm(): Promise<void> {
    if (!debt || submitting) return;
    setError(null);
    if (amountDisplay <= 0) {
      setError("El monto debe ser mayor a 0");
      return;
    }
    if (amountDisplay > debt.remainingBalance) {
      setError("El pago no puede superar el saldo");
      return;
    }
    setSubmitting(true);
    try {
      await recordPayment(debt.id, amountDisplay);
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo registrar el pago");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal
      open={!!debt}
      onClose={submitting ? () => undefined : onClose}
      title="Registrar pago"
      size="sm"
      {...(debt
        ? {
            description: `Vas a registrar un pago a ${debt.creditor}. El saldo se actualizará automáticamente.`,
          }
        : {})}
    >
      {debt ? (
        <div className="space-y-4">
          <div className="text-sm text-[var(--color-text-muted)] space-y-1">
            <p>
              <span className="text-[var(--color-text-body)]">Saldo actual:</span>{" "}
              <span className="font-semibold">
                {formatCurrency(debt.remainingBalance, currency)}
              </span>
            </p>
            <p>
              <span className="text-[var(--color-text-body)]">
                Mensualidad sugerida:
              </span>{" "}
              <span className="font-semibold">
                {formatCurrency(debt.fixedMonthlyPayment, currency)}
              </span>
            </p>
          </div>

          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="payment-amount"
              className="text-sm font-medium text-[var(--color-text-body)]"
            >
              Monto del pago
            </label>
            <CurrencyInput
              id="payment-amount"
              value={Math.round(amountDisplay * 100)}
              onChangeCents={(cents) => setAmountDisplay(cents / 100)}
            />
            {error ? (
              <p role="alert" className="text-xs text-[var(--color-danger)]">
                {error}
              </p>
            ) : null}
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="ghost"
              onClick={onClose}
              disabled={submitting}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              variant="primary"
              loading={submitting}
              onClick={onConfirm}
            >
              Confirmar pago
            </Button>
          </div>
        </div>
      ) : null}
    </Modal>
  );
}
