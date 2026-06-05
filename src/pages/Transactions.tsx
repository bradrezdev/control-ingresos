import { PageContainer } from "@/components/layout/PageContainer";

export function Transactions(): React.JSX.Element {
  return (
    <PageContainer
      title="Transacciones"
      description="Ingresos, gastos directos y MSI"
    >
      <p className="text-[var(--color-text-muted)]">
        CRUD de transacciones en Fase 5.
      </p>
    </PageContainer>
  );
}
