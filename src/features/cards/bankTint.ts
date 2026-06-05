/**
 * Bank tints — control-ingresos
 *
 * Subtle left-bar accents for each known Mexican bank. Falls back to
 * a neutral slate when the bank is unrecognized. All colors are CSS
 * vars (semantic tokens) — no hex literals.
 *
 * Used by `CardListItem` and `CardForm` to keep visual identity for
 * common issuers. Easy to extend: add an entry and the rest of the UI
 * picks it up automatically.
 */
export type BankTintKey =
  | "default"
  | "bbva"
  | "santander"
  | "banamex"
  | "hsbc"
  | "banorte"
  | "scotiabank"
  | "amex"
  | "inbursa";

export interface BankTint {
  bar: string;
  label: string;
}

export const BANK_TINT: Record<BankTintKey, BankTint> = {
  default: { bar: "border-l-[var(--color-primary)]", label: "Tarjeta" },
  bbva: { bar: "border-l-[var(--color-info,#0CBCE5)]", label: "BBVA" },
  santander: { bar: "border-l-[var(--color-danger,#EF4444)]", label: "Santander" },
  banamex: { bar: "border-l-[var(--color-primary,#062A63)]", label: "Banamex" },
  hsbc: { bar: "border-l-[var(--color-danger,#EF4444)]", label: "HSBC" },
  banorte: { bar: "border-l-[var(--color-success,#10B981)]", label: "Banorte" },
  scotiabank: { bar: "border-l-[var(--color-warning,#F59E0B)]", label: "Scotiabank" },
  amex: { bar: "border-l-[var(--color-primary,#062A63)]", label: "American Express" },
  inbursa: { bar: "border-l-[var(--color-secondary,#0CBCE5)]", label: "Inbursa" },
};

/** Best-effort lookup by bank string (case-insensitive, trimmed). */
export function tintFor(bank: string): BankTint {
  const key = bank.toLowerCase().trim() as BankTintKey;
  return BANK_TINT[key] ?? BANK_TINT.default;
}
