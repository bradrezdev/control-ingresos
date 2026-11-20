import type { CSSProperties, HTMLAttributes } from "react";
import { cn } from "@/lib/cn";

export interface StackBarSegment {
  value: number;
  /** Tailwind color class (e.g. "bg-primary") or an inline `style` background. */
  color?: string;
  style?: CSSProperties;
}

export interface StackBarProps extends HTMLAttributes<HTMLDivElement> {
  segments: StackBarSegment[];
}

/**
 * Horizontally stacked progress bar.
 *
 * Equivalent to the prototype's `.stk` primitive: 10px tall, rounded,
 * segmented with a small gap, each segment sized by value.
 */
export function StackBar({
  segments,
  className,
  ...props
}: StackBarProps): React.JSX.Element {
  const total = segments.reduce((sum, segment) => sum + segment.value, 0);

  if (total === 0) {
    return <div className={cn("h-2.5 rounded-full bg-segment", className)} {...props} />;
  }

  return (
    <div
      className={cn("flex h-2.5 gap-1 rounded-full overflow-hidden", className)}
      {...props}
    >
      {segments.map((segment, index) => (
        <div
          key={index}
          data-stack-segment
          className={cn(
            "h-full rounded-full transition-all duration-base ease-out-soft",
            segment.color,
          )}
          style={{
            width: `${(segment.value / total) * 100}%`,
            ...segment.style,
          }}
        />
      ))}
    </div>
  );
}
