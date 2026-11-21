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

  it("renders negative amounts with a typographic minus sign", () => {
    render(<Amount cents={-50000} />);
    expect(screen.getByText("−$500.00")).toBeInTheDocument();
  });

  it("forces positive sign when requested", () => {
    render(<Amount cents={-50000} sign="positive" />);
    expect(screen.getByText("$500.00")).toBeInTheDocument();
  });

  it("forces negative sign with a typographic minus when requested", () => {
    render(<Amount cents={50000} sign="negative" />);
    expect(screen.getByText("−$500.00")).toBeInTheDocument();
  });

  it("can prefix positive amounts with a plus sign for income", () => {
    render(<Amount cents={50000} prefix="+" className="text-positive" />);
    expect(screen.getByText("+$500.00")).toBeInTheDocument();
  });

  it("uses the provided currency code", () => {
    render(<Amount cents={100000} currency="USD" />);
    expect(screen.getByText("$1,000.00")).toBeInTheDocument();
  });

  it("does not add a plus prefix to zero or negative values", () => {
    const { rerender } = render(<Amount cents={0} prefix="+" />);
    expect(screen.getByText("$0.00")).toBeInTheDocument();

    rerender(<Amount cents={-10000} prefix="+" />);
    expect(screen.getByText("−$100.00")).toBeInTheDocument();
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
