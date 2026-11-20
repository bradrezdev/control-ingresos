import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { PaperCard } from "./PaperCard";

describe("PaperCard", () => {
  it("renders children", () => {
    render(<PaperCard>content</PaperCard>);
    expect(screen.getByText("content")).toBeInTheDocument();
  });

  it("defaults to a section with surface background and 24px radius", () => {
    const { container } = render(<PaperCard>content</PaperCard>);
    const card = container.firstChild as HTMLElement;
    expect(card.tagName).toBe("SECTION");
    expect(card).toHaveClass("bg-surface", "rounded-lg");
  });

  it("forwards the as prop", () => {
    const { container } = render(<PaperCard as="article">content</PaperCard>);
    expect(container.firstChild?.nodeName).toBe("ARTICLE");
  });

  it("merges custom className", () => {
    const { container } = render(<PaperCard className="extra">content</PaperCard>);
    expect(container.firstChild).toHaveClass("extra");
  });
});
