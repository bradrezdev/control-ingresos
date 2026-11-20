import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { SegmentedControl } from "./SegmentedControl";

const OPTIONS = [
  { value: "all", label: "Todas" },
  { value: "income", label: "Ingresos" },
  { value: "expense", label: "Gastos" },
];

describe("SegmentedControl", () => {
  it("renders all options", () => {
    render(<SegmentedControl options={OPTIONS} value="all" onChange={() => {}} />);
    expect(screen.getByRole("button", { name: "Todas" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Ingresos" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Gastos" })).toBeInTheDocument();
  });

  it("marks the active option with aria-pressed", () => {
    render(<SegmentedControl options={OPTIONS} value="income" onChange={() => {}} />);
    expect(screen.getByRole("button", { name: "Todas" })).toHaveAttribute("aria-pressed", "false");
    expect(screen.getByRole("button", { name: "Ingresos" })).toHaveAttribute("aria-pressed", "true");
  });

  it("calls onChange with the selected value", async () => {
    const onChange = vi.fn();
    render(<SegmentedControl options={OPTIONS} value="all" onChange={onChange} />);
    await userEvent.click(screen.getByRole("button", { name: "Gastos" }));
    expect(onChange).toHaveBeenCalledWith("expense");
  });

  it("uses segment background and pill radius", () => {
    const { container } = render(<SegmentedControl options={OPTIONS} value="all" onChange={() => {}} />);
    expect(container.firstChild).toHaveClass("bg-segment", "rounded-pill");
  });
});
