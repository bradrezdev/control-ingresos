import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Input } from "./Input";

describe("Input", () => {
  it("renders with placeholder and value", () => {
    render(<Input placeholder="Type here" value="hello" onChange={() => {}} />);
    const input = screen.getByPlaceholderText("Type here");
    expect(input).toHaveValue("hello");
  });

  it("calls onChange when typed into", async () => {
    const onChange = vi.fn();
    render(<Input onChange={onChange} aria-label="field" />);
    const user = userEvent.setup();
    await user.type(screen.getByLabelText("field"), "a");
    expect(onChange).toHaveBeenCalled();
  });

  it("shows aria-invalid when invalid", () => {
    render(<Input invalid aria-label="bad" />);
    expect(screen.getByLabelText("bad")).toHaveAttribute("aria-invalid", "true");
  });

  it("renders left and right addons when provided", () => {
    render(
      <Input
        leftAddon={<span data-testid="left">L</span>}
        rightAddon={<span data-testid="right">R</span>}
        aria-label="field"
      />,
    );
    expect(screen.getByTestId("left")).toBeInTheDocument();
    expect(screen.getByTestId("right")).toBeInTheDocument();
  });

  it("is disabled when disabled prop is set", () => {
    render(<Input disabled aria-label="field" />);
    expect(screen.getByLabelText("field")).toBeDisabled();
  });
});
