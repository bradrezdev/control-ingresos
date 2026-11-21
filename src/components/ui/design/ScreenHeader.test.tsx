import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { describe, expect, it } from "vitest";
import { ScreenHeader } from "./ScreenHeader";

function Wrapper({ children }: { children: React.ReactNode }) {
  return <MemoryRouter>{children}</MemoryRouter>;
}

describe("ScreenHeader", () => {
  it("renders the title as a level-1 heading", () => {
    render(
      <Wrapper>
        <ScreenHeader title="Inicio" />
      </Wrapper>,
    );
    const heading = screen.getByRole("heading", { level: 1, name: "Inicio" });
    expect(heading).toBeInTheDocument();
  });

  it("renders eyebrow and subtitle", () => {
    render(
      <Wrapper>
        <ScreenHeader title="Ajustes" eyebrow="Viernes 20 de noviembre" subtitle="Preferencias" />
      </Wrapper>,
    );
    expect(screen.getByText("Viernes 20 de noviembre")).toBeInTheDocument();
    expect(screen.getByText("Preferencias")).toBeInTheDocument();
  });

  it("renders the right slot", () => {
    render(
      <Wrapper>
        <ScreenHeader title="Inicio" right={<button type="button">Action</button>} />
      </Wrapper>,
    );
    expect(screen.getByRole("button", { name: "Action" })).toBeInTheDocument();
  });

  it("renders a back link with default label", () => {
    render(
      <Wrapper>
        <ScreenHeader title="Ajustes" back={{ to: "/" }} />
      </Wrapper>,
    );
    const link = screen.getByRole("link", { name: "Volver" });
    expect(link).toHaveAttribute("href", "/");
  });

  it("renders a back link with custom label", () => {
    render(
      <Wrapper>
        <ScreenHeader title="Ajustes" back={{ to: "/", label: "Regresar al inicio" }} />
      </Wrapper>,
    );
    expect(screen.getByRole("link", { name: "Regresar al inicio" })).toBeInTheDocument();
  });
});
