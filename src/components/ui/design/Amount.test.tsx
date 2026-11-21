import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Amount } from "./Amount";

describe("Amount", () => {
  it("formats cents as MXN currency", () => {
    render(<Amount cents={123450} />);
    expect(screen.getByText("$1,234.50")).toBeInTheDocument();
  });

  it("renders zero correctly", () => {
    render(<Amount cents={0} />);
    expect(screen.getByText("$0.00")).toBeInTheDocument();
  });

  it("renders negative amounts when sign is auto", () => {
    render(<Amount cents={-50000} />);
    expect(screen.getByText("-$500.00")).toBeInTheDocument();
  });

  it("forces positive sign when requested", () => {
    render(<Amount cents={-50000} sign="positive" />);
    expect(screen.getByText("$500.00")).toBeInTheDocument();
  });

  it("forces negative sign when requested", () => {
    render(<Amount cents={50000} sign="negative" />);
    expect(screen.getByText("-$500.00")).toBeInTheDocument();
  });

  it("falls back to em-dash for non-finite values", () => {
    render(<Amount cents={NaN} />);
    expect(screen.getByText("—")).toBeInTheDocument();
  });

  it("applies tabular-nums via className", () => {
    const { container } = render(<Amount cents={100} />);
    expect(container.firstChild).toHaveClass("tabular-nums");
  });
});
