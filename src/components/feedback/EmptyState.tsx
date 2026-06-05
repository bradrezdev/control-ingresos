/**
 * EmptyState — control-ingresos
 *
 * Used when a list has no data. Includes an icon, title, description, and
 * an optional CTA. Pattern: emoji-free, Lucide icons only.
 */
import type { ReactNode } from "react";
import { Inbox } from "lucide-react";
import { cn } from "@/lib/cn";

export interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: EmptyStateProps): React.JSX.Element {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center text-center",
        "py-12 px-6",
        "rounded-[var(--radius-lg)]",
        "border border-dashed border-[var(--color-border-subtle)]",
        className,
      )}
    >
      <div
        className="size-12 rounded-full bg-[var(--color-surface-inset)] flex items-center justify-center text-[var(--color-text-muted)] mb-4"
        aria-hidden
      >
        {icon ?? <Inbox className="size-5" />}
      </div>
      <h3 className="text-base font-semibold text-[var(--color-text-primary)]">
        {title}
      </h3>
      {description ? (
        <p className="mt-1 text-sm text-[var(--color-text-muted)] max-w-sm">
          {description}
        </p>
      ) : null}
      {action ? <div className="mt-6">{action}</div> : null}
    </div>
  );
}
