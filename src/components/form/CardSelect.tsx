/**
 * CardSelect — control-ingresos
 *
 * Dropdown selector for cards (credit or debit), backed by the reactive
 * Dexie `useLiveCards` query. The optional `cardType` prop filters the
 * list to that type — used by `TransactionForm` (debit vs credit) and
 * by `FixedPaymentForm`. Renders a "no cards" empty option when the
 * user has no cards of the requested type.
 */
import { useLiveCards } from "@/hooks/useLiveCards";
import { Select } from "@/components/ui/Select";
import type { SelectOption } from "@/components/ui/Select";
import type { Card } from "@/db/schemas/card";

export interface CardSelectProps {
  value: string;
  onChange: (cardId: string) => void;
  placeholder?: string;
  disabled?: boolean;
  invalid?: boolean;
  id?: string;
  "aria-label"?: string;
  cardType?: Card["cardType"];
}

export function CardSelect({
  value,
  onChange,
  placeholder = "Selecciona una tarjeta",
  disabled,
  invalid,
  id,
  "aria-label": ariaLabel,
  cardType,
}: CardSelectProps): React.JSX.Element {
  const cards = useLiveCards();

  const options: SelectOption[] = (cards ?? [])
    .filter((c) => !cardType || c.cardType === cardType)
    .map((c) => ({ value: c.id, label: c.bank }));

  const emptyMessage = cardType
    ? `Sin tarjetas de ${cardType === "debit" ? "débito" : "crédito"} configuradas`
    : "Sin tarjetas configuradas";

  return (
    <Select
      id={id}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      options={options}
      placeholder={
        cards === undefined ? "Cargando…" : options.length === 0 ? emptyMessage : placeholder
      }
      disabled={disabled || cards === undefined || options.length === 0}
      invalid={invalid}
      aria-label={ariaLabel}
    />
  );
}
