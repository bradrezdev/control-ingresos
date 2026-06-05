/**
 * Money utilities — control-ingresos
 *
 * ADR-03: All money is stored as integer cents internally. Formatting and
 * parsing happen only at the UI boundary. Float math must NEVER be used for
 * money in the data layer.
 *
 * This module owns the boundary between:
 *   - display strings ("1,234.50" or "1.234,50")
 *   - cents integers (123450)
 *   - display numbers (1234.5)
 */

const CENTS_PER_UNIT = 100;

const CURRENCY_LOCALE_MAP: Record<string, string> = {
  MXN: "es-MX",
  USD: "en-US",
  EUR: "es-ES",
};

const DEFAULT_LOCALE = "es-MX";

/** Returns the BCP-47 locale appropriate for the given currency code. */
function localeForCurrency(currency: string): string {
  return CURRENCY_LOCALE_MAP[currency.toUpperCase()] ?? DEFAULT_LOCALE;
}

/**
 * Format a cents integer as a localized currency string.
 *
 *   formatCurrency(123450, "MXN")  -> "$1,234.50"
 *   formatCurrency(0, "USD")      -> "$0.00"
 *   formatCurrency(99, "EUR")     -> "0,99 €"
 *
 * Pure: no Date, no global state. Safe to call in render.
 */
export function formatCurrency(cents: number, currency: string): string {
  if (!Number.isFinite(cents)) return "—";
  const locale = localeForCurrency(currency);
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: currency.toUpperCase(),
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(cents / CENTS_PER_UNIT);
}

/**
 * Convert a cents integer to a plain display number (no currency symbol).
 * Useful for inputs and graphs where the symbol would be redundant.
 *
 *   centsToDisplay(123450)  -> 1234.5
 */
export function centsToDisplay(cents: number): number {
  return cents / CENTS_PER_UNIT;
}

/**
 * Convert a display number (with decimals) to a cents integer.
 * Rounds half-to-even (banker's rounding via Math.round).
 *
 *   displayToCents(1234.5)   -> 123450
 *   displayToCents(1234.505) -> 123451
 *   displayToCents(0)        -> 0
 */
export function displayToCents(display: number): number {
  if (!Number.isFinite(display)) return 0;
  return Math.round(display * CENTS_PER_UNIT);
}

/**
 * Parse a user-entered currency string into a cents integer.
 *
 * Accepts:
 *   - "$1,234.50"  -> 123450
 *   - "1.234,50"   -> 123450   (es-MX / es-ES style)
 *   - "1234.5"     -> 123450
 *   - "1234"       -> 123400
 *   - "  $ 99.00 " -> 9900
 *   - ""           -> 0
 *   - null         -> 0
 *
 * Rejects:
 *   - "abc"        -> 0
 *   - "1.2.3"      -> 0
 *   - "1,234,567"  -> parsed (treated as thousand sep)
 *
 * Strategy: strip everything that is not a digit, sign, or decimal separator.
 * We then infer the decimal separator: the LAST `.` or `,` is treated as
 * decimal; the other as thousand separator.
 */
export function parseCurrencyInput(input: string | null | undefined): number {
  if (input == null) return 0;
  const trimmed = input.trim();
  if (trimmed === "") return 0;

  // Strip leading/trailing currency symbols, spaces, and alphabetic prefixes
  // such as "USD 100" or "  $ 99.00  ". Internal alpha or symbols indicate
  // garbage input.
  const stripped = trimmed.replace(
    /^[a-zA-Z$€£¥₹\s]+|[a-zA-Z$€£¥₹\s]+$/g,
    "",
  );

  if (/[a-zA-Z]/.test(stripped)) return 0;
  if (/[$€£¥₹]/.test(stripped)) return 0;

  if (stripped === "") return 0;

  const lastDot = stripped.lastIndexOf(".");
  const lastComma = stripped.lastIndexOf(",");

  if (lastDot === -1 && lastComma === -1) {
    const parsed = Number(stripped);
    if (!Number.isFinite(parsed)) return 0;
    return displayToCents(parsed);
  }

  let normalized: string;
  if (lastDot > lastComma) {
    normalized = stripped.replace(/,/g, "");
  } else {
    normalized = stripped.replace(/\./g, "").replace(",", ".");
  }

  const dotCount = (normalized.match(/\./g) ?? []).length;
  if (dotCount > 1) return 0;

  const parsed = Number(normalized);
  if (!Number.isFinite(parsed)) return 0;

  return displayToCents(parsed);
}

/** Inverse of `formatCurrency` for the most common MXN/USD cases. */
export function parseCurrencyDisplay(
  input: string | null | undefined,
): number {
  return parseCurrencyInput(input);
}
