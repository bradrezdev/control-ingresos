import { Check, AlertTriangle } from "lucide-react";
import { NavLink } from "react-router";
import { HeroCard, ProgressTrack, StatusPill, Amount } from "@/components/ui/design";
import { formatCurrency } from "@/lib/money/format";
import { getDaysInMonth } from "date-fns";
import type { DashboardSummary } from "../types";

export interface HeroSectionProps {
  summary: DashboardSummary;
}

export function HeroSection({ summary }: HeroSectionProps): React.JSX.Element {
  const {
    currency,
    monthLabel,
    isCurrentMonth,
    limitCents,
    availableCents,
    usedPercent,
    progressPercent,
    paceOk,
    fixedTotalCents,
    cardTotalCents,
  } = summary;

  const hasLimit = limitCents > 0;
  const daysInMonth = getDaysInMonth(summary.refDate);

  const paceChip = isCurrentMonth
    ? paceOk
      ? { tone: "ok" as const, label: "Vas al ritmo", icon: <Check className="size-3.5" aria-hidden strokeWidth={2} /> }
      : { tone: "warn" as const, label: "Vas rápido", icon: <AlertTriangle className="size-3.5" aria-hidden strokeWidth={2} /> }
    : { tone: "neutral" as const, label: "Proyección", icon: undefined };

  const formattedAvailable = formatCurrencyParts(availableCents, currency);
  const formattedLimit = formatCurrencyParts(limitCents, currency, { sign: false });

  return (
    <HeroCard className="p-5">
      <div className="flex items-center justify-between gap-3">
        <span className="text-aux text-hero-dim">Disponible en {monthLabel.toLowerCase()}</span>
        <StatusPill tone={paceChip.tone}>
          <span className="inline-flex items-center gap-1">
            {paceChip.icon}
            {paceChip.label}
          </span>
        </StatusPill>
      </div>

      {!hasLimit ? (
        <div className="mt-4">
          <p className="text-body font-semibold text-hero-text">
            Configura tu límite mensual en{" "}
            <NavLink to="/settings" className="underline underline-offset-4 hover:text-hero-dim">
              Ajustes
            </NavLink>
          </p>
        </div>
      ) : (
        <>
          <div className="mt-1 flex items-baseline gap-1">
            <span className="text-figure font-extrabold tracking-tight text-hero-text">
              {formattedAvailable.whole}
            </span>
            <span className="text-figure-fraction font-bold text-hero-dim">
              {formattedAvailable.fraction}
            </span>
          </div>

          <p className="text-aux text-hero-dim">
            de {formattedLimit.whole}
            {formattedLimit.fraction} de tu límite
          </p>

          <ProgressTrack
            fill={usedPercent}
            variant="hero"
            {...(isCurrentMonth
              ? { marker: { label: "Hoy", position: progressPercent } }
              : {})}
            className="mt-6"
          />

          <div className="mt-2 flex items-center justify-between text-aux text-hero-dim">
            <span>Usado {usedPercent}%</span>
            <span>
              {isCurrentMonth
                ? `Día ${summary.refDate.getDate()} de ${daysInMonth}`
                : `${daysInMonth} días`}
            </span>
          </div>
        </>
      )}

      <div className="mt-4 flex gap-2.5">
        <NavLink
          to="/fixed-payments"
          className="flex flex-1 flex-col gap-0.5 rounded-md bg-hero-text/10 px-3.5 py-2.5"
        >
          <span className="text-aux text-hero-dim">Pagos fijos</span>
          <Amount cents={fixedTotalCents} currency={currency} className="text-title font-bold text-hero-text" />
        </NavLink>
        <NavLink
          to="/cards"
          className="flex flex-1 flex-col gap-0.5 rounded-md bg-hero-text/10 px-3.5 py-2.5"
        >
          <span className="text-aux text-hero-dim">Tarjetas</span>
          <Amount cents={cardTotalCents} currency={currency} className="text-title font-bold text-hero-text" />
        </NavLink>
      </div>
    </HeroCard>
  );
}

function formatCurrencyParts(
  cents: number,
  currency: string,
  { sign = true }: { sign?: boolean } = {},
): { whole: string; fraction: string } {
  let text = formatCurrency(cents, currency);
  if (sign) {
    text = text.replace(/^-/, "\u2212");
  } else {
    text = text.replace(/^-/, "");
  }
  const dotIndex = text.lastIndexOf(".");
  if (dotIndex === -1) return { whole: text, fraction: "" };
  return {
    whole: text.slice(0, dotIndex),
    fraction: text.slice(dotIndex),
  };
}
