import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

interface PageContainerProps {
  title: string;
  description?: string;
  actions?: ReactNode;
  children: ReactNode;
}

export function PageContainer({
  title,
  description,
  actions,
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

      <div className={cn("glass p-6 md:p-8")}>{children}</div>
    </div>
  );
}
