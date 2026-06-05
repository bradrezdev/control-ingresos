/**
 * ThemeToggle smoke + behavior tests
 */
import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ThemeToggle } from "./ThemeToggle";
import { useUiStore } from "@/stores/uiStore";

describe("ThemeToggle", () => {
  beforeEach(() => {
    cleanup();
    useUiStore.setState({ theme: "system" });
  });

  it("renders three radio options (light/dark/system)", () => {
    render(<ThemeToggle />);
    expect(screen.getByRole("radiogroup", { name: "Tema" })).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: "Claro" })).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: "Oscuro" })).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: "Sistema" })).toBeInTheDocument();
  });

  it("marks the current theme as checked", () => {
    useUiStore.setState({ theme: "dark" });
    render(<ThemeToggle />);
    expect(screen.getByRole("radio", { name: "Oscuro" })).toHaveAttribute(
      "aria-checked",
      "true",
    );
    expect(screen.getByRole("radio", { name: "Claro" })).toHaveAttribute(
      "aria-checked",
      "false",
    );
  });

  it("updates uiStore.theme when a different option is clicked", async () => {
    const user = userEvent.setup();
    render(<ThemeToggle />);
    await user.click(screen.getByRole("radio", { name: "Claro" }));
    expect(useUiStore.getState().theme).toBe("light");
    await user.click(screen.getByRole("radio", { name: "Oscuro" }));
    expect(useUiStore.getState().theme).toBe("dark");
  });

  it("size=md shows labels alongside icons", () => {
    render(<ThemeToggle size="md" />);
    expect(screen.getByText("Claro")).toBeInTheDocument();
    expect(screen.getByText("Oscuro")).toBeInTheDocument();
    expect(screen.getByText("Sistema")).toBeInTheDocument();
  });

  it("size=sm hides text labels (only icons + aria-label)", () => {
    render(<ThemeToggle size="sm" />);
    expect(screen.queryByText("Claro")).not.toBeInTheDocument();
    expect(screen.queryByText("Oscuro")).not.toBeInTheDocument();
    // aria-label still present via the radio role lookup
    expect(screen.getByRole("radio", { name: "Claro" })).toBeInTheDocument();
  });
});
