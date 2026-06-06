/**
 * MsiSelector — control-ingresos
 *
 * Selector de plazo MSI (Meses Sin Intereses). Permite elegir un plazo en
 * el rango 1-48 meses y muestra la cuota mensual estimada para cada opción.
 *
 * Implementación: envuelve un `<Select>` nativo (mismo lenguaje visual que el
 * resto de los form fields). Antes era una grilla de píldoras radio, pero
 * con 48 opciones esa UI dejó de ser práctica.
 *
 * Contrato de unidades (ADR-03): `totalCents` llega en centavos enteros y
 * `monthly` se calcula vía `getMsiMonthlyAmount` (también en cents). La única
 * conversión a display ocurre dentro de `formatCurrency`.
 */
import { useId, useMemo, type ChangeEvent } from "react";
import { Select } from "@/components/ui/Select";
import { getMsiMonthlyAmount } from "@/engine/msi";
import { MSI_TERM, type MsiTerm } from "@/db/schemas/transaction";
import { formatCurrency } from "@/lib/money/format";

export interface MsiSelectorProps {
  /** Total amount in cents. */
  totalCents: number;
  /** Currently selected term, or null. */
  value: MsiTerm | null;
  onChange: (term: MsiTerm) => void;
  currency?: string;
  disabled?: boolean;
  label?: string;
}

export function MsiSelector({
  totalCents,
  value,
  onChange,
  currency = "MXN",
  disabled,
  label = "Plazo",
}: MsiSelectorProps): React.JSX.Element {
  const reactId = useId();
  const selectId = `msi-selector-${reactId}`;

  const options = useMemo(
    () =>
      MSI_TERM.map((term) => {
        const monthlyCents = getMsiMonthlyAmount(totalCents, term);
        const plural = term > 1 ? "es" : "";
        const labelText =
          totalCents === 0
            ? `${term} mes${plural}`
            : `${term} mes${plural} — ${formatCurrency(monthlyCents, currency)}/mes`;
        return { value: String(term), label: labelText };
      }),
    [totalCents, currency],
  );

  function handleChange(e: ChangeEvent<HTMLSelectElement>): void {
    const next = Number(e.target.value);
    if (!Number.isFinite(next)) return;
    onChange(next as MsiTerm);
  }

  return (
    <div className="flex flex-col gap-1.5">
      <label
        htmlFor={selectId}
        className="text-sm font-medium text-[var(--color-text-body)]"
      >
        {label}
      </label>
      <Select
        id={selectId}
        options={options}
        value={value === null ? "" : String(value)}
        onChange={handleChange}
        disabled={disabled}
        placeholder="Seleccioná un plazo"
        aria-label={label}
      />
    </div>
  );
}
