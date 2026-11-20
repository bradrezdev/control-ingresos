/**
 * FixedPaymentsSkeleton — control-ingresos (redesign-ui-2026, T6)
 *
 * Loading placeholder mirroring the screen layout: month selector, hero
 * total and two group cards. Fixed dimensions avoid layout shift when
 * the data arrives.
 */
import { Skeleton } from "@/components/ui/Skeleton";

export function FixedPaymentsSkeleton(): React.JSX.Element {
  return (
    <div
      role="status"
      aria-label="Cargando pagos fijos"
      className="flex flex-col gap-4"
    >
      <Skeleton className="h-10 w-full rounded-pill" />
      <Skeleton className="h-40 w-full rounded-hero" />
      <Skeleton className="h-64 w-full rounded-lg" />
      <Skeleton className="h-48 w-full rounded-lg" />
    </div>
  );
}
