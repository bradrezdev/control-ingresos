import type { ReactNode } from "react";

interface PageContainerProps {
  title?: string;
  description?: string;
  actions?: ReactNode;
  /**
   * When `true`, the header is omitted and children render directly.
   * Pages that draw their own header (e.g. Dashboard, Settings) use this.
   */
  bare?: boolean;
  children: ReactNode;
}

export function PageContainer({
  title,
  description,
  actions,
  bare = false,
  children,
}: PageContainerProps): React.JSX.Element {
  if (bare) {
    return <>{children}</>;
  }

  return (
    <>
      <header className="mb-5 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-display font-extrabold text-primary">{title}</h1>
          {description ? (
            <p className="text-aux text-muted mt-0.5">{description}</p>
          ) : null}
        </div>
        {actions ? (
          <div className="flex shrink-0 items-center gap-2">{actions}</div>
        ) : null}
      </header>
      <div className="flex flex-col gap-4">{children}</div>
    </>
  );
}
