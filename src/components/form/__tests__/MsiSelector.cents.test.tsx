/**
 * MsiSelector cents contract — control-ingresos
 *
 * R-6 (bug 6): the monthly preview must display the correct dollar amount
 * for any total in cents. The engine `getMsiMonthlyAmount` operates in
 * cents (per ADR-03) and the selector must NOT multiply by 100 again
 * before passing to `formatCurrency`.
 *
 * Cada caso verifica la relación input/output end-to-end (engine en cents
 * → formatCurrency espera cents → sin doble multiplicación).
 */
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MsiSelector } from "../MsiSelector";

describe("MsiSelector cents contract", () => {
  it("totalCents=999 (=$9.99) term=3 → option label '3 meses — $3.33/mes'", () => {
    render(<MsiSelector totalCents={999} value={null} onChange={() => {}} />);
    const options = screen.getAllByRole("option") as HTMLOptionElement[];
    const term3 = options.find((opt) => opt.value === "3");
    expect(term3?.textContent).toBe("3 meses — $3.33/mes");
  });

  it("totalCents=120000 (=$1200) term=12 → option label '12 meses — $100.00/mes'", () => {
    render(<MsiSelector totalCents={120000} value={null} onChange={() => {}} />);
    const options = screen.getAllByRole("option") as HTMLOptionElement[];
    const term12 = options.find((opt) => opt.value === "12");
    expect(term12?.textContent).toBe("12 meses — $100.00/mes");
  });

  it("totalCents=2400 (=$24) term=24 → option label '24 meses — $1.00/mes'", () => {
    render(<MsiSelector totalCents={2400} value={null} onChange={() => {}} />);
    const options = screen.getAllByRole("option") as HTMLOptionElement[];
    const term24 = options.find((opt) => opt.value === "24");
    expect(term24?.textContent).toBe("24 meses — $1.00/mes");
  });
});
