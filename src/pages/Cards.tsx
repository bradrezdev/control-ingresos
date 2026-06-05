import { PageContainer } from "@/components/layout/PageContainer";

export function Cards(): React.JSX.Element {
  return (
    <PageContainer
      title="Tarjetas"
      description="Ciclos de corte y pago"
    >
      <p className="text-[var(--color-text-muted)]">
        CRUD de tarjetas en Fase 5.
      </p>
    </PageContainer>
  );
}
