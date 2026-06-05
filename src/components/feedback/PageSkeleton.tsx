/**
 * PageSkeleton — control-ingresos
 *
 * Full-page skeleton with fixed dimensions to prevent CLS. Used by
 * pages while their data is still loading from Dexie.
 */
import { Skeleton } from "@/components/ui/Skeleton";

export interface PageSkeletonProps {
  /** Number of placeholder lines in the body (default 4). */
  lines?: number;
}

export function PageSkeleton({ lines = 4 }: PageSkeletonProps): React.JSX.Element {
  return (
    <div
      className="p-6 md:p-8 max-w-6xl mx-auto w-full"
      role="status"
      aria-label="Cargando contenido"
    >
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div className="flex-1">
          <Skeleton className="h-9 w-48" rounded="sm" />
          <Skeleton className="mt-2 h-4 w-72" />
        </div>
        <Skeleton className="h-11 w-32" rounded="md" />
      </div>
      <div className="glass p-6 md:p-8 space-y-4">
        {Array.from({ length: lines }).map((_, i) => (
          <Skeleton
            key={i}
            className="h-4"
            rounded="sm"
            style={{ width: `${85 - i * 7}%` }}
          />
        ))}
      </div>
    </div>
  );
}
