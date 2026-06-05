import { PageContainer } from "@/components/layout/PageContainer";

export function Dashboard(): React.JSX.Element {
  return (
    <PageContainer
      title="Dashboard"
      description="Resumen financiero del mes"
    >
      <p className="text-[var(--color-text-muted)]">
        Widgets se construyen en Fase 6.
      </p>
    </PageContainer>
  );
}
