/**
 * Sheet — control-ingresos
 *
 * Hoja de detalle. En móvil se ancla al pie (ancho completo, alto máximo
 * de 92 dvh, radios superiores de 24 px); en escritorio es un diálogo
 * centrado de 470 px (`DESIGN-RULES` §7).
 *
 * Cierra con Escape, con el fondo o con el botón de cerrar (44 px), y
 * devuelve el foco al control que la abrió.
 */
import { useEffect, useId, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";

export interface SheetProps {
  open: boolean;
  onClose: () => void;
  /** Título accesible de la hoja. */
  title: string;
  description?: string;
  children: ReactNode;
}

export function Sheet({
  open,
  onClose,
  title,
  description,
  children,
}: SheetProps): React.JSX.Element | null {
  const panelRef = useRef<HTMLDivElement | null>(null);
  const previouslyFocused = useRef<Element | null>(null);
  const titleId = useId();

  useEffect(() => {
    if (!open) return;
    previouslyFocused.current = document.activeElement;

    function onKey(event: KeyboardEvent): void {
      if (event.key === "Escape") {
        event.stopPropagation();
        onClose();
      }
    }
    document.addEventListener("keydown", onKey);

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    // El foco entra en la hoja por el título (S15).
    const heading = panelRef.current?.querySelector<HTMLElement>("[data-sheet-initial-focus]");
    (heading ?? panelRef.current)?.focus();

    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previousOverflow;
      if (previouslyFocused.current instanceof HTMLElement) {
        previouslyFocused.current.focus();
      }
    };
  }, [open, onClose]);

  if (!open) return null;
  if (typeof document === "undefined") return null;

  return createPortal(
    <div className="sheet-scrim" role="presentation">
      <button
        type="button"
        aria-label="Cerrar la hoja"
        onClick={onClose}
        className="sheet-scrim-backdrop"
        tabIndex={-1}
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? `${titleId}-desc` : undefined}
        tabIndex={-1}
        className="sheet-panel"
      >
        <div className="sheet-inner">
          <header className="flex items-start justify-between gap-3 pt-1 pb-2">
            <div className="min-w-0">
              <h2
                id={titleId}
                data-sheet-initial-focus
                tabIndex={-1}
                className="text-title font-bold leading-tight tracking-tight text-primary focus-visible:outline-none!"
              >
                {title}
              </h2>
              {description ? (
                <p id={`${titleId}-desc`} className="mt-1 text-aux text-muted">
                  {description}
                </p>
              ) : null}
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Cerrar"
              className="-mt-1 -mr-2 grid size-11 shrink-0 place-items-center rounded-full text-muted transition-colors duration-fast hover:bg-day"
            >
              <X className="size-5" aria-hidden strokeWidth={2} />
            </button>
          </header>
          <div className="sheet-body">{children}</div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
