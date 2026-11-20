import { Skeleton } from "@/components/ui/Skeleton";

export function TransactionSkeleton(): React.JSX.Element {
  return (
    <div className="flex flex-col gap-4" role="status" aria-label="Cargando movimientos">
      {[0, 1, 2].map((dayIndex) => (
        <div key={dayIndex} className="flex flex-col gap-2">
          <div className="flex items-center justify-between min-h-12 pt-2">
            <Skeleton className="h-5 w-32 rounded-md" />
            <Skeleton className="h-4 w-20 rounded-md" />
          </div>
          {[0, 1].map((rowIndex) => (
            <div key={rowIndex} className="flex items-center gap-3 py-3 border-t border-border-subtle">
              <Skeleton rounded="full" className="size-10" />
              <div className="flex-1 flex flex-col gap-1.5">
                <Skeleton className="h-4 w-3/5 rounded-md" />
                <Skeleton className="h-3 w-2/5 rounded-md" />
              </div>
              <div className="flex flex-col items-end gap-1">
                <Skeleton className="h-4 w-16 rounded-md" />
                <Skeleton className="h-3 w-10 rounded-md" />
              </div>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
