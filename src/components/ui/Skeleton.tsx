/**
 * Skeleton — control-ingresos
 *
 * Loading placeholder with a subtle pulse. Fixed dimensions are critical
 * to avoid CLS when the actual content arrives.
 */
import type { HTMLAttributes } from "react";
import { cn } from "@/lib/cn";

export interface SkeletonProps extends HTMLAttributes<HTMLDivElement> {
  rounded?: "sm" | "md" | "lg" | "full";
}

const roundedMap = {
  sm: "rounded-[var(--radius-sm)]",
  md: "rounded-[var(--radius-md)]",
  lg: "rounded-[var(--radius-lg)]",
  full: "rounded-full",
} as const;

export function Skeleton({
  className,
  rounded = "md",
  ...props
}: SkeletonProps): React.JSX.Element {
  return (
    <div
      aria-hidden
      className={cn(
        "bg-[var(--color-surface-inset)]",
        "animate-pulse",
        roundedMap[rounded],
        className,
      )}
      {...props}
    />
  );
}
