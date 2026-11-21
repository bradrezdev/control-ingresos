/**
 * Bank tints — control-ingresos
 *
 * Subtle left-bar accents for each known Mexican bank. Falls back to
 * a neutral slate when the bank is unrecognized. All colors are CSS
 * vars (semantic tokens) — no hex literals.
 *
 * Card faces (redesign-ui-2026, T5): each tint also carries a flat,
 * sober "bank face" palette (background / ink / edge / muted) taken from
 * the prototype's `.skin-*` tokens in `wallet.css` (silver, ocean,
 * forest, ink). No gradients. Text pairs were verified for ≥4.5:1
 * contrast on each background.
 *
 * Used by `CardBlock` and `CardForm` to keep visual identity for common
 * issuers. Easy to extend: add an entry and the rest of the UI picks it
 * up automatically.
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

/**
 * Flat face palette for the card block. Hex values are allowed only
 * here (documented prototype skins); components must consume them via
 * `tintFor`, never inline.
 */
export interface BankFace {
  /** Flat face background. */
  bg: string;
  /** Primary text on the face (card name). */
  ink: string;
  /** Face border. */
  edge: string;
  /** Secondary text on the face (holder, type label). */
  muted: string;
}

export interface BankTint {
  bar: string;
  label: string;
  face: BankFace;
}

/** Prototype skins (`wallet.css` `.skin-*`) — sober, flat, contrast-safe. */
const SKINS = {
  silver: { bg: "#dce3e9", ink: "#283944", edge: "#c3cfd5", muted: "#455561" },
  ocean: { bg: "#8bcfe7", ink: "#112e48", edge: "#79bad6", muted: "#25475e" },
  forest: { bg: "#184d46", ink: "#eefcf2", edge: "#26635a", muted: "#c1e2d9" },
  ink: { bg: "#233c63", ink: "#eff4ff", edge: "#3c547b", muted: "#c9d8ec" },
} as const satisfies Record<string, BankFace>;

export const BANK_TINT: Record<BankTintKey, BankTint> = {
  default: { bar: "border-l-[var(--color-primary)]", label: "Tarjeta", face: SKINS.ink },
  bbva: { bar: "border-l-[var(--color-info,#0CBCE5)]", label: "BBVA", face: SKINS.ocean },
  santander: { bar: "border-l-[var(--color-danger,#EF4444)]", label: "Santander", face: SKINS.silver },
  banamex: { bar: "border-l-[var(--color-primary,#062A63)]", label: "Banamex", face: SKINS.ink },
  hsbc: { bar: "border-l-[var(--color-danger,#EF4444)]", label: "HSBC", face: SKINS.silver },
  banorte: { bar: "border-l-[var(--color-success,#10B981)]", label: "Banorte", face: SKINS.forest },
  scotiabank: { bar: "border-l-[var(--color-warning,#F59E0B)]", label: "Scotiabank", face: SKINS.forest },
  amex: { bar: "border-l-[var(--color-primary,#062A63)]", label: "American Express", face: SKINS.ink },
  inbursa: { bar: "border-l-[var(--color-secondary,#0CBCE5)]", label: "Inbursa", face: SKINS.ocean },
};

/** Best-effort lookup by bank string (case-insensitive, trimmed). */
export function tintFor(bank: string): BankTint {
  const key = bank.toLowerCase().trim() as BankTintKey;
  return BANK_TINT[key] ?? BANK_TINT.default;
}
