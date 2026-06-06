/**
 * SmartShopper — control-ingresos
 *
 * F6.1 — Dashboard widget that tells the user the best card to use
 * right now, plus an alert if another card is about to cut.
 *
 * Data:
 *   - useLiveCards → list of cards
 *   - computeBestCardToUseToday(cards, today) → best card + rationale
 *   - findUpcomingConvenientCut(cards, today, 2) → imminent-cut alert
 *
 * UI:
 *   - GlassCard with title
 *   - Best card: large bank name, plus the days you have to pay
 *   - Alert banner if another card cuts in ≤2 days
 *   - EmptyState if no cards
 */
import { useMemo } from "react";
import { AlertTriangle, CreditCard } from "lucide-react";
import { GlassCard } from "@/components/ui/GlassCard";
import { Skeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/feedback/EmptyState";
import { Button } from "@/components/ui/Button";
import { NavLink } from "react-router";
import { motion, AnimatePresence } from "motion/react";
import { useLiveCards } from "@/hooks/useLiveCards";
import {
  computeBestCardToUseToday,
  findUpcomingConvenientCut,
} from "@/engine/cycle";

export function SmartShopper(): React.JSX.Element {
  const cards = useLiveCards();
  const today = useMemo(() => new Date(), []);

  if (cards === undefined) {
    return <WidgetSkeleton />;
  }

  if (cards.length === 0) {
    return (
      <GlassCard className="p-6 h-full flex flex-col">
        <WidgetHeader title="Mejor momento para comprar" />
        <div className="flex-1 flex items-center justify-center">
          <EmptyState
            icon={<CreditCard className="size-5" aria-hidden />}
            title="Sin tarjetas"
            description="Cargá tus tarjetas para ver recomendaciones inteligentes."
            action={
              <NavLink to="/cards">
                <Button variant="primary" size="sm">
                  Ir a Tarjetas
                </Button>
              </NavLink>
            }
          />
        </div>
      </GlassCard>
    );
  }

  const best = computeBestCardToUseToday(cards, today);
  const alert = findUpcomingConvenientCut(cards, today, 2);

  if (!best) {
    return (
      <GlassCard className="p-6 h-full">
        <WidgetHeader title="Mejor momento para comprar" />
        <p className="text-sm text-[var(--color-text-muted)]">
          No se pudo determinar la mejor tarjeta.
        </p>
      </GlassCard>
    );
  }

  const { card, cycleLengthDays, rationale } = best;
  const alertIsForBest =
    alert !== null && alert.card.id === best.card.id;
  const showAlert = alert !== null && !alertIsForBest;

  return (
    <GlassCard className="p-6 h-full flex flex-col">
      <WidgetHeader title="Mejor momento para comprar" />

      <AnimatePresence mode="wait">
        <motion.div
          key={card.id}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
          className="mt-4 flex-1 flex flex-col justify-center"
        >
          <p className="text-xs uppercase tracking-wide text-[var(--color-text-muted)] font-semibold">
            Usá
          </p>
          <p className="mt-1 text-2xl font-semibold tracking-tight text-[var(--color-text-primary)]">
            {card.bank}
          </p>
          <p className="mt-4 text-sm text-[var(--color-text-body)]">
            {rationale}
          </p>
          <p className="mt-3 inline-flex items-center self-start px-3 py-1.5 rounded-full bg-[var(--color-success)]/10 text-[var(--color-success)] text-sm font-semibold">
            {cycleLengthDays} días de financiamiento
          </p>
        </motion.div>
      </AnimatePresence>

      {showAlert && alert ? (
        <div
          role="status"
          className="mt-4 flex items-start gap-2 p-3 rounded-[var(--radius-md)] bg-[var(--color-warning)]/10 border border-[var(--color-warning)]/20"
        >
          <AlertTriangle
            className="size-4 text-[var(--color-warning)] shrink-0 mt-0.5"
            aria-hidden
          />
          <p className="text-xs text-[var(--color-text-body)]">
            {alert.daysUntilCut === 0
              ? `La tarjeta ${alert.card.bank} corta hoy. Si podés esperar, vas a tener más días para pagar.`
              : `La tarjeta ${alert.card.bank} corta en ${alert.daysUntilCut} ${alert.daysUntilCut === 1 ? "día" : "días"}. Si podés esperar, vas a tener más días para pagar.`}
          </p>
        </div>
      ) : null}
    </GlassCard>
  );
}

function WidgetHeader({ title }: { title: string }): React.JSX.Element {
  return (
    <h2 className="text-base font-semibold tracking-tight text-[var(--color-text-primary)]">
      {title}
    </h2>
  );
}

function WidgetSkeleton(): React.JSX.Element {
  return (
    <GlassCard className="p-6 h-full">
      <Skeleton className="h-4 w-40" rounded="sm" />
      <div className="mt-4 space-y-2">
        <Skeleton className="h-8 w-32" rounded="sm" />
        <Skeleton className="h-4 w-24" rounded="sm" />
        <Skeleton className="h-4 w-48" rounded="sm" />
      </div>
    </GlassCard>
  );
}
