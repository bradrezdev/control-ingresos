/**
 * AmountInput — control-ingresos (T7)
 *
 * Big numeric entry for the redesigned forms (prototype `.amt`):
 * 44/800 primary figures with a currency symbol prefix, decimal
 * keyboard, cents in / cents out, free-typing display normalized on
 * blur. Same parsing semantics as `CurrencyInput`
 * (`parseCurrencyInput` from lib/money).
 */
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AmountInput } from "./AmountInput";

describe("AmountInput", () => {
  it("shows the currency symbol and the 0.00 placeholder", () => {
    render(<AmountInput value={0} onChangeCents={() => {}} currency="MXN" aria-label="Monto" />);
    expect(screen.getByLabelText("Monto")).toHaveAttribute("placeholder", "0.00");
    expect(screen.getByText("$")).toBeInTheDocument();
  });

  it("emits cents while typing and normalizes the display on blur", async () => {
    const onChangeCents = vi.fn();
    render(<AmountInput value={0} onChangeCents={onChangeCents} aria-label="Monto" />);
    const user = userEvent.setup();
    const input = screen.getByLabelText("Monto") as HTMLInputElement;

    await user.type(input, "123.45");
    expect(onChangeCents).toHaveBeenLastCalledWith(12345);

    await user.tab();
    expect(input).toHaveValue("123.45");
  });

  it("reflects an external cents value while not editing", () => {
    render(<AmountInput value={100_000} onChangeCents={() => {}} aria-label="Monto" />);
    expect(screen.getByLabelText("Monto")).toHaveValue("1000.00");
  });

  it("renders the € symbol for EUR", () => {
    render(<AmountInput value={0} onChangeCents={() => {}} currency="EUR" aria-label="Monto" />);
    expect(screen.getByText("€")).toBeInTheDocument();
    expect(screen.queryByText("$")).not.toBeInTheDocument();
  });
});
