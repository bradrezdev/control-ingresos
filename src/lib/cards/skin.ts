/**
 * Acabados visuales del plástico de tarjeta — control-ingresos
 *
 * Cuatro acabados planos (sin degradados), tomados de la especificación
 * visual `DESIGN-RULES` §6 y de la referencia ejecutable
 * (`Tarjetas-autonoma.html`, bloque `wallet.css`).
 *
 *   - `silver`: PLATA — plata con acento cobre
 *   - `ocean`:  Mercado Pago — azul
 *   - `forest`: Stori — verde oscuro
 *   - `ink`:    marino, por defecto de las tarjetas nuevas
 *
 * El acabado es un atributo de la tarjeta: renombrar una tarjeta no
 * cambia su plástico. Este módulo es la única fuente de la paleta y de
 * la deduceción por nombre, para que la migración de la base y la
 * interfaz nunca diverjan.
 *
 * Módulo puro: sin React, sin Dexie, sin DOM.
 */

export const CARD_SKINS = ["silver", "ocean", "forest", "ink"] as const;
export type CardSkin = (typeof CARD_SKINS)[number];

/** Colores de un acabado: fondo, texto, borde, marca y texto secundario. */
export interface CardFinish {
  /** Fondo plano del plástico. */
  bg: string;
  /** Texto principal sobre el fondo (nombre del emisor). */
  ink: string;
  /** Borde de 1 px del plástico. */
  edge: string;
  /** Color de la marca / logotipo. */
  brand: string;
  /** Texto secundario sobre el fondo (tipo, titular). */
  muted: string;
  /** Trazo de la trama de fondo. */
  pattern: string;
}

export const CARD_FINISHES: Record<CardSkin, CardFinish> = {
  silver: {
    bg: "#dce3e9",
    ink: "#283944",
    edge: "#c3cfd5",
    brand: "#98421f",
    muted: "#455561",
    pattern: "#79899b",
  },
  ocean: {
    bg: "#8bcfe7",
    ink: "#112e48",
    edge: "#79bad6",
    brand: "#0b3558",
    muted: "#25475e",
    pattern: "#00618e",
  },
  forest: {
    bg: "#184d46",
    ink: "#eefcf2",
    edge: "#26635a",
    brand: "#d1f6cc",
    muted: "#c1e2d9",
    pattern: "#92ecd0",
  },
  ink: {
    bg: "#233c63",
    ink: "#eff4ff",
    edge: "#3c547b",
    brand: "#e5eeff",
    muted: "#c9d8ec",
    pattern: "#91afd3",
  },
};

/** Etiquetas del selector "Color de la tarjeta" (formulario). */
export const CARD_SKIN_LABELS: Record<CardSkin, string> = {
  silver: "Plata",
  ocean: "Azul",
  forest: "Verde",
  ink: "Marino",
};

/**
 * Deduce el acabado a partir del nombre de la tarjeta (sólo para
 * tarjetas que aún no tienen acabado explícito: `Card.skin`).
 *
 * Comparación sin tildes ni mayúsculas, para que "Mercado Pago" y
 * "mercado pago" caigan en el mismo acabado.
 */
export function skinForBank(bank: string): CardSkin {
  const key = bank
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();

  if (key.includes("plata")) return "silver";
  if (key.includes("mercado pago")) return "ocean";
  if (key.includes("stori")) return "forest";
  return "ink";
}

/** Acabado efectivo de una tarjeta: el explícito o el deducido. */
export function finishFor(
  card: { bank: string; skin?: CardSkin | undefined },
): CardFinish {
  return CARD_FINISHES[card.skin ?? skinForBank(card.bank)];
}
