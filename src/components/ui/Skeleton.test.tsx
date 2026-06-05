import { describe, expect, it } from "vitest";
import { render } from "@testing-library/react";
import { Skeleton } from "./Skeleton";

describe("Skeleton", () => {
  it("renders with the aria-hidden attribute", () => {
    const { container } = render(<Skeleton className="h-4 w-32" />);
    const el = container.firstChild as HTMLElement;
    expect(el).toHaveAttribute("aria-hidden", "true");
  });

  it("applies rounded class when rounded=full", () => {
    const { container } = render(<Skeleton rounded="full" />);
    const el = container.firstChild as HTMLElement;
    expect(el.className).toMatch(/rounded-full/);
  });
});
