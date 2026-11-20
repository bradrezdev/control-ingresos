import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/cn";

export interface HeroCardProps extends HTMLAttributes<HTMLElement> {
  as?: "section" | "div";
  children?: ReactNode;
}

/**
 * Primary blue hero surface used for key metrics.
 *
 * Equivalent to the prototype's `.hero` primitive: primary blue background,
 * white text, 28px radius.
 */
export function HeroCard({
  as: Component = "section",
  className,
  children,
  ...props
}: HeroCardProps): React.JSX.Element {
  return (
    <Component
      className={cn(
        "bg-hero text-hero-text rounded-hero overflow-hidden",
        className,
      )}
      {...props}
    >
      {children}
    </Component>
  );
}
