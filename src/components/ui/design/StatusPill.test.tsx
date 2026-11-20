import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { StatusPill } from "./StatusPill";

describe("StatusPill", () => {
  it("renders its label", () => {
    render(<StatusPill tone="ok">Pagado</StatusPill>);
    expect(screen.getByText("Pagado")).toBeInTheDocument();
  });

  it.each([
    ["ok", "bg-positive-bg", "text-positive"],
    ["warn", "bg-warning-bg", "text-warning"],
    ["neutral", "bg-neutral-bg", "text-text-secondary"],
    ["info", "bg-cyan-bg", "text-cyan"],
  ] as const)("applies %s tone classes", (tone, bg, text) => {
    const { container } = render(<StatusPill tone={tone}>Label</StatusPill>);
    expect(container.firstChild).toHaveClass(bg, text);
  });

  it("is pill-shaped", () => {
    const { container } = render(<StatusPill tone="ok">Label</StatusPill>);
    expect(container.firstChild).toHaveClass("rounded-pill");
  });
});
