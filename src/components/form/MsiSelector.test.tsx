import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MsiSelector } from "./MsiSelector";

describe("MsiSelector", () => {
  it("renders all 7 MSI term buttons (1, 3, 6, 9, 12, 18, 24)", () => {
    render(<MsiSelector totalCents={0} value={null} onChange={() => {}} />);
    const radios = screen.getAllByRole("radio");
    expect(radios).toHaveLength(7);
    // Cada radio incluye su plazo (e.g. "3 meses" o "$X/mes").
    const names = radios.map((r) => r.textContent ?? "");
    for (const term of [1, 3, 6, 9, 12, 18, 24]) {
      expect(names.some((n) => n.includes(`${term}`))).toBe(true);
    }
  });

  it("marks the selected term with aria-checked=true", async () => {
    const onChange = vi.fn();
    render(<MsiSelector totalCents={0} value={12} onChange={onChange} />);
    const radios = screen.getAllByRole("radio");
    const twelve = radios.find((r) => r.textContent?.startsWith("12"));
    expect(twelve).toHaveAttribute("aria-checked", "true");
  });

  it("emits onChange when a button is clicked", async () => {
    const onChange = vi.fn();
    render(<MsiSelector totalCents={0} value={null} onChange={onChange} />);
    const user = userEvent.setup();
    const radios = screen.getAllByRole("radio");
    await user.click(radios[2]!); // 6 months (índice 2 con plazo 1 incluido)
    expect(onChange).toHaveBeenCalledWith(6);
  });

  it("displays monthly preview when total is greater than 0", () => {
    render(<MsiSelector totalCents={120000} value={null} onChange={() => {}} />);
    // 1200 / 12 = 100 monthly. Look for the "100.00" pattern.
    expect(screen.getByText(/100\.00\/mes/)).toBeInTheDocument();
  });

  it("plazo 1: totalCents=1200 → preview '$12.00/mes' (cuota = total, no división)", () => {
    render(<MsiSelector totalCents={1200} value={null} onChange={() => {}} />);
    expect(screen.getByText("$12.00/mes")).toBeInTheDocument();
  });
});
