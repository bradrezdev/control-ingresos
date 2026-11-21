/**
 * FixedPaymentsScreen — control-ingresos (redesign-ui-2026, T6)
 *
 * Redesigned Pagos fijos screen, following the prototype's `#section-screen`
 * (fijos page) composition: header with the add action, month selector
 * (current / next), month total in the hero card, and the "Este mes" /
 * "Próximos" groups. Sheets (form, detail, delete confirm) are owned by
 * the page.
 */
import { useState } from "react";
import { Plus } from "lucide-react";
import { formatCurrency } from "@/lib/money/format";
import {
  HeroCard,
  PaperCard,
  ScreenHeader,
  SectionHeading,
  SegmentedControl,
  SettingsButton,
} from "@/components/ui/design";
import { useFixedPaymentsSummary } from "./useFixedPaymentsSummary";
import { FixedPaymentsEmpty } from "./FixedPaymentsEmpty";
import { FixedPaymentsError } from "./FixedPaymentsError";
import { FixedPaymentsSkeleton } from "./FixedPaymentsSkeleton";
import { FixedPaymentRow } from "./FixedPaymentRow";
import type { FixedPayment } from "@/db/schemas/fixedPayment";
import type { FixedPaymentsSummary, SelectedMonth } from "./types";

export interface FixedPaymentsScreenProps {
  onCreate: () => void;
  onSelect: (fixedPayment: FixedPayment) => void;
}

export function FixedPaymentsScreen({
  onCreate,
  onSelect,
}: FixedPaymentsScreenProps): React.JSX.Element {
  const [selectedMonth, setSelectedMonth] = useState<SelectedMonth>("current");
  const { summary, isLoading, error, retry } = useFixedPaymentsSummary(selectedMonth);

  return (
    <div className="flex flex-col gap-4">
      <ScreenHeader
        title="Pagos fijos"
        right={
          <div className="flex items-center gap-2">
            <AddFixedPaymentButton onClick={onCreate} />
            <SettingsButton />
          </div>
        }
      />

      {error !== null ? (
        <FixedPaymentsError message={error.message} onRetry={retry} />
      ) : isLoading || !summary ? (
        <FixedPaymentsSkeleton />
      ) : summary.totalCount === 0 ? (
        <FixedPaymentsEmpty onAdd={onCreate} />
      ) : (
        <>
          <SegmentedControl
            options={[
              { value: "current", label: summary.currentMonthLabel },
              { value: "next", label: summary.nextMonthLabel },
            ]}
            value={selectedMonth}
            onChange={(value) => setSelectedMonth(value as SelectedMonth)}
            aria-label="Mes"
          />

          <MonthTotalCard summary={summary} />

          <PaymentsGroupCard
            title="Este mes"
            rows={summary.dueRows}
            currency={summary.currency}
            onSelect={onSelect}
          />

          {summary.upcomingRows.length > 0 ? (
            <PaymentsGroupCard
              title="Próximos"
              rows={summary.upcomingRows}
              currency={summary.currency}
              onSelect={onSelect}
            />
          ) : null}
        </>
      )}
    </div>
  );
}

/**
 * Header add action. Mirrors the prototype's `.section-add` pill: the
 * full label at ≥481px and the short label below it, both naming the
 * action ("Agregar pago fijo" is always the accessible name).
 */
function AddFixedPaymentButton({ onClick }: { onClick: () => void }): React.JSX.Element {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Agregar pago fijo"
      className="inline-flex h-11 items-center justify-center gap-1.5 rounded-pill bg-button px-4 text-sm font-semibold text-hero-text transition-colors duration-fast ease-out-soft hover:bg-primary-hover"
    >
      <Plus className="size-4 shrink-0" strokeWidth={2} aria-hidden />
      <span className="hidden min-[481px]:inline">Agregar pago fijo</span>
      <span className="min-[481px]:hidden" aria-hidden="true">
        Agregar
      </span>
    </button>
  );
}

/**
 * Hero card with the month total: main figure 44/800 with the decimals
 * at 22/700 in the hero dim color (same treatment as the Inicio hero),
 * plus the count of scheduled payments.
 */
function MonthTotalCard({ summary }: { summary: FixedPaymentsSummary }): React.JSX.Element {
  const parts = formatHeroParts(summary.totalCents, summary.currency);
  const count = summary.dueRows.length;
  const note =
    count === 0
      ? "Sin pagos programados para este mes."
      : `${count} ${count === 1 ? "pago programado" : "pagos programados"}`;

  return (
    <HeroCard className="p-5" aria-label="Total del mes">
      <p className="text-aux text-hero-dim">
        Pagos fijos de {summary.monthLabel.toLowerCase()}
      </p>
      <div className="mt-1 flex items-baseline gap-1">
        <span className="text-figure font-extrabold tracking-tight text-hero-text">
          {parts.whole}
        </span>
        {parts.fraction ? (
          <span className="text-figure-fraction font-bold text-hero-dim">
            {parts.fraction}
          </span>
        ) : null}
      </div>
      <p className="mt-4 text-aux text-hero-dim">{note}</p>
    </HeroCard>
  );
}

interface PaymentsGroupCardProps {
  title: string;
  rows: FixedPayment[];
  currency: string;
  onSelect: (fixedPayment: FixedPayment) => void;
}

function PaymentsGroupCard({
  title,
  rows,
  currency,
  onSelect,
}: PaymentsGroupCardProps): React.JSX.Element {
  return (
    <PaperCard className="p-5">
      <SectionHeading title={title} className="min-h-11" />
      {rows.length === 0 ? (
        <p className="py-6 text-center text-aux text-muted">
          Sin pagos fijos programados para este mes.
        </p>
      ) : (
        <div className="flex flex-col">
          {rows.map((fp) => (
            <FixedPaymentRow
              key={fp.id}
              fixedPayment={fp}
              currency={currency}
              onClick={() => onSelect(fp)}
            />
          ))}
        </div>
      )}
    </PaperCard>
  );
}

/**
 * Splits a formatted currency string into whole + fraction parts so the
 * main figure renders 44/800 with the decimals at 22/700 in the hero's
 * dim color (same treatment as the dashboard and cards heroes).
 */
function formatHeroParts(
  cents: number,
  currency: string,
): { whole: string; fraction: string } {
  const text = formatCurrency(cents, currency).replace(/^-/, "");
  const dotIndex = text.lastIndexOf(".");
  if (dotIndex === -1) return { whole: text, fraction: "" };
  return { whole: text.slice(0, dotIndex), fraction: text.slice(dotIndex) };
}
