import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MsiSelector } from "./MsiSelector";

describe("MsiSelector", () => {
  it("renders all 6 MSI term buttons (3, 6, 9, 12, 18, 24)", () => {
    render(<MsiSelector totalCents={0} value={null} onChange={() => {}} />);
    const radios = screen.getAllByRole("radio");
    expect(radios).toHaveLength(6);
    // Each radio's accessible name includes its term label (e.g. "3 meses").
    const names = radios.map((r) => r.textContent ?? "");
    for (const term of [3, 6, 9, 12, 18, 24]) {
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
    await user.click(radios[2]!); // 9 months
    expect(onChange).toHaveBeenCalledWith(9);
  });

  it("displays monthly preview when total is greater than 0", () => {
    render(<MsiSelector totalCents={120000} value={null} onChange={() => {}} />);
    // 1200 / 12 = 100 monthly. Look for the "100.00" pattern.
    expect(screen.getByText(/100\.00\/mes/)).toBeInTheDocument();
  });
});
