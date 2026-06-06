/**
 * MsiSelector cents contract — control-ingresos
 *
 * R-6 (bug 6): the monthly preview must display the correct dollar amount
 * for any total in cents. The engine `getMsiMonthlyAmount` now operates
 * in cents (per ADR-03) and the selector must NOT multiply by 100 again
 * before passing to `formatCurrency`.
 *
 * Each case below verifies the input/output relationship end-to-end
 * (engine in cents → formatCurrency expects cents → no double multiply).
 */
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MsiSelector } from "../MsiSelector";

describe("MsiSelector cents contract", () => {
  it("totalCents=999 (=$9.99) term=3 → '$3.33/mes' (floor of 333 cents)", () => {
    render(<MsiSelector totalCents={999} value={null} onChange={() => {}} />);
    expect(screen.getByText("$3.33/mes")).toBeInTheDocument();
  });

  it("totalCents=120000 (=$1200) term=12 → '$100.00/mes'", () => {
    render(<MsiSelector totalCents={120000} value={null} onChange={() => {}} />);
    expect(screen.getByText("$100.00/mes")).toBeInTheDocument();
  });

  it("totalCents=2400 (=$24) term=24 → '$1.00/mes'", () => {
    render(<MsiSelector totalCents={2400} value={null} onChange={() => {}} />);
    expect(screen.getByText("$1.00/mes")).toBeInTheDocument();
  });
});
