/**
 * GlassCard — control-ingresos
 *
 * A Card variant that defaults to the glass surface and adds a subtle
 * hover lift. Used as the primary surface for dashboard widgets.
 */
import type { CardProps } from "./Card";
import { Card } from "./Card";
import { cn } from "@/lib/cn";

export interface GlassCardProps extends Omit<CardProps, "variant"> {
  interactive?: boolean;
}

export function GlassCard({
  className,
  interactive = false,
  ...props
}: GlassCardProps): React.JSX.Element {
  return (
    <Card
      variant="default"
      className={cn(
        "transition-all duration-[var(--duration-base)] ease-[var(--ease-out-soft)]",
        interactive &&
          "hover:shadow-[var(--shadow-card-hover)] hover:-translate-y-0.5",
        className,
      )}
      {...props}
    />
  );
}
