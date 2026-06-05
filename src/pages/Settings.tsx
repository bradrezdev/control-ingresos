import { PageContainer } from "@/components/layout/PageContainer";

export function Settings(): React.JSX.Element {
  return (
    <PageContainer
      title="Ajustes"
      description="Preferencias y presupuesto mensual"
    >
      <p className="text-[var(--color-text-muted)]">
        Configuración de la app en Fase 5.
      </p>
    </PageContainer>
  );
}
