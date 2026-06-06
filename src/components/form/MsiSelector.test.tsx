import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MsiSelector } from "./MsiSelector";

describe("MsiSelector", () => {
  it("renders 48 MSI term options (1..48) plus a placeholder when value is null", () => {
    render(<MsiSelector totalCents={0} value={null} onChange={() => {}} />);
    const options = screen.getAllByRole("option");
    // 48 plazos + 1 opción placeholder ("Seleccioná un plazo") cuando value=null.
    expect(options).toHaveLength(49);
    // Las primeras 48 opciones reales tienen value "1".."48".
    const realValues = options
      .filter((opt) => (opt as HTMLOptionElement).value !== "")
      .map((opt) => (opt as HTMLOptionElement).value);
    expect(realValues).toEqual(
      Array.from({ length: 48 }, (_, i) => String(i + 1)),
    );
  });

  it("reflects the selected term as the select value", () => {
    render(<MsiSelector totalCents={0} value={12} onChange={() => {}} />);
    const select = screen.getByRole("combobox") as HTMLSelectElement;
    expect(select.value).toBe("12");
  });

  it("emits onChange with the parsed numeric term", async () => {
    const onChange = vi.fn();
    render(<MsiSelector totalCents={0} value={null} onChange={onChange} />);
    const user = userEvent.setup();
    const select = screen.getByRole("combobox");
    await user.selectOptions(select, "6");
    expect(onChange).toHaveBeenCalledWith(6);
  });

  it("displays monthly preview for every option when total is greater than 0", () => {
    render(<MsiSelector totalCents={120000} value={null} onChange={() => {}} />);
    // 1200 / 12 = 100 monthly. La etiqueta del plazo 12 debe incluir "$100.00/mes".
    expect(
      screen.getByRole("option", { name: /^12 meses — \$100\.00\/mes$/ }),
    ).toBeInTheDocument();
  });

  it("plazo 1: totalCents=1200 → label '1 mes — $12.00/mes' (cuota = total, no división)", () => {
    render(<MsiSelector totalCents={1200} value={null} onChange={() => {}} />);
    expect(
      screen.getByRole("option", { name: "1 mes — $12.00/mes" }),
    ).toBeInTheDocument();
  });
});
