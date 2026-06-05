import { PageContainer } from "@/components/layout/PageContainer";

export function Debts(): React.JSX.Element {
  return (
    <PageContainer
      title="Deudas"
      description="Préstamos y pagos fijos"
    >
      <p className="text-[var(--color-text-muted)]">
        CRUD de deudas en Fase 5.
      </p>
    </PageContainer>
  );
}
