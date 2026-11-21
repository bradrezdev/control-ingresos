import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/cn";

export interface SectionHeadingProps extends HTMLAttributes<HTMLDivElement> {
  title: string;
  level?: 2 | 3 | 4 | 5 | 6;
  action?: ReactNode;
}

/**
 * Section title with an optional right-hand action.
 *
 * Equivalent to the prototype's `.r.b` + `.h` primitives: 17px bold text in
 * the primary color, aligned with the action on the far right.
 */
export function SectionHeading({
  title,
  level = 2,
  action,
  className,
  ...props
}: SectionHeadingProps): React.JSX.Element {
  const Heading = `h${level}` as const;

  return (
    <div
      className={cn("flex items-center justify-between gap-3", className)}
      {...props}
    >
      <Heading className="text-title font-bold leading-tight tracking-tight text-primary">
        {title}
      </Heading>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}
