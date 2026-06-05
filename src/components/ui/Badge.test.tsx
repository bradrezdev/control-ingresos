import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { Badge } from "./Badge";

describe("Badge", () => {
  it("renders text content", () => {
    render(<Badge>Active</Badge>);
    expect(screen.getByText("Active")).toBeInTheDocument();
  });

  it("renders different variants without crashing", () => {
    const { rerender } = render(<Badge variant="success">S</Badge>);
    expect(screen.getByText("S")).toBeInTheDocument();
    rerender(<Badge variant="warning">W</Badge>);
    expect(screen.getByText("W")).toBeInTheDocument();
    rerender(<Badge variant="danger">D</Badge>);
    expect(screen.getByText("D")).toBeInTheDocument();
    rerender(<Badge variant="info">I</Badge>);
    expect(screen.getByText("I")).toBeInTheDocument();
  });
});
