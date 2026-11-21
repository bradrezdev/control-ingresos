import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { SectionHeading } from "./SectionHeading";

describe("SectionHeading", () => {
  it("renders the title", () => {
    render(<SectionHeading title="Resumen" />);
    expect(screen.getByRole("heading", { name: "Resumen" })).toBeInTheDocument();
  });

  it("renders the action element on the right", () => {
    render(<SectionHeading title="Resumen" action={<button type="button">Ver todo</button>} />);
    expect(screen.getByRole("button", { name: "Ver todo" })).toBeInTheDocument();
  });

  it("uses the correct heading level", () => {
    render(<SectionHeading title="Resumen" level={3} />);
    expect(screen.getByRole("heading", { level: 3 })).toBeInTheDocument();
  });

  it("has primary text color and flex layout", () => {
    const { container } = render(<SectionHeading title="Resumen" />);
    expect(container.firstChild).toHaveClass("flex", "justify-between", "items-center");
  });
});
