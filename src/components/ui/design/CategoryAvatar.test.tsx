import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { CategoryAvatar } from "./CategoryAvatar";

describe("CategoryAvatar", () => {
  it("renders the first letter of the category", () => {
    render(<CategoryAvatar category="Comida" />);
    expect(screen.getByText("C")).toBeInTheDocument();
  });

  it("capitalises the initial", () => {
    render(<CategoryAvatar category="transporte" />);
    expect(screen.getByText("T")).toBeInTheDocument();
  });

  it("falls back to a neutral icon when category is empty", () => {
    render(<CategoryAvatar />);
    expect(screen.getByTestId("category-avatar")).toBeInTheDocument();
  });
});
