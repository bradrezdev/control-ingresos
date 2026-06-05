/**
 * Card — control-ingresos
 *
 * A composable surface primitive. Uses the 24px ONANO radius and Apple
 * shadow system. Subcomponents (Header, Body, Footer) are exposed for
 * structured content; bare `<Card>` also works for simple cases.
 *
 * Variants:
 *   - default: glass surface (translucent, backdrop-blur)
 *   - elevated: opaque white with Apple-spec shadow
 *   - flat: opaque white with subtle border only (no shadow)
 */
import { cva, type VariantProps } from "class-variance-authority";
import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/cn";

const cardVariants = cva("rounded-[var(--radius-lg)]", {
  variants: {
    variant: {
      default: "glass",
      elevated:
        "bg-[var(--color-surface)] shadow-[var(--shadow-card)] border border-[var(--color-border-subtle)]",
      flat: "bg-[var(--color-surface)] border border-[var(--color-border-subtle)]",
    },
    padding: {
      none: "",
      sm: "p-4",
      md: "p-6",
      lg: "p-8",
    },
  },
  defaultVariants: {
    variant: "default",
    padding: "md",
  },
});

export interface CardProps
  extends HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof cardVariants> {
  as?: "div" | "section" | "article";
  children?: ReactNode;
}

export function Card({
  className,
  variant,
  padding,
  as: Component = "div",
  children,
  ...props
}: CardProps): React.JSX.Element {
  return (
    <Component
      className={cn(cardVariants({ variant, padding }), className)}
      {...props}
    >
      {children}
    </Component>
  );
}

function CardHeader({
  className,
  children,
  ...props
}: HTMLAttributes<HTMLDivElement>): React.JSX.Element {
  return (
    <div
      className={cn(
        "flex flex-col gap-1 pb-4 mb-4 border-b border-[var(--color-border-subtle)]",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}

function CardTitle({
  className,
  children,
  ...props
}: HTMLAttributes<HTMLHeadingElement>): React.JSX.Element {
  return (
    <h3
      className={cn(
        "text-lg font-semibold tracking-tight text-[var(--color-text-primary)]",
        className,
      )}
      {...props}
    >
      {children}
    </h3>
  );
}

function CardDescription({
  className,
  children,
  ...props
}: HTMLAttributes<HTMLParagraphElement>): React.JSX.Element {
  return (
    <p
      className={cn("text-sm text-[var(--color-text-muted)]", className)}
      {...props}
    >
      {children}
    </p>
  );
}

function CardBody({
  className,
  children,
  ...props
}: HTMLAttributes<HTMLDivElement>): React.JSX.Element {
  return (
    <div className={cn("text-sm text-[var(--color-text-body)]", className)} {...props}>
      {children}
    </div>
  );
}

function CardFooter({
  className,
  children,
  ...props
}: HTMLAttributes<HTMLDivElement>): React.JSX.Element {
  return (
    <div
      className={cn(
        "flex items-center justify-end gap-2 pt-4 mt-4 border-t border-[var(--color-border-subtle)]",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}

Card.Header = CardHeader;
Card.Title = CardTitle;
Card.Description = CardDescription;
Card.Body = CardBody;
Card.Footer = CardFooter;
