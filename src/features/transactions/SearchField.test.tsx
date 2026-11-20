import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SearchField } from "./SearchField";

describe("SearchField", () => {
  it("renders a search input", () => {
    render(<SearchField value="" onChange={vi.fn()} onClose={vi.fn()} />);
    expect(screen.getByRole("searchbox")).toBeInTheDocument();
  });

  it("emits onChange when typing", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<SearchField value="" onChange={onChange} onClose={vi.fn()} />);
    await user.type(screen.getByRole("searchbox"), "cena");
    expect(onChange).toHaveBeenCalledTimes(4);
    expect(onChange).toHaveBeenLastCalledWith("a");
  });

  it("calls onClose when the close button is pressed", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(<SearchField value="" onChange={vi.fn()} onClose={onClose} />);
    await user.click(screen.getByRole("button", { name: "Cerrar búsqueda" }));
    expect(onClose).toHaveBeenCalled();
  });
});
