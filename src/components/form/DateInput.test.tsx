import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { DateInput } from "./DateInput";

describe("DateInput", () => {
  it("renders with a label", () => {
    render(<DateInput value="2026-06-04" onValueChange={() => {}} label="Fecha" />);
    expect(screen.getByLabelText("Fecha")).toBeInTheDocument();
  });

  it("emits iso value on change", async () => {
    const onValueChange = vi.fn();
    render(<DateInput value="" onValueChange={onValueChange} label="Fecha" />);
    const user = userEvent.setup();
    const input = screen.getByLabelText("Fecha");
    await user.type(input, "2026-06-04");
    expect(onValueChange).toHaveBeenCalled();
    expect(onValueChange).toHaveBeenLastCalledWith("2026-06-04");
  });
});
