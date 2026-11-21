import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { Chip } from "./Chip";

describe("Chip", () => {
  it("renders its label", () => {
    render(<Chip active={false}>Enero</Chip>);
    expect(screen.getByRole("button", { name: "Enero" })).toBeInTheDocument();
  });

  it("sets aria-pressed true when active", () => {
    render(<Chip active>Enero</Chip>);
    expect(screen.getByRole("button")).toHaveAttribute("aria-pressed", "true");
  });

  it("sets aria-pressed false when inactive", () => {
    render(<Chip active={false}>Enero</Chip>);
    expect(screen.getByRole("button")).toHaveAttribute("aria-pressed", "false");
  });

  it("calls onClick when activated", async () => {
    const onClick = vi.fn();
    render(<Chip active={false} onClick={onClick}>Enero</Chip>);
    await userEvent.click(screen.getByRole("button"));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("has pill radius and 44px height", () => {
    const { container } = render(<Chip active={false}>Enero</Chip>);
    expect(container.firstChild).toHaveClass("rounded-pill", "h-11");
  });

  it("uses active styles when active", () => {
    const { container } = render(<Chip active>Enero</Chip>);
    expect(container.firstChild).toHaveClass("bg-button", "text-hero-text");
  });

  it("variant=inset uses the secondary surface when inactive (chips inside cards)", () => {
    const { container } = render(
      <Chip active={false} variant="inset">
        Enero
      </Chip>,
    );
    expect(container.firstChild).toHaveClass("bg-surface-inset");
    expect(container.firstChild).not.toHaveClass("bg-surface");
  });

  it("variant=inset keeps the primary active style", () => {
    const { container } = render(
      <Chip active variant="inset">
        Enero
      </Chip>,
    );
    expect(container.firstChild).toHaveClass("bg-button", "text-hero-text");
  });
});
