import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { ErrorBoundary } from "./ErrorBoundary";

function Boom(): React.JSX.Element {
  throw new Error("Test explosion");
}

describe("ErrorBoundary", () => {
  // Silence React's expected error log during render-time throws.
  const originalError = console.error;

  it("renders children when no error", () => {
    const { container } = render(
      <ErrorBoundary>
        <p>Safe content</p>
      </ErrorBoundary>,
    );
    expect(screen.getByText("Safe content")).toBeInTheDocument();
    expect(container).toBeTruthy();
  });

  it("renders fallback UI when child throws", () => {
    // Silence expected React error log.
    console.error = () => {};
    render(
      <ErrorBoundary>
        <Boom />
      </ErrorBoundary>,
    );
    expect(screen.getByText("Algo salió mal")).toBeInTheDocument();
    expect(screen.getByText(/Reintentar/)).toBeInTheDocument();
    console.error = originalError;
  });

  it("renders custom fallback when provided", () => {
    console.error = () => {};
    render(
      <ErrorBoundary fallback={<p>Custom fallback</p>}>
        <Boom />
      </ErrorBoundary>,
    );
    expect(screen.getByText("Custom fallback")).toBeInTheDocument();
    console.error = originalError;
  });
});
