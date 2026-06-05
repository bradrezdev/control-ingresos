import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { EmptyState } from "./EmptyState";
import { Button } from "@/components/ui/Button";

describe("EmptyState", () => {
  it("renders title and description", () => {
    render(<EmptyState title="Sin tarjetas" description="Agregá tu primera tarjeta" />);
    expect(screen.getByText("Sin tarjetas")).toBeInTheDocument();
    expect(screen.getByText("Agregá tu primera tarjeta")).toBeInTheDocument();
  });

  it("renders an action when provided", async () => {
    const onClick = vi.fn();
    render(
      <EmptyState
        title="Empty"
        action={<Button onClick={onClick}>Add</Button>}
      />,
    );
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: /add/i }));
    expect(onClick).toHaveBeenCalledOnce();
  });
});
