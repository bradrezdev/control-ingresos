import { NavLink } from "react-router";
import { PaperCard, SectionHeading, StackBar, Amount } from "@/components/ui/design";
import type { DashboardSummary } from "../types";

/**
 * Canonical 4-tone primary scale for the fixed-payments stacked bar.
 * The only hard-coded hex values in the dashboard; documented here as
 * the design-specified primary-clarity scale.
 */
const FIXED_STACK_COLORS = [
  { backgroundColor: "#0B2B66" },
  { backgroundColor: "#3B6FD4" },
  { backgroundColor: "#9DB8EC" },
  { backgroundColor: "#CBD3E1" },
];

export interface FixedPaymentsSectionProps {
  summary: DashboardSummary;
}

export function FixedPaymentsSection({
  summary,
}: FixedPaymentsSectionProps): React.JSX.Element {
  const { currency, fixedPayments, fixedTotalCents } = summary;
  const hasPayments = fixedPayments.top.length > 0;

  const stackSegments = hasPayments
    ? fixedPayments.others.length > 0
      ? [...fixedPayments.top, { id: "others", label: "", amountCents: fixedPayments.others.reduce((s, r) => s + r.amountCents, 0) }]
      : fixedPayments.top
    : [];

  return (
    <PaperCard className="p-5">
      <SectionHeading
        title="Pagos fijos"
        action={
          <Amount cents={fixedTotalCents} currency={currency} className="text-title font-bold text-primary" />
        }
      />

      {hasPayments ? (
        <>
          <StackBar
            segments={stackSegments.map((row, index) => ({
              value: row.amountCents,
              style: FIXED_STACK_COLORS[index % FIXED_STACK_COLORS.length]!,
            }))}
            className="mt-4"
          />
          <ul className="mt-2">
            {fixedPayments.top.map((row, index) => (
              <li key={row.id} className="flex min-h-16 items-center gap-3 border-t border-border-subtle py-3">
                <span
                  className="size-2.5 shrink-0 rounded-full"
                  style={FIXED_STACK_COLORS[index % FIXED_STACK_COLORS.length]!}
                  aria-hidden
                />
                <span className="flex-1 truncate text-body font-semibold text-ink">
                  {row.label}
                </span>
                <Amount cents={row.amountCents} currency={currency} className="text-body font-bold text-ink" />
              </li>
            ))}
            {fixedPayments.others.length > 0 ? (
              <li className="flex min-h-16 items-center gap-3 border-t border-border-subtle py-3">
                <span
                  className="size-2.5 shrink-0 rounded-full"
                  style={FIXED_STACK_COLORS[stackSegments.length - 1]!}
                  aria-hidden
                />
                <NavLink
                  to="/fixed-payments"
                  className="flex min-w-0 flex-1 flex-col"
                >
                  <span className="truncate text-body font-semibold text-ink">
                    {fixedPayments.others.length} pago{fixedPayments.others.length > 1 ? "s" : ""} más
                  </span>
                  <span className="truncate text-aux text-muted">
                    {fixedPayments.others.map((r) => r.label).join(", ")}
                  </span>
                </NavLink>
                <Amount
                  cents={fixedPayments.others.reduce((s, r) => s + r.amountCents, 0)}
                  currency={currency}
                  className="text-body font-bold text-ink"
                />
              </li>
            ) : null}
          </ul>
        </>
      ) : (
        <div className="py-10 text-center">
          <p className="text-aux text-muted">Sin pagos fijos programados.</p>
          <NavLink
            to="/fixed-payments"
            className="mt-3 inline-flex h-10 items-center justify-center rounded-pill bg-button px-4 text-sm font-semibold text-hero-text hover:bg-primary-hover"
          >
            Crear pago fijo
          </NavLink>
        </div>
      )}
    </PaperCard>
  );
}
