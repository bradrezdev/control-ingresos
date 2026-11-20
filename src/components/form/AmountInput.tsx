/**
 * AmountInput — control-ingresos (redesign, T7)
 *
 * Big numeric entry equivalent to the prototype's `.amt` block: a
 * currency symbol prefix followed by 44/800 primary figures, decimal
 * keyboard, "0.00" placeholder, and tabular numerics (global body rule).
 *
 * Contract (ADR-03): `value` and `onChangeCents` are integer cents.
 * Parsing reuses `parseCurrencyInput` from lib/money — the same
 * semantics as `CurrencyInput`, so "1,2" or "1.234,50" keep working
 * mid-typing. The display string is local state; blur normalizes it to
 * the canonical "X.YZ" form.
 */
import { useEffect, useRef, useState, type ChangeEvent } from "react";
import { parseCurrencyInput } from "@/lib/money/format";

/** Display-edge symbol lookup (lib/money owns locales, not symbols). */
const CURRENCY_SYMBOLS: Record<string, string> = {
  MXN: "$",
  USD: "$",
  EUR: "€",
};

export interface AmountInputProps {
  /** Amount in integer cents (controlled). */
  value: number;
  /** Emitted as integer cents on every keystroke. */
  onChangeCents: (cents: number) => void;
  currency?: string;
  placeholder?: string;
  disabled?: boolean;
  id?: string;
  maxLength?: number;
  "aria-label"?: string;
  "aria-labelledby"?: string;
}

export function AmountInput({
  value,
  onChangeCents,
  currency = "MXN",
  placeholder = "0.00",
  disabled,
  id,
  maxLength = 18,
  "aria-label": ariaLabel,
  "aria-labelledby": ariaLabelledBy,
}: AmountInputProps): React.JSX.Element {
  const [display, setDisplay] = useState<string>(formatForInput(value));
  const isEditing = useRef(false);

  // Sync external value -> display (when not actively editing).
  useEffect(() => {
    if (!isEditing.current) {
      setDisplay(formatForInput(value));
    }
  }, [value]);

  function onChange(e: ChangeEvent<HTMLInputElement>): void {
    const next = e.target.value;
    setDisplay(next);
    onChangeCents(parseCurrencyInput(next));
  }

  function onBlur(): void {
    isEditing.current = false;
    const cents = parseCurrencyInput(display);
    onChangeCents(cents);
    setDisplay(formatForInput(cents));
  }

  const symbol = CURRENCY_SYMBOLS[currency.toUpperCase()] ?? "$";

  return (
    <div className="flex items-baseline gap-1">
      <span
        aria-hidden="true"
        className="text-figure font-extrabold tracking-tight text-primary"
      >
        {symbol}
      </span>
      <input
        id={id}
        type="text"
        inputMode="decimal"
        maxLength={maxLength}
        autoComplete="off"
        placeholder={placeholder}
        disabled={disabled}
        value={display}
        onChange={onChange}
        onFocus={() => {
          isEditing.current = true;
        }}
        onBlur={onBlur}
        aria-label={ariaLabel}
        aria-labelledby={ariaLabelledBy}
        className="w-full min-w-0 border-0 bg-transparent p-0 text-figure font-extrabold tracking-tight text-primary placeholder:text-muted disabled:opacity-50"
      />
    </div>
  );
}

function formatForInput(cents: number): string {
  if (!cents) return "";
  return (cents / 100).toFixed(2);
}
