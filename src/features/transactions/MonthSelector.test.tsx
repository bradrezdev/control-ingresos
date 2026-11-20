import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MonthSelector } from "./MonthSelector";

describe("MonthSelector", () => {
  it("renders the current month label", () => {
    render(<MonthSelector monthIso="2026-11" onChange={vi.fn()} />);
    expect(screen.getByText("noviembre 2026")).toBeInTheDocument();
  });

  it("navigates to the previous month", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<MonthSelector monthIso="2026-11" onChange={onChange} />);
    await user.click(screen.getByRole("button", { name: "Mes anterior" }));
    expect(onChange).toHaveBeenCalledWith("2026-10");
  });

  it("navigates to the next month", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<MonthSelector monthIso="2026-11" onChange={onChange} />);
    await user.click(screen.getByRole("button", { name: "Mes siguiente" }));
    expect(onChange).toHaveBeenCalledWith("2026-12");
  });
});
