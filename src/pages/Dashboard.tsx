/**
 * Dashboard — control-ingresos
 *
 * F5.5 — Bento Grid layout. Desktop 2 columns, mobile 1 column.
 * Widgets are lazy-loaded via React.lazy + Suspense to keep the
 * initial bundle small (Chart.js / Motion only fetched on first
 * dashboard visit).
 */
import { lazy, Suspense, useMemo } from "react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { PageContainer } from "@/components/layout/PageContainer";
import { ScreenHeader, SettingsButton } from "@/components/ui/design";
import { Skeleton } from "@/components/ui/Skeleton";

const BudgetCard = lazy(() =>
  import("@/features/widgets/BudgetCard").then((m) => ({ default: m.BudgetCard })),
);
const FixedPaymentsWidget = lazy(() =>
  import("@/features/widgets/FixedPaymentsWidget").then((m) => ({
    default: m.FixedPaymentsWidget,
  })),
);
const MsiSummary = lazy(() =>
  import("@/features/widgets/MsiSummary").then((m) => ({ default: m.MsiSummary })),
);

export function Dashboard(): React.JSX.Element {
  const eyebrow = useMemo(
    () =>
      format(new Date(), "EEEE d 'de' MMMM", { locale: es }).replace(
        /^\w/,
        (c) => c.toUpperCase(),
      ),
    [],
  );

  return (
    <PageContainer bare>
      <div className="flex flex-col gap-4">
        <ScreenHeader
          title="Inicio"
          eyebrow={eyebrow}
          right={<SettingsButton />}
        />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-5 auto-rows-fr">
          <Suspense fallback={<WidgetSkeleton />}>
            <BudgetCard monthOffset={0} />
          </Suspense>
          <Suspense fallback={<WidgetSkeleton />}>
            <BudgetCard monthOffset={1} />
          </Suspense>
          <Suspense fallback={<WidgetSkeleton />}>
            <FixedPaymentsWidget />
          </Suspense>
          <Suspense fallback={<WidgetSkeleton />}>
            <MsiSummary />
          </Suspense>
        </div>
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
