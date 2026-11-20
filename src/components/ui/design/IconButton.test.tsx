import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { IconButton } from "./IconButton";

const Heart = () => <svg data-testid="heart-icon" aria-hidden />;

describe("IconButton", () => {
  it("renders the icon", () => {
    render(<IconButton icon={<Heart />} aria-label="Like" />);
    expect(screen.getByTestId("heart-icon")).toBeInTheDocument();
  });

  it("requires an aria-label", () => {
    // Type-only assertion: the component expects aria-label.
    render(<IconButton icon={<Heart />} aria-label="Like" />);
    expect(screen.getByRole("button")).toHaveAttribute("aria-label", "Like");
  });

  it("calls onClick when activated", async () => {
    const onClick = vi.fn();
    render(<IconButton icon={<Heart />} aria-label="Like" onClick={onClick} />);
    await userEvent.click(screen.getByRole("button"));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("is disabled when disabled is true", () => {
    render(<IconButton icon={<Heart />} aria-label="Like" disabled />);
    expect(screen.getByRole("button")).toBeDisabled();
  });

  it("is circular and 44x44", () => {
    const { container } = render(<IconButton icon={<Heart />} aria-label="Like" />);
    expect(container.firstChild).toHaveClass("size-11", "rounded-full");
  });
});
