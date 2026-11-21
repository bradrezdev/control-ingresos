import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TransactionError } from "./TransactionError";

describe("TransactionError", () => {
  it("renders the error message and a retry button", () => {
    render(<TransactionError message="No se pudo cargar" onRetry={vi.fn()} />);
    expect(screen.getByText("No se pudo cargar")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Reintentar" })).toBeInTheDocument();
  });

  it("calls onRetry when retry is pressed", async () => {
    const user = userEvent.setup();
    const onRetry = vi.fn();
    render(<TransactionError message="No se pudo cargar" onRetry={onRetry} />);
    await user.click(screen.getByRole("button", { name: "Reintentar" }));
    expect(onRetry).toHaveBeenCalled();
  });
});
