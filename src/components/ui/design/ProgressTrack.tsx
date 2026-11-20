import type { HTMLAttributes } from "react";
import { cn } from "@/lib/cn";

export interface ProgressTrackMarker {
  label: string;
  position: number;
}

export interface ProgressTrackProps extends HTMLAttributes<HTMLDivElement> {
  /** Fill percentage (0–100). */
  fill: number;
  /** Optional marker rendered at a percentage position. */
  marker?: ProgressTrackMarker;
  /** Track background variant. */
  variant?: "default" | "hero";
  /** Fill color tone for data-driven bars (default variant only). */
  tone?: "primary" | "warning" | "danger";
}

function clamp(value: number): number {
  return Math.max(0, Math.min(100, value));
}

/**
 * Progress bar with an optional marker (e.g. "Hoy").
 *
 * Equivalent to the prototype's `.trk` primitive: rounded track, white fill,
 * and a vertical marker with a label.
 */
export function ProgressTrack({
  fill,
  marker,
  variant = "default",
  tone = "primary",
  className,
  ...props
}: ProgressTrackProps): React.JSX.Element {
  const clampedFill = clamp(fill);

  const fillClass =
    variant === "hero"
      ? "bg-hero-text"
      : tone === "warning"
        ? "bg-warning"
        : tone === "danger"
          ? "bg-danger"
          : "bg-primary";

  return (
    <div
      role="progressbar"
      aria-valuenow={clampedFill}
      aria-valuemin={0}
      aria-valuemax={100}
      className={cn(
        "relative h-3 w-full rounded-full overflow-hidden",
        variant === "hero" ? "bg-hero-text/20" : "bg-segment",
        className,
      )}
      {...props}
    >
      <span
        className={cn(
          "absolute left-0 top-0 bottom-0 rounded-full transition-all duration-base ease-out-soft",
          fillClass,
        )}
        style={{ width: `${clampedFill}%` }}
      />
      {marker ? (
        <div
          className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 flex flex-col items-center"
          style={{ left: `${clamp(marker.position)}%` }}
        >
          <span className="text-[11px] font-semibold text-marker mb-0.5">{marker.label}</span>
          <span className="h-6 w-1 rounded-full bg-marker" />
        </div>
      ) : null}
    </div>
  );
}
