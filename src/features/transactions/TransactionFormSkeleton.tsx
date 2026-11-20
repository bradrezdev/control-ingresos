import { Skeleton } from "@/components/ui/Skeleton";

/**
 * Loading skeleton for the entry form (S18: every view exposes a
 * loading state). Mirrors the form silhouette: segmented type control,
 * big amount figure and the fields card.
 */
export function TransactionFormSkeleton(): React.JSX.Element {
  return (
    <div
      className="flex flex-col gap-3.5 pt-4"
      role="status"
      aria-label="Cargando formulario"
    >
      <Skeleton className="h-11 rounded-pill" />
      <div className="flex flex-col gap-2">
        <Skeleton className="h-3.5 w-14" />
        <Skeleton className="h-11 w-2/5" />
        <Skeleton className="h-3.5 w-56" />
      </div>
      <Skeleton className="h-80 rounded-lg" />
      <Skeleton className="h-[52px] rounded-full" />
    </div>
  );
}
