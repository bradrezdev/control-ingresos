import type { ButtonHTMLAttributes, HTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/cn";

type ListRowBaseProps = {
  title: string;
  subtitle?: string;
  leading?: ReactNode;
  trailing?: ReactNode;
};

export interface ListRowButtonProps
  extends ListRowBaseProps,
    Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children" | "title"> {
  onClick: () => void;
}

export interface ListRowDivProps
  extends ListRowBaseProps,
    Omit<HTMLAttributes<HTMLDivElement>, "children" | "title"> {
  onClick?: undefined;
}

export type ListRowProps = ListRowButtonProps | ListRowDivProps;

/**
 * List row with optional leading avatar/icon, title, subtitle and trailing
 * amount or badge.
 *
 * Equivalent to the prototype's `.li` primitive: flex row, 64px minimum
 * height, top separator, gutter between media and text.
 */
export function ListRow(props: ListRowProps): React.JSX.Element {
  const { title, subtitle, leading, trailing, className, ...rest } = props;

  const classes = cn(
    "flex items-center gap-3 min-h-16 py-3",
    "border-t border-border-subtle",
    rest.onClick !== undefined
      ? "w-full text-left hover:bg-day transition-colors duration-fast ease-out-soft"
      : "",
    className,
  );

  const content = (
    <>
      {leading ? (
        <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-surface-inset text-primary">
          {leading}
        </div>
      ) : null}
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="truncate text-body font-semibold text-ink">{title}</span>
        {subtitle ? (
          <span className="truncate text-aux text-muted">{subtitle}</span>
        ) : null}
      </div>
      {trailing ? <div className="shrink-0 text-right">{trailing}</div> : null}
    </>
  );

  if (rest.onClick !== undefined) {
    return (
      <button type="button" className={classes} {...rest}>
        {content}
      </button>
    );
  }

  return (
    <div className={classes} {...(rest as ListRowDivProps)}>
      {content}
    </div>
  );
}
