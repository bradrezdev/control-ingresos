import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { TermBar } from "./TermBar";

describe("TermBar", () => {
  it("renders label, percentage and amount", () => {
    render(<TermBar label="3 MSI" percent={30} amountCents={30000} />);
    expect(screen.getByText("3 MSI")).toBeInTheDocument();
    expect(screen.getByText("30%")).toBeInTheDocument();
    expect(screen.getByText("$300.00")).toBeInTheDocument();
  });

  it("clamps percentage between 0 and 100", () => {
    const { rerender } = render(<TermBar label="Test" percent={150} amountCents={0} />);
    expect(screen.getByText("100%")).toBeInTheDocument();

    rerender(<TermBar label="Test" percent={-20} amountCents={0} />);
    expect(screen.getByText("0%")).toBeInTheDocument();
  });

  it("positions the fill bar by percentage", () => {
    const { container } = render(<TermBar label="3 MSI" percent={40} amountCents={0} />);
    const fill = container.querySelector("[data-term-fill]");
    expect(fill).toHaveStyle("width: 40%");
  });

  it("has a segment track and primary fill", () => {
    const { container } = render(<TermBar label="3 MSI" percent={40} amountCents={0} />);
    expect(container.firstChild).toHaveClass("flex", "items-center", "gap-2.5");
  });

  it("keeps the term label on one line at prototype proportions", () => {
    const { container } = render(
      <TermBar label="12 meses" percent={30} amountCents={30000} />,
    );
    // Prototype `.ms` rows are 13px so the 62px label column holds
    // "24 meses" unbroken; the row must not fall back to a larger size.
    expect(container.firstChild).toHaveClass("text-aux");
    const label = screen.getByText("12 meses");
    expect(label).toHaveClass("w-[62px]", "shrink-0", "whitespace-nowrap");
  });

  it("never breaks the amount or the percentage", () => {
    render(<TermBar label="12 meses" percent={30} amountCents={30000} />);
    const amount = screen.getByText("$300.00");
    expect(amount.parentElement).toHaveClass("whitespace-nowrap");
  });
});
