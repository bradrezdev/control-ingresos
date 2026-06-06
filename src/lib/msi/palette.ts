/**
 * MSI term color palette — control-ingresos
 *
 * Función pura que devuelve un color por plazo MSI. Usada por
 * MsiSummary y cualquier otro chart que necesite colorear por plazo.
 *
 * Se vuelve función (no array literal) para que `MSI_TERM` futuro
 * no desincronice la paleta: si alguien agrega plazo 36 al array,
 * sólo necesitan agregar un color al PALETTE en el mismo orden.
 */
import { MSI_TERM, type MsiTerm } from "@/db/schemas/transaction";

const PALETTE = [
  "rgba(16, 185, 129, 0.85)",   // 1m — safe
  "rgba(132, 204, 22, 0.85)",  // 3m
  "rgba(245, 158, 11, 0.85)",  // 6m — warning
  "rgba(249, 115, 22, 0.85)",  // 9m
  "rgba(239, 68, 68, 0.85)",   // 12m — danger
  "rgba(220, 38, 38, 0.85)",   // 18m
  "rgba(190, 18, 60, 0.85)",   // 24m — más oscuro
] as const;

const FALLBACK_COLOR = "rgba(100, 116, 139, 0.85)";

export function getColorForTerm(term: number): string {
  const idx = MSI_TERM.indexOf(term as MsiTerm);
  if (idx === -1) return FALLBACK_COLOR;
  return PALETTE[idx] ?? FALLBACK_COLOR;
}
