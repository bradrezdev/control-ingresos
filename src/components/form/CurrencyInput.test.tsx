import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CurrencyInput } from "./CurrencyInput";

describe("CurrencyInput", () => {
  it("renders the currency code as a left addon", () => {
    render(<CurrencyInput value={0} onChangeCents={() => {}} currency="MXN" />);
    expect(screen.getByText("MXN")).toBeInTheDocument();
  });

  it("emits parsed cents on each keystroke", async () => {
    const onChangeCents = vi.fn();
    render(<CurrencyInput value={0} onChangeCents={onChangeCents} aria-label="amount" />);
    const user = userEvent.setup();
    const input = screen.getByLabelText("amount");
    await user.type(input, "1234.50");
    // Multiple emissions — final one is the parsed value of "1234.50" = 123450.
    const lastCall =
      onChangeCents.mock.calls[onChangeCents.mock.calls.length - 1]?.[0];
    expect(lastCall).toBe(123450);
  });

  it("re-formats display on blur", async () => {
    const onChangeCents = vi.fn();
    render(<CurrencyInput value={0} onChangeCents={onChangeCents} aria-label="amount" />);
    const user = userEvent.setup();
    const input = screen.getByLabelText("amount");
    await user.type(input, "999");
    await user.tab();
    expect(input).toHaveValue("999.00");
  });

  it("does not reformat display while typing", async () => {
    const onChangeCents = vi.fn();
    render(<CurrencyInput value={0} onChangeCents={onChangeCents} aria-label="amount" />);
    const user = userEvent.setup();
    const input = screen.getByLabelText("amount");
    await user.type(input, "1234");
    expect(input).toHaveValue("1234");
    expect(onChangeCents).toHaveBeenLastCalledWith(123400);
  });

  it("formats display on blur after typing", async () => {
    const onChangeCents = vi.fn();
    render(<CurrencyInput value={0} onChangeCents={onChangeCents} aria-label="amount" />);
    const user = userEvent.setup();
    const input = screen.getByLabelText("amount");
    await user.type(input, "999");
    await user.tab();
    expect(input).toHaveValue("999.00");
    expect(onChangeCents).toHaveBeenLastCalledWith(99900);
  });

  it("preserves cursor on backspace (no double-zero)", async () => {
    const onChangeCents = vi.fn();
    render(<CurrencyInput value={0} onChangeCents={onChangeCents} aria-label="amount" />);
    const user = userEvent.setup();
    const input = screen.getByLabelText("amount");
    await user.type(input, "1234");
    await user.keyboard("{Backspace}");
    expect(input).toHaveValue("123");
    expect(onChangeCents).toHaveBeenLastCalledWith(12300);
  });
});
