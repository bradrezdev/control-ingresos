import type { ReactNode } from "react";

interface PageContainerProps {
  title: string;
  description?: string;
  actions?: ReactNode;
  /**
   * When `true`, the inner `glass` wrapper is omitted and children render
   * directly inside the outer container. Used by pages whose children are
   * already their own surface (e.g. Dashboard, where each widget is a
   * `GlassCard` and the wrapper would create a double-glass).
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
  return (
    <div className="p-6 md:p-8 max-w-6xl mx-auto w-full">
      <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-[var(--color-text-primary)]">
            {title}
          </h1>
          {description ? (
            <p className="mt-1 text-sm text-[var(--color-text-muted)]">
              {description}
            </p>
          ) : null}
        </div>
        {actions ? <div className="flex items-center gap-2">{actions}</div> : null}
      </header>

      {bare ? children : <div className="glass p-6 md:p-8">{children}</div>}
    </div>
  );
}
