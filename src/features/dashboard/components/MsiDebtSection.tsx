import { NavLink } from "react-router";
import { PaperCard, SectionHeading, TermBar, Amount } from "@/components/ui/design";
import type { DashboardSummary } from "../types";

export interface MsiDebtSectionProps {
  summary: DashboardSummary;
}

export function MsiDebtSection({ summary }: MsiDebtSectionProps): React.JSX.Element {
  const { currency, msiTotalDebt, msiActiveCount, msiGroups } = summary;
  const hasDebt = msiGroups.length > 0;

  return (
    <PaperCard className="p-5">
      <SectionHeading
        title="Deuda a meses"
        action={
          <NavLink
            to="/transactions"
            className="text-aux font-semibold text-primary min-h-11 inline-flex items-center"
          >
            Ver compras
          </NavLink>
        }
      />

      {hasDebt ? (
        <>
          <div className="mt-2 flex flex-col">
            <Amount cents={msiTotalDebt} currency={currency} className="text-secondary-figure font-extrabold text-primary" />
            <span className="text-aux text-muted">
              {msiActiveCount} compra{msiActiveCount > 1 ? "s" : ""} activa
              {msiActiveCount > 1 ? "s" : ""}
            </span>
          </div>
          <ul className="mt-2">
            {msiGroups.map((group) => (
              <li key={group.tenure}>
                <TermBar
                  label={`${group.tenure} meses`}
                  percent={group.percent}
                  amountCents={group.totalDebt}
                  showPercent={false}
                />
              </li>
            ))}
          </ul>
        </>
      ) : (
        <div className="py-10 text-center">
          <p className="text-aux text-muted">Sin compras a meses activas.</p>
          <NavLink
            to="/transactions"
            className="mt-3 inline-flex h-10 items-center justify-center rounded-pill bg-button px-4 text-sm font-semibold text-hero-text hover:bg-primary-hover"
          >
            Agregar movimiento
          </NavLink>
        </div>
      )}
    </PaperCard>
  );
}
