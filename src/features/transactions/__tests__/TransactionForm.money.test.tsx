/**
 * TransactionForm money wiring — control-ingresos
 *
 * R-1 (bug 1) + R-6 (bug 6): the form's `amount` field must hold integer
 * cents and the submit payload must propagate the same cents WITHOUT any
 * additional `* 100` multiplication. The CurrencyInput already emits
 * cents; the form used to do a `displayToCents(cents) / 100` round-trip
 * that was a no-op numerically but, combined with the caller's `* 100`
 * in `pages/Transactions.tsx`, caused a 100× inflation in storage.
 *
 * After the fix the form passes cents straight through and the input
 * shows the user's intended dollar value.
 */
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TransactionForm } from "../TransactionForm";
import type { TransactionFormValues_Output } from "../TransactionForm";

describe("TransactionForm money wiring", () => {
  it("persists cents (not display) on submit: $1000 → amount === 100000", async () => {
    const onSubmit = vi.fn();
    render(
      <TransactionForm currency="MXN" onSubmit={onSubmit} onCancel={() => {}} />,
    );
    const user = userEvent.setup();
    // Type a $1,000 amount.
    const amountInput = screen.getByLabelText("Monto") as HTMLInputElement;
    await user.type(amountInput, "1000");
    await user.tab();
    // The displayed value should be the dollar amount, NOT 100× inflated.
    expect(amountInput).toHaveValue("1000.00");
    // Fill description (required by zod) and submit.
    await user.type(screen.getByLabelText("Descripción"), "Test");
    await user.click(screen.getByRole("button", { name: /Crear transacción/i }));

    expect(onSubmit).toHaveBeenCalledTimes(1);
    const submitted = onSubmit.mock
      .calls[0]![0] as TransactionFormValues_Output;
    expect(submitted.amount).toBe(100000);
  });

  it("preserves cents across the whole pipeline for non-round amounts ($123.45 → 12345)", async () => {
    const onSubmit = vi.fn();
    render(
      <TransactionForm currency="MXN" onSubmit={onSubmit} onCancel={() => {}} />,
    );
    const user = userEvent.setup();
    const amountInput = screen.getByLabelText("Monto") as HTMLInputElement;
    await user.type(amountInput, "123.45");
    await user.tab();
    expect(amountInput).toHaveValue("123.45");
    await user.type(screen.getByLabelText("Descripción"), "Coffee");
    await user.click(screen.getByRole("button", { name: /Crear transacción/i }));

    expect(onSubmit).toHaveBeenCalledTimes(1);
    const submitted = onSubmit.mock
      .calls[0]![0] as TransactionFormValues_Output;
    expect(submitted.amount).toBe(12345);
  });

  it("never inflates by 100×: $200 must not become 2000000", async () => {
    const onSubmit = vi.fn();
    render(
      <TransactionForm currency="MXN" onSubmit={onSubmit} onCancel={() => {}} />,
    );
    const user = userEvent.setup();
    const amountInput = screen.getByLabelText("Monto") as HTMLInputElement;
    await user.type(amountInput, "200");
    await user.tab();
    await user.type(screen.getByLabelText("Descripción"), "Test");
    await user.click(screen.getByRole("button", { name: /Crear transacción/i }));

    const submitted = onSubmit.mock
      .calls[0]![0] as TransactionFormValues_Output;
    expect(submitted.amount).toBe(20000);
    expect(submitted.amount).not.toBe(2000000);
  });
});
