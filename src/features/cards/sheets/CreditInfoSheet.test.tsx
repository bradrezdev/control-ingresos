import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CreditInfoSheet } from "./CreditInfoSheet";

describe("CreditInfoSheet", () => {
  it("renders the title and explanation blocks", () => {
    render(<CreditInfoSheet onClose={vi.fn()} />);

    expect(screen.getByRole("heading", { name: "Cómo se estima el crédito" })).toBeInTheDocument();
    expect(screen.getByText(/crédito usado/i)).toBeInTheDocument();
    expect(screen.getByText(/Es el límite registrado menos lo usado/i)).toBeInTheDocument();
    expect(screen.getByText(/resumen/i)).toBeInTheDocument();
  });

  it('calls onClose when "Entendido" is clicked', async () => {
    const onClose = vi.fn();
    render(<CreditInfoSheet onClose={onClose} />);

    await userEvent.click(screen.getByRole("button", { name: "Entendido" }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("calls onClose when the drawer close button is clicked", async () => {
    const onClose = vi.fn();
    render(<CreditInfoSheet onClose={onClose} />);

    await userEvent.click(screen.getByRole("button", { name: "Cerrar la hoja" }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
