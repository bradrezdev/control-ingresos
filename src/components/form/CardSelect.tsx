/**
 * CardSelect — control-ingresos
 *
 * Dropdown selector for credit cards, backed by the reactive Dexie
 * `useLiveCards` query. Renders a "no cards" empty option when the
 * user has no cards configured.
 */
import { useLiveCards } from "@/hooks/useLiveCards";
import { Select } from "@/components/ui/Select";
import type { SelectOption } from "@/components/ui/Select";

export interface CardSelectProps {
  value: string;
  onChange: (cardId: string) => void;
  placeholder?: string;
  disabled?: boolean;
  invalid?: boolean;
  id?: string;
  "aria-label"?: string;
}

export function CardSelect({
  value,
  onChange,
  placeholder = "Selecciona una tarjeta",
  disabled,
  invalid,
  id,
  "aria-label": ariaLabel,
}: CardSelectProps): React.JSX.Element {
  const cards = useLiveCards();

  const options: SelectOption[] = (cards ?? []).map((c) => ({
    value: c.id,
    label: c.bank,
  }));

  return (
    <Select
      id={id}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      options={options}
      placeholder={
        cards === undefined
          ? "Cargando…"
          : options.length === 0
            ? "Sin tarjetas configuradas"
            : placeholder
      }
      disabled={disabled || cards === undefined || options.length === 0}
      invalid={invalid}
      aria-label={ariaLabel}
    />
  );
}
