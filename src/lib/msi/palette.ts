/**
 * MSI term color palette — control-ingresos
 *
 * Generador puro de colores por plazo MSI. Con el rango 1-48 una paleta
 * estática dejaría de escalar, así que generamos colores HSL espaciando el
 * hue uniformemente: 360 / 48 = 7.5° por plazo, con saturación y luminosidad
 * fijas. El alpha 0.85 conserva el contraste original usado por Chart.js.
 *
 * `FALLBACK_COLOR` cubre valores fuera de rango (term < 1 o term > 48).
 */

const HUE_STEP = 360 / 48; // 7.5°
const SATURATION = 70;
const LIGHTNESS = 55;
const ALPHA = 0.85;

const FALLBACK_COLOR = "hsla(0, 0%, 60%, 0.85)";

export function getColorForTerm(term: number): string {
  if (!Number.isInteger(term) || term < 1 || term > 48) {
    return FALLBACK_COLOR;
  }
  const hue = ((term - 1) * HUE_STEP) % 360;
  return `hsla(${hue}, ${SATURATION}%, ${LIGHTNESS}%, ${ALPHA})`;
}
