import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { LoadingSpinner } from "./LoadingSpinner";

describe("LoadingSpinner", () => {
  it("renders with default aria-label 'Cargando'", () => {
    render(<LoadingSpinner />);
    expect(screen.getByRole("status")).toHaveAttribute("aria-label", "Cargando");
  });

  it("renders with custom aria-label", () => {
    render(<LoadingSpinner label="Cargando transacciones" />);
    expect(screen.getByRole("status")).toHaveAttribute(
      "aria-label",
      "Cargando transacciones",
    );
  });
});
