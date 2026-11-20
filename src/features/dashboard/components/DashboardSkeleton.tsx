import { Skeleton } from "@/components/ui/Skeleton";

export function DashboardSkeleton(): React.JSX.Element {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <Skeleton className="h-4 w-40" rounded="sm" />
          <Skeleton className="mt-1 h-7 w-32" rounded="sm" />
        </div>
        <Skeleton className="size-11 rounded-full" />
      </div>

      <Skeleton className="h-10 w-full rounded-pill" />

      <Skeleton className="h-64 w-full rounded-hero" />

      <Skeleton className="h-48 w-full rounded-lg" />
      <Skeleton className="h-64 w-full rounded-lg" />
      <Skeleton className="h-56 w-full rounded-lg" />
      <Skeleton className="h-64 w-full rounded-lg" />
    </div>
  );
}
