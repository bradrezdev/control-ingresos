/**
 * CardsSkeleton — control-ingresos (redesign-ui-2026, T5)
 *
 * Loading placeholder mirroring the screen layout: hero block, then two
 * card tiles. Fixed dimensions avoid layout shift when data arrives.
 */
import { Skeleton } from "@/components/ui/Skeleton";

export function CardsSkeleton(): React.JSX.Element {
  return (
    <div role="status" aria-label="Cargando tarjetas" className="flex flex-col gap-4">
      <Skeleton className="h-44 w-full rounded-hero" />
      <Skeleton className="aspect-[1.586/1] w-full rounded-lg" />
      <Skeleton className="aspect-[1.586/1] w-full rounded-lg" />
    </div>
  );
}
