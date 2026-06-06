/**
 * MSI term color palette — control-ingresos
 *
 * Función pura que devuelve un color por plazo MSI. Se vuelve función
 * (no array literal) para que `MSI_TERM` futuro no desincronice la
 * paleta.
 */
import { describe, it, expect } from "vitest";
import { getColorForTerm } from "../palette";

describe("getColorForTerm", () => {
  it("devuelve un color distinto para cada plazo soportado", () => {
    const colors = new Set([
      getColorForTerm(1),
      getColorForTerm(3),
      getColorForTerm(6),
      getColorForTerm(9),
      getColorForTerm(12),
      getColorForTerm(18),
      getColorForTerm(24),
    ]);
    expect(colors.size).toBe(7);
  });

  it("devuelve un color fallback (gris) para plazos no soportados", () => {
    const fallback = getColorForTerm(99);
    expect(typeof fallback).toBe("string");
    expect(fallback.length).toBeGreaterThan(0);
  });

  it("el fallback es diferente de los plazos soportados (visual distintivo)", () => {
    expect(getColorForTerm(99)).not.toBe(getColorForTerm(12));
  });
});
