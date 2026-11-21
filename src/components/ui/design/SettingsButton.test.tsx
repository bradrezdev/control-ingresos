import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { describe, expect, it } from "vitest";
import { SettingsButton } from "./SettingsButton";

function Wrapper({ children }: { children: React.ReactNode }) {
  return <MemoryRouter>{children}</MemoryRouter>;
}

describe("SettingsButton", () => {
  it("renders a link to /settings with accessible label", () => {
    render(
      <Wrapper>
        <SettingsButton />
      </Wrapper>,
    );
    const link = screen.getByRole("link", { name: "Ajustes" });
    expect(link).toHaveAttribute("href", "/settings");
  });

  it("is a 44x44 circular touch target", () => {
    const { container } = render(
      <Wrapper>
        <SettingsButton />
      </Wrapper>,
    );
    expect(container.firstChild).toHaveClass("size-11", "rounded-full");
  });
});
