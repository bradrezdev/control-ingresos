/**
 * MsiTermFilter — control-ingresos (Tarjetas · Mis finanzas)
 *
 * Fila horizontal de plazos MSI. Una sola línea desplazable, barra de
 * desplazamiento oculta, y el chip activo se mantiene visible.
 */
import { useEffect, useRef } from "react";
import { Chip } from "@/components/ui/design";

export interface MsiTermFilterProps {
  terms: number[];
  /** Plazo seleccionado (null = sin filtro). */
  term: number | null;
  onSelect: (term: number | null) => void;
}

export function MsiTermFilter({
  terms,
  term,
  onSelect,
}: MsiTermFilterProps): React.JSX.Element {
  const stripRef = useRef<HTMLElement>(null);
  const chipRefs = useRef(new Map<number, HTMLSpanElement>());

  useEffect(() => {
    if (term === null) return;
    const strip = stripRef.current;
    const chip = chipRefs.current.get(term);
    if (!strip || !chip) return;

    const left = chip.offsetLeft;
    const right = left + chip.offsetWidth;

    if (left < strip.scrollLeft) {
      strip.scrollLeft = left;
    } else if (right > strip.scrollLeft + strip.clientWidth) {
      strip.scrollLeft = right - strip.clientWidth;
    }
  }, [term]);

  return (
    <>
      <style>
        {`.msi-term-scroll::-webkit-scrollbar { display: none; height: 0; }`}
      </style>
      <nav
        ref={stripRef}
        aria-label="Filtrar compras por plazo"
        className="msi-term-scroll flex flex-nowrap gap-1.5 overflow-x-auto overscroll-x-contain"
        style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
      >
        {terms.map((months) => (
          <span
            key={months}
            ref={(node) => {
              if (node) {
                chipRefs.current.set(months, node);
              } else {
                chipRefs.current.delete(months);
              }
            }}
            className="inline-flex"
          >
            <Chip
              active={term === months}
              variant="surface"
              className="px-[13px]"
              onClick={() => {
                if (term !== months) {
                  onSelect(months);
                }
              }}
            >
              {months} meses
            </Chip>
          </span>
        ))}
      </nav>
    </>
  );
}
