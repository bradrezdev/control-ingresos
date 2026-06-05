/**
 * CurrencyInput — control-ingresos
 *
 * Numeric input that:
 *   - Shows the currency code as a left addon
 *   - Accepts user-entered strings with `,` or `.` decimal separators
 *   - Emits a cents integer via `onChangeCents`
 *
 * Internally tracks the display string so the user can type freely
 * (e.g. "1,2" → "1.2" mid-typing) without losing characters. Parsing
 * happens on blur via the lib/money/format utilities.
 */
import { useState, useEffect, useRef, type ChangeEvent } from "react";
import { Input } from "@/components/ui/Input";
import {
  parseCurrencyInput,
  displayToCents,
  formatCurrency,
} from "@/lib/money/format";

export interface CurrencyInputProps {
  /** Cents integer value (controlled). */
  value: number;
  /** Emitted as a cents integer. */
  onChangeCents: (cents: number) => void;
  currency?: string;
  placeholder?: string;
  disabled?: boolean;
  invalid?: boolean;
  id?: string;
  name?: string;
  "aria-label"?: string;
  "aria-labelledby"?: string;
}

export function CurrencyInput({
  value,
  onChangeCents,
  currency = "MXN",
  placeholder = "0.00",
  disabled,
  invalid,
  id,
  name,
  "aria-label": ariaLabel,
  "aria-labelledby": ariaLabelledBy,
}: CurrencyInputProps): React.JSX.Element {
  const [display, setDisplay] = useState<string>(formatValueForInput(value));
  const isEditing = useRef(false);

  // Sync external value -> display (when not actively editing).
  useEffect(() => {
    if (!isEditing.current) {
      setDisplay(formatValueForInput(value));
    }
  }, [value]);

  function onChange(e: ChangeEvent<HTMLInputElement>): void {
    const next = e.target.value;
    setDisplay(next);
    // Live emit (useful for instant form updates).
    onChangeCents(parseCurrencyInput(next));
  }

  function onBlur(): void {
    isEditing.current = false;
    const cents = parseCurrencyInput(display);
    onChangeCents(cents);
    setDisplay(centsToDisplayString(cents));
  }

  function onFocus(): void {
    isEditing.current = true;
  }

  return (
    <Input
      type="text"
      inputMode="decimal"
      value={display}
      onChange={onChange}
      onBlur={onBlur}
      onFocus={onFocus}
      placeholder={placeholder}
      disabled={disabled}
      invalid={invalid}
      id={id}
      name={name}
      aria-label={ariaLabel}
      aria-labelledby={ariaLabelledBy}
      leftAddon={
        <span className="text-xs font-medium uppercase tracking-wide">
          {currency}
        </span>
      }
    />
  );
}

function formatValueForInput(cents: number): string {
  if (!cents) return "";
  return (cents / 100).toFixed(2);
}

function centsToDisplayString(cents: number): string {
  return cents === 0 ? "" : (cents / 100).toFixed(2);
}

// `formatCurrency` is exported through the lib but kept here to keep the
// module self-contained and avoid pulling a second import. The re-export
// below is intentional for downstream consumers.
export { formatCurrency, displayToCents };
