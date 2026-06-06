/**
 * FixedPaymentsWidget — control-ingresos
 *
 * Dashboard widget that shows the fixed payments due this month and
 * their total. Uses the same `isFixedPaymentDueThisMonth` logic as
 * the engine so the widget and `computeFixedPaymentsForMonth` always
 * agree.
 *
 * States:
 *   - loading: any live query still resolving → WidgetSkeleton.
 *   - empty (none configured): EmptyState with CTA to /fixed-payments.
 *   - empty (none due this month): EmptyState explaining that
 *     configured payments which don't fall this month are hidden.
 *   - populated: vertical list (description | amount) + footer total,
 *     plus a small line if there are configured-but-not-due payments.
 */
import { useMemo } from "react";
import { CalendarDays, CheckCircle2 } from "lucide-react";
import { NavLink } from "react-router";
import { GlassCard } from "@/components/ui/GlassCard";
import { Skeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/feedback/EmptyState";
import { Button } from "@/components/ui/Button";
import { useLiveFixedPayments } from "@/hooks/useLiveFixedPayments";
import { useLiveSettings } from "@/hooks/useLiveSettings";
import { isFixedPaymentDueThisMonth } from "@/engine/fixedPayments";
import { formatCurrency } from "@/lib/money/format";

export function FixedPaymentsWidget(): React.JSX.Element {
  // RULES OF HOOKS: every hook must be called unconditionally at the top of
  // the component, BEFORE any early return. The order and count of hooks must
  // be identical across renders. Adding a hook after an early return will
  // throw "Rendered more hooks than during the previous render" once the
  // first render hits the early return and the second one does not.
  const fixedPayments = useLiveFixedPayments();
  const settings = useLiveSettings();
  const today = useMemo(() => new Date(), []);

  if (fixedPayments === undefined || settings === undefined) {
    return <WidgetSkeleton />;
  }

  const list = fixedPayments ?? [];
  const due = list.filter((fp) => isFixedPaymentDueThisMonth(fp, today));
  const totalCents = due.reduce((sum, fp) => sum + fp.amount, 0);
  const notDueCount = list.length - due.length;
  const currency = settings.currency;

  if (list.length === 0) {
    return (
      <GlassCard className="p-6 h-full flex flex-col">
        <h2 className="text-base font-semibold tracking-tight text-[var(--color-text-primary)]">
          Pagos fijos del mes
        </h2>
        <div className="flex-1 flex items-center justify-center">
          <EmptyState
            icon={<CalendarDays className="size-5" aria-hidden />}
            title="No tenés pagos fijos configurados"
            description="Configurá tus pagos recurrentes para verlos reflejados en tu presupuesto."
            action={
              <NavLink to="/fixed-payments">
                <Button variant="primary" size="sm">
                  Ir a Pagos fijos
                </Button>
              </NavLink>
            }
          />
        </div>
      </GlassCard>
    );
  }

  if (due.length === 0) {
    return (
      <GlassCard className="p-6 h-full flex flex-col">
        <h2 className="text-base font-semibold tracking-tight text-[var(--color-text-primary)]">
          Pagos fijos del mes
        </h2>
        <div className="flex-1 flex items-center justify-center">
          <EmptyState
            icon={<CheckCircle2 className="size-5" aria-hidden />}
            title="No tenés pagos fijos este mes"
            description="Los pagos configurados pero que no caen este mes no se muestran acá."
          />
        </div>
      </GlassCard>
    );
  }

  return (
    <GlassCard className="p-6 h-full flex flex-col">
      <h2 className="text-base font-semibold tracking-tight text-[var(--color-text-primary)]">
        Pagos fijos del mes
      </h2>

      <ul className="mt-4 flex-1 space-y-2">
        {due.map((fp) => (
          <li
            key={fp.id}
            className="flex items-center justify-between gap-3 py-1.5 border-b border-[var(--color-border-subtle)]/50 last:border-0"
          >
            <span className="text-sm text-[var(--color-text-body)] truncate">
              {fp.description}
            </span>
            <span className="text-sm font-semibold tabular-nums text-[var(--color-text-body)] shrink-0">
              {formatCurrency(fp.amount, currency)}
            </span>
          </li>
        ))}
      </ul>

      {notDueCount > 0 ? (
        <NavLink
          to="/fixed-payments"
          className="mt-3 text-xs text-[var(--color-text-muted)] hover:text-[var(--color-text-body)] transition-colors"
        >
          +{notDueCount} más configurados para otros meses
        </NavLink>
      ) : null}

      <div className="mt-auto pt-4 border-t border-[var(--color-border-subtle)] flex items-center justify-between">
        <span className="text-xs uppercase tracking-wide text-[var(--color-text-muted)] font-semibold">
          Total del mes
        </span>
        <span className="text-2xl font-semibold tabular-nums text-[var(--color-text-primary)]">
          {formatCurrency(totalCents, currency)}
        </span>
      </div>
    </GlassCard>
  );
}

function WidgetSkeleton(): React.JSX.Element {
  return (
    <GlassCard className="p-6 h-full">
      <Skeleton className="h-4 w-40" rounded="sm" />
      <div className="mt-4 space-y-2">
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="h-6 w-full" rounded="sm" />
        ))}
      </div>
    </GlassCard>
  );
}
