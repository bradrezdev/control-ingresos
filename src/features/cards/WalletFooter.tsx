/**
 * WalletFooter — control-inginos (Tarjetas · Mis finanzas)
 *
 * Pie de la cartera: la moneda y la fecha de los datos, y el acceso a
 * las tarjetas archivadas (sólo si hay alguna).
 */
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { utcDateToLocal } from "@/lib/date/format";

export interface WalletFooterProps {
  currency: string;
  /** Fecha de los datos (la fecha de referencia de los cálculos). */
  referenceDate: Date;
  /** Número de tarjetas archivadas (0 = no hay botón). */
  archivedCount: number;
  onOpenArchived: () => void;
}

/** "20 nov 2026" */
function formatDataDate(date: Date): string {
  // La fecha de referencia es UTC a medianoche: sin convertir, el
  // formateador local mostraría el día anterior en zonas negativas.
  return format(utcDateToLocal(date), "d MMM yyyy", { locale: es });
}

export function WalletFooter({
  currency,
  referenceDate,
  archivedCount,
  onOpenArchived,
}: WalletFooterProps): React.JSX.Element {
  return (
    <div className="flex items-center justify-between gap-3 pb-2">
      <p className="text-aux text-muted">
        Importes en {currency} · {formatDataDate(referenceDate)}
      </p>
      {archivedCount > 0 ? (
        <button
          type="button"
          onClick={onOpenArchived}
          className="inline-flex min-h-11 items-center text-aux font-semibold text-primary"
        >
          Tarjetas archivadas
        </button>
      ) : null}
    </div>
  );
}
