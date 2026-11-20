import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { HeroCard } from "./HeroCard";

describe("HeroCard", () => {
  it("renders children", () => {
    render(<HeroCard>hero content</HeroCard>);
    expect(screen.getByText("hero content")).toBeInTheDocument();
  });

  it("uses hero background, white text, and 28px radius", () => {
    const { container } = render(<HeroCard>hero</HeroCard>);
    const card = container.firstChild as HTMLElement;
    expect(card).toHaveClass("bg-hero", "text-hero-text", "rounded-hero");
  });

  it("forwards the as prop", () => {
    const { container } = render(<HeroCard as="div">hero</HeroCard>);
    expect(container.firstChild?.nodeName).toBe("DIV");
  });
});
