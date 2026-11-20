import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes, useLocation } from "react-router";
import { describe, expect, it } from "vitest";
import { AppShell } from "./AppShell";

function LocationReader(): React.JSX.Element {
  const location = useLocation();
  return (
    <div data-testid="location">
      {location.pathname}
      {location.state && typeof location.state === "object"
        ? `|openCreate=${String((location.state as { openCreate?: boolean }).openCreate)}`
        : ""}
    </div>
  );
}

function Wrapper({
  children,
  initialEntries = ["/"],
}: {
  children: React.ReactNode;
  initialEntries?: string[];
}): React.JSX.Element {
  return (
    <MemoryRouter initialEntries={initialEntries}>
      <Routes>
        <Route
          path="*"
          element={
            <>
              {children}
              <LocationReader />
            </>
          }
        />
      </Routes>
    </MemoryRouter>
  );
}

describe("AppShell", () => {
  it("renders the main navigation", () => {
    render(
      <Wrapper>
        <AppShell>
          <div>Content</div>
        </AppShell>
      </Wrapper>,
    );
    expect(
      screen.getByRole("navigation", { name: "Navegación principal" }),
    ).toBeInTheDocument();
  });

  it("orders the destinations as Inicio, Movimientos, +, Tarjetas, Fijos", () => {
    render(
      <Wrapper>
        <AppShell>
          <div>Content</div>
        </AppShell>
      </Wrapper>,
    );
    const nav = screen.getByRole("navigation", { name: "Navegación principal" });
    const links = within(nav).getAllByRole("link");

    expect(links).toHaveLength(5);
    expect(links[0]).toHaveAttribute("href", "/");
    expect(links[1]).toHaveAttribute("href", "/transactions");
    expect(links[2]).toHaveAttribute("href", "/transactions/new");
    expect(links[2]).toHaveAttribute("aria-label", "Nueva transacción");
    expect(links[3]).toHaveAttribute("href", "/cards");
    expect(links[4]).toHaveAttribute("href", "/fixed-payments");
  });

  it("marks the active section with aria-current=page", () => {
    render(
      <Wrapper initialEntries={[`/cards`]}>
        <AppShell>
          <div>Content</div>
        </AppShell>
      </Wrapper>,
    );
    const active = screen.getByRole("link", { current: "page" });
    expect(active).toHaveAttribute("href", "/cards");
  });

  it("navigates to /transactions/new without openCreate state when the + button is clicked", async () => {
    const user = userEvent.setup();
    render(
      <Wrapper>
        <AppShell>
          <div>Content</div>
        </AppShell>
      </Wrapper>,
    );
    const addButton = screen.getByRole("link", { name: "Nueva transacción" });
    await user.click(addButton);

    expect(screen.getByTestId("location")).toHaveTextContent(
      "/transactions/new",
    );
    expect(screen.getByTestId("location")).not.toHaveTextContent("openCreate");
  });
});
