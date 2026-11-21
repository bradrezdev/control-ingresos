/**
 * CardOptionsMenu — control-ingresos (Tarjetas · Mis finanzas)
 *
 * Menú de la tarjeta: "Ver detalle", "Editar tarjeta", "Cambiar
 * prioridad" (sólo si hay más de una tarjeta en la cartera) y "Quitar de
 * mi cartera".
 *
 * Es presentacional: devuelve la acción elegida y el padre decide qué
 * hoja abrir.
 */
import { CreditCard, Pencil, Trash2 } from "lucide-react";
import { Drawer } from "@/components/ui/Drawer";
import { cn } from "@/lib/cn";
import type { Card } from "@/db/schemas";

export interface CardOptionsMenuProps {
  card: Card;
  /** Hay más de una tarjeta en la cartera: se ofrece cambiar la prioridad. */
  canReorder: boolean;
  onClose: () => void;
  /** "Ver detalle" */
  onOpenDetail: () => void;
  /** "Editar tarjeta" */
  onEdit: () => void;
  /** "Cambiar prioridad" */
  onReorder: () => void;
  /** "Quitar de mi cartera" */
  onArchive: () => void;
}

/** Fila del menú: pictograma, texto y flecha. */
function MenuRow({
  icon,
  label,
  onClick,
  danger = false,
}: {
  icon: React.JSX.Element;
  label: string;
  onClick: () => void;
  danger?: boolean;
}): React.JSX.Element {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex min-h-14 w-full items-center gap-3 rounded-md px-3 text-left",
        "transition-colors duration-fast ease-out-soft hover:bg-surface-inset",
        danger ? "text-danger" : "text-ink",
      )}
    >
      <span className="shrink-0" aria-hidden>
        {icon}
      </span>
      <span className="flex-1 text-base font-semibold">{label}</span>
      <span className="text-muted" aria-hidden>
        <svg
          className="size-4"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="m9 18 6-6-6-6" />
        </svg>
      </span>
    </button>
  );
}

export function CardOptionsMenu({
  card,
  canReorder,
  onClose,
  onOpenDetail,
  onEdit,
  onReorder,
  onArchive,
}: CardOptionsMenuProps): React.JSX.Element {
  return (
    <Drawer open onClose={onClose} title={card.bank}>
      <div className="flex flex-col">
        <MenuRow
          icon={<CreditCard className="size-5" strokeWidth={2} />}
          label="Ver detalle"
          onClick={onOpenDetail}
        />
        <MenuRow
          icon={<Pencil className="size-5" strokeWidth={2} />}
          label="Editar tarjeta"
          onClick={onEdit}
        />
        {canReorder ? (
          <MenuRow
            icon={
              <svg
                className="size-5"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden
              >
                <path d="M8 6h12M8 12h12M8 18h12" />
                <path d="M4 6h.01M4 12h.01M4 18h.01" />
              </svg>
            }
            label="Cambiar prioridad"
            onClick={onReorder}
          />
        ) : null}
        <MenuRow
          icon={<Trash2 className="size-5" strokeWidth={2} />}
          label="Quitar de mi cartera"
          onClick={onArchive}
          danger
        />
      </div>
    </Drawer>
  );
}
