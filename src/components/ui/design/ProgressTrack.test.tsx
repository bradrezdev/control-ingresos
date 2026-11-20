import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ProgressTrack } from "./ProgressTrack";

describe("ProgressTrack", () => {
  it("renders a track and a fill", () => {
    render(<ProgressTrack fill={45} />);
    const fill = screen.getByRole("progressbar").querySelector("span");
    expect(fill).toHaveStyle("width: 45%");
  });

  it("clamps fill between 0 and 100", () => {
    const { rerender } = render(<ProgressTrack fill={120} />);
    expect(screen.getByRole("progressbar").querySelector("span")).toHaveStyle("width: 100%");

    rerender(<ProgressTrack fill={-10} />);
    expect(screen.getByRole("progressbar").querySelector("span")).toHaveStyle("width: 0%");
  });

  it("renders the 'Hoy' marker when provided", () => {
    render(<ProgressTrack fill={30} marker={{ label: "Hoy", position: 60 }} />);
    expect(screen.getByText("Hoy")).toBeInTheDocument();
  });

  it("positions the marker with the correct left offset", () => {
    render(<ProgressTrack fill={30} marker={{ label: "Hoy", position: 60 }} />);
    const marker = screen.getByText("Hoy").parentElement;
    expect(marker).toHaveStyle("left: 60%");
  });

  it("exposes aria-valuenow", () => {
    render(<ProgressTrack fill={75} />);
    expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "75");
  });

  it("uses a muted track when not inside a hero", () => {
    const { container } = render(<ProgressTrack fill={50} />);
    expect(container.firstChild).toHaveClass("bg-segment");
  });

  it("can render on a hero surface", () => {
    const { container } = render(<ProgressTrack fill={50} variant="hero" />);
    expect(container.firstChild).toHaveClass("bg-hero-text/20");
  });

  it("renders the marker with the marker token color", () => {
    render(<ProgressTrack fill={30} marker={{ label: "Hoy", position: 60 }} />);
    const marker = screen.getByText("Hoy").parentElement;
    expect(marker?.lastElementChild).toHaveClass("bg-marker");
  });

  it("colors the fill with the warning token when tone is warning", () => {
    render(<ProgressTrack fill={70} tone="warning" />);
    const fill = screen.getByRole("progressbar").querySelector("span");
    expect(fill).toHaveClass("bg-warning");
  });

  it("colors the fill with the danger token when tone is danger", () => {
    render(<ProgressTrack fill={95} tone="danger" />);
    const fill = screen.getByRole("progressbar").querySelector("span");
    expect(fill).toHaveClass("bg-danger");
  });

  it("defaults the fill to the primary token", () => {
    render(<ProgressTrack fill={30} />);
    const fill = screen.getByRole("progressbar").querySelector("span");
    expect(fill).toHaveClass("bg-primary");
  });

  it("keeps the hero fill white regardless of tone", () => {
    render(<ProgressTrack fill={30} variant="hero" tone="danger" />);
    const fill = screen.getByRole("progressbar").querySelector("span");
    expect(fill).toHaveClass("bg-hero-text");
  });
});
