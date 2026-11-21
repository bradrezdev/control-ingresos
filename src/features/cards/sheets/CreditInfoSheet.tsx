/**
 * CreditInfoSheet — control-ingresos (Tarjetas · Mis finanzas)
 *
 * Hoja explicativa del cálculo del crédito disponible estimado.
 * Presentacional: el padre controla cuándo se monta y se desmonta.
 */
import { Sheet } from "@/components/ui/design";
import { Button } from "@/components/ui/Button";

export interface CreditInfoSheetProps {
  onClose: () => void;
}

export function CreditInfoSheet({ onClose }: CreditInfoSheetProps): React.JSX.Element {
  return (
    <Sheet open onClose={onClose} title="Cómo se estima el crédito">
      <div className="flex flex-col gap-5 text-body text-ink">
        <section className="flex flex-col gap-1">
          <h3 className="text-title font-bold text-primary">Crédito usado</h3>
          <p className="text-muted">
            Suma las cuotas pendientes de tus compras a meses desde el mes de
            referencia, más las compras de un solo pago ya realizadas cuyo
            vencimiento aún no pasa.
          </p>
        </section>

        <section className="flex flex-col gap-1">
          <h3 className="text-title font-bold text-primary">
            Crédito disponible
          </h3>
          <p className="text-muted">
            Es el límite registrado menos lo usado, nunca menor que cero. Es una
            estimación: para confirmar el saldo real consulta el estado de
            cuenta de la tarjeta.
          </p>
        </section>

        <section className="flex flex-col gap-1">
          <h3 className="text-title font-bold text-primary">
            Resumen de tu cartera
          </h3>
          <p className="text-muted">
            El disponible conjunto suma el disponible individual de cada
            tarjeta. No es el límite total menos el usado total, porque cada
            tarjeta tiene su propio límite.
          </p>
        </section>

        <Button
          type="button"
          variant="primary"
          size="lg"
          className="mt-2 w-full"
          onClick={onClose}
        >
          Entendido
        </Button>
      </div>
    </Sheet>
  );
}
