import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ListRow } from "./ListRow";

describe("ListRow", () => {
  it("renders title and subtitle", () => {
    render(<ListRow title="Netflix" subtitle="Entretenimiento" />);
    expect(screen.getByText("Netflix")).toBeInTheDocument();
    expect(screen.getByText("Entretenimiento")).toBeInTheDocument();
  });

  it("renders a leading avatar", () => {
    render(<ListRow title="Netflix" leading={<span data-testid="avatar">N</span>} />);
    expect(screen.getByTestId("avatar")).toBeInTheDocument();
  });

  it("renders trailing content", () => {
    render(<ListRow title="Netflix" trailing={<span data-testid="badge">Pendiente</span>} />);
    expect(screen.getByTestId("badge")).toBeInTheDocument();
  });

  it("has a top separator by default", () => {
    const { container } = render(<ListRow title="Netflix" />);
    expect(container.firstChild).toHaveClass("border-t", "border-border-subtle");
  });

  it("is interactive when onClick is provided", async () => {
    const onClick = vi.fn();
    render(<ListRow title="Netflix" onClick={onClick} />);
    await userEvent.click(screen.getByRole("button"));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("renders as a div when not interactive", () => {
    const { container } = render(<ListRow title="Netflix" />);
    expect(container.firstChild?.nodeName).toBe("DIV");
  });

  it("has a minimum height of 64px", () => {
    const { container } = render(<ListRow title="Netflix" />);
    expect(container.firstChild).toHaveClass("min-h-16");
  });
});
