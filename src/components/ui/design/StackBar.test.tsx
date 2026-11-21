import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { StackBar } from "./StackBar";

describe("StackBar", () => {
  it("renders segments proportional to their values", () => {
    const { container } = render(
      <StackBar
        segments={[
          { value: 25, color: "bg-positive" },
          { value: 75, color: "bg-warning" },
        ]}
      />,
    );
    const bars = container.querySelectorAll("[data-stack-segment]");
    expect(bars).toHaveLength(2);
    expect(bars[0]).toHaveStyle("width: 25%");
    expect(bars[1]).toHaveStyle("width: 75%");
  });

  it("renders nothing when total is zero", () => {
    const { container } = render(<StackBar segments={[]} />);
    expect(container.firstChild).toBeEmptyDOMElement();
  });

  it("has rounded bar and gap", () => {
    const { container } = render(
      <StackBar segments={[{ value: 100, color: "bg-primary" }]} />,
    );
    expect(container.firstChild).toHaveClass("flex", "gap-1", "h-2.5", "rounded-full");
  });
});
