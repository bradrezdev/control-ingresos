import type { HTMLAttributes } from "react";
import { cn } from "@/lib/cn";
import { Amount } from "./Amount";

export interface TermBarProps extends HTMLAttributes<HTMLDivElement> {
  label: string;
  percent: number;
  amountCents: number;
}

function clamp(value: number): number {
  return Math.max(0, Math.min(100, value));
}

/**
 * Labeled term bar with a percentage and monetary amount.
 *
 * Equivalent to the prototype's `.ms` primitive: a muted label, a segment
 * track with a primary fill, and a right-aligned amount.
 */
export function TermBar({
  label,
  percent,
  amountCents,
  className,
  ...props
}: TermBarProps): React.JSX.Element {
  const clamped = clamp(percent);

  return (
    <div
      className={cn("flex h-9 items-center gap-2.5 text-sm", className)}
      {...props}
    >
      <span className="w-[62px] shrink-0 text-muted">{label}</span>
      <div className="relative h-2 flex-1 rounded-full bg-segment overflow-hidden">
        <span
          data-term-fill
          className="absolute left-0 top-0 bottom-0 rounded-full bg-primary transition-all duration-base ease-out-soft"
          style={{ width: `${clamped}%` }}
        />
      </div>
      <div className="w-[86px] shrink-0 text-right">
        <span className="mr-2 text-muted">{clamped}%</span>
        <Amount cents={amountCents} className="text-ink font-semibold" />
      </div>
    </div>
  );
}
