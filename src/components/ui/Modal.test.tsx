import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Modal } from "./Modal";

describe("Modal", () => {
  it("does not render content when closed", () => {
    render(
      <Modal open={false} onClose={() => {}}>
        <p>Hidden</p>
      </Modal>,
    );
    expect(screen.queryByText("Hidden")).not.toBeInTheDocument();
  });

  it("renders content when open", () => {
    render(
      <Modal open onClose={() => {}} title="My title">
        <p>Visible</p>
      </Modal>,
    );
    expect(screen.getByText("Visible")).toBeInTheDocument();
    expect(screen.getByRole("dialog")).toHaveAttribute(
      "aria-labelledby",
      "modal-title",
    );
  });

  it("calls onClose when clicking the close button", async () => {
    const onClose = vi.fn();
    render(
      <Modal open onClose={onClose} title="T">
        <p>Body</p>
      </Modal>,
    );
    const user = userEvent.setup();
    // Pick the X close button (aria-label "Cerrar"), not the backdrop.
    const closeBtn = screen.getByRole("button", { name: "Cerrar" });
    await user.click(closeBtn);
    expect(onClose).toHaveBeenCalled();
  });

  it("calls onClose when Escape is pressed", async () => {
    const onClose = vi.fn();
    render(
      <Modal open onClose={onClose} title="T">
        <p>Body</p>
      </Modal>,
    );
    const user = userEvent.setup();
    await user.keyboard("{Escape}");
    expect(onClose).toHaveBeenCalled();
  });
});
