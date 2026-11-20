import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/cn";

export interface PaperCardProps extends HTMLAttributes<HTMLElement> {
  as?: "section" | "article" | "div";
  children?: ReactNode;
}

/**
 * White surface card used throughout the redesign.
 *
 * Equivalent to the prototype's `.c` primitive: 24px radius, paper background.
 */
export function PaperCard({
  as: Component = "section",
  className,
  children,
  ...props
}: PaperCardProps): React.JSX.Element {
  return (
    <Component
      className={cn("bg-surface rounded-lg", className)}
      {...props}
    >
      {children}
    </Component>
  );
}
