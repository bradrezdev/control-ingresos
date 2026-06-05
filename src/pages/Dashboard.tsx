/**
 * Dashboard — control-ingresos
 *
 * F5.5 — Bento Grid layout. Desktop 2 columns, mobile 1 column.
 * Widgets are lazy-loaded via React.lazy + Suspense to keep the
 * initial bundle small (Chart.js / Motion only fetched on first
 * dashboard visit).
 */
import { lazy, Suspense } from "react";
import { PageContainer } from "@/components/layout/PageContainer";
import { Skeleton } from "@/components/ui/Skeleton";

const SmartShopper = lazy(() =>
  import("@/features/widgets/SmartShopper").then((m) => ({ default: m.SmartShopper })),
);
const PaymentCalendar = lazy(() =>
  import("@/features/widgets/PaymentCalendar").then((m) => ({ default: m.PaymentCalendar })),
);
const BudgetControl = lazy(() =>
  import("@/features/widgets/BudgetControl").then((m) => ({ default: m.BudgetControl })),
);
const MsiSummary = lazy(() =>
  import("@/features/widgets/MsiSummary").then((m) => ({ default: m.MsiSummary })),
);

export function Dashboard(): React.JSX.Element {
  return (
    <PageContainer
      title="Dashboard"
      description="Resumen financiero del mes en curso."
    >
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-5 auto-rows-fr">
        <Suspense fallback={<WidgetSkeleton />}>
          <SmartShopper />
        </Suspense>
        <Suspense fallback={<WidgetSkeleton />}>
          <PaymentCalendar />
        </Suspense>
        <Suspense fallback={<WidgetSkeleton />}>
          <BudgetControl />
        </Suspense>
        <Suspense fallback={<WidgetSkeleton />}>
          <MsiSummary />
        </Suspense>
      </div>
    </PageContainer>
  );
}

function WidgetSkeleton(): React.JSX.Element {
  return (
    <div className="glass p-6 h-72">
      <Skeleton className="h-4 w-40" rounded="sm" />
      <div className="mt-4 space-y-3">
        <Skeleton className="h-6 w-3/4" rounded="sm" />
        <Skeleton className="h-4 w-1/2" rounded="sm" />
        <Skeleton className="h-24 w-full" rounded="md" />
      </div>
    </div>
  );
}
