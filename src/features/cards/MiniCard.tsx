/**
 * MiniCard — control-ingresos (Tarjetas · Mis finanzas)
 *
 * Miniatura de la tarjeta que identifica al dueño de una compra a
 * meses: 34×23 px, radio 5 px, fondo y borde del acabado, con el
 * trazo ovalado del plástico y la marca del chip.
 */
import { finishFor } from "@/lib/cards/skin";
import type { Card } from "@/db/schemas";

export interface MiniCardProps {
  card: Card;
  className?: string;
}

export function MiniCard({ card, className }: MiniCardProps): React.JSX.Element {
  const finish = finishFor(card);

  return (
    <span
      className={className}
      style={{
        width: "34px",
        height: "23px",
        borderRadius: "5px",
        backgroundColor: finish.bg,
        border: `1px solid ${finish.edge}`,
        position: "relative",
        display: "inline-block",
        flex: "none",
        overflow: "hidden",
      }}
      aria-hidden
    >
      <span
        style={{
          position: "absolute",
          width: "55%",
          height: "110%",
          border: `1px solid ${finish.muted}`,
          opacity: 0.5,
          right: "-16%",
          top: "-30%",
          borderRadius: "45%",
          transform: "rotate(35deg)",
        }}
      />
      <span
        style={{
          position: "absolute",
          width: "22%",
          height: "15%",
          left: "12%",
          bottom: "22%",
          backgroundColor: finish.muted,
          borderRadius: "2px",
          opacity: 0.8,
        }}
      />
    </span>
  );
}
