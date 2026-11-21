import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/cn";

export const STATUS_TONE = {
  ok: "ok",
  warn: "warn",
  neutral: "neutral",
  info: "info",
} as const;

type StatusTone = (typeof STATUS_TONE)[keyof typeof STATUS_TONE];

export interface StatusPillProps extends HTMLAttributes<HTMLSpanElement> {
  tone: StatusTone;
  children: ReactNode;
}

const toneClasses: Record<StatusTone, string> = {
  ok: "bg-positive-bg text-positive",
  warn: "bg-warning-bg text-warning",
  neutral: "bg-neutral-bg text-text-secondary",
  info: "bg-cyan-bg text-cyan",
};

/**
 * Compact status pill.
 *
 * Equivalent to the prototype's `.k.ok`, `.k.wn`, `.k.gr` primitives:
 * 28px tall, fully rounded, semantic background/text pair.
 */
export function StatusPill({
  tone,
  children,
  className,
  ...props
}: StatusPillProps): React.JSX.Element {
  return (
    <span
      className={cn(
        "inline-flex h-7 items-center gap-1 whitespace-nowrap rounded-pill px-2.5",
        "text-xs font-semibold",
        toneClasses[tone],
        className,
      )}
      {...props}
    >
      {children}
    </span>
  );
}
