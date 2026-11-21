import { describe, expect, it } from "vitest";
import { render } from "@testing-library/react";
import { TransactionSkeleton } from "./TransactionSkeleton";

describe("TransactionSkeleton", () => {
  it("renders skeleton placeholders", () => {
    const { container } = render(<TransactionSkeleton />);
    expect(container.querySelectorAll("[class*='animate-pulse']").length).toBeGreaterThan(0);
  });
});
