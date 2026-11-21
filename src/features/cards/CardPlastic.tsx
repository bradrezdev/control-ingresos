/**
 * CardPlastic — control-ingresos (Tarjetas · Mis finanzas)
 *
 * El plástico de la tarjeta: proporción 1.586:1, radio 16 px, borde de
 * 1 px, trama de fondo y el acabado de la tarjeta (plata, azul, verde o
 * marino). Arriba, emisor y tipo; abajo, chip, símbolo de lectura sin
 * contacto y titular; en la esquina, la flecha de detalle.
 *
 * Medidas y colores: `DESIGN-RULES` §6 y la referencia ejecutable
 * (`Tarjetas-autonoma.html`, bloque `wallet.css`).
 */
import { useRef } from "react";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/cn";
import { finishFor, type CardFinish, type CardSkin } from "@/lib/cards/skin";
import type { Card } from "@/db/schemas";

export interface CardPlasticProps {
  card: Card;
  /** Etiqueta del tipo de tarjeta ("Crédito"). */
  typeLabel?: string;
  /** Tocar el plástico abre la ficha de la tarjeta. */
  onOpenDetail?: () => void;
  /**
   * Gesto horizontal sobre el plástico (sólo táctil): cambia de tarjeta.
   * `1` = siguiente, `-1` = anterior.
   */
  onSwipe?: (direction: 1 | -1) => void;
  className?: string;
}

/** Variantes de marca: cada emisor tiene su propia tipografía. */
type BrandVariant = "plata" | "mercado-pago" | "stori" | "generic";

const BRAND_STYLE: Record<
  BrandVariant,
  { fontSize: string; fontWeight: number; letterSpacing: string; lineHeight: number }
> = {
  plata: {
    fontSize: "clamp(1.45rem, 13.1cqw, 2.85rem)",
    fontWeight: 630,
    letterSpacing: "0.055em",
    lineHeight: 1,
  },
  "mercado-pago": {
    fontSize: "clamp(1.05rem, 9.5cqw, 2.05rem)",
    fontWeight: 760,
    letterSpacing: "-0.075em",
    lineHeight: 0.78,
  },
  stori: {
    fontSize: "clamp(1.8rem, 15cqw, 3.35rem)",
    fontWeight: 630,
    letterSpacing: "-0.085em",
    lineHeight: 0.73,
  },
  generic: {
    fontSize: "clamp(1.1rem, 10cqw, 2rem)",
    fontWeight: 710,
    letterSpacing: "-0.055em",
    lineHeight: 0.96,
  },
};

/** El emisor define la marca; el nombre completo se conserva en el resto. */
function brandVariant(bank: string): BrandVariant {
  const key = bank
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
  if (key === "plata") return "plata";
  if (key === "mercado pago") return "mercado-pago";
  if (key === "stori") return "stori";
  return "generic";
}

/**
 * Trama de fondo del plástico. Cada acabado tiene su propio trazo:
 * una onda para la plata, elipses para el azul y curvas verticales para
 * los acabados oscuros.
 */
function FacePattern({
  finish,
  skin,
}: {
  finish: CardFinish;
  skin: CardSkin;
}): React.JSX.Element {
  const opacity = skin === "forest" || skin === "ink" ? 0.32 : 0.36;

  // Azul: elipses superpuestas que barren la tarjeta.
  if (skin === "ocean") {
    return (
      <svg
        className="pointer-events-none absolute inset-0 h-full w-full"
        viewBox="0 0 360 227"
        preserveAspectRatio="none"
        aria-hidden
        style={{ opacity }}
      >
        <g fill="none" stroke={finish.pattern} strokeWidth={0.9}>
          {Array.from({ length: 29 }, (_, index) => (
            <ellipse
              key={index}
              cx={336 - index * 0.5}
              cy={102 + index * 0.7}
              rx={35 + index * 5.2}
              ry={65 + index * 4.3}
              transform="rotate(-31 305 95)"
            />
          ))}
        </g>
      </svg>
    );
  }

  // Plata: una onda que cruza la tarjeta; verde y marino: curvas
  // verticales.
  const paths: string[] = [];
  if (skin === "silver") {
    for (let i = 0; i < 29; i += 1) {
      const y = 40 + i * 3.6;
      paths.push(
        `M-20 ${155 + i * 2} C70 ${205 + i * 1.4} 146 ${100 - i * 0.4} 221 ${y} S344 ${67 + i * 3.5} 408 ${28 + i * 2.9}`,
      );
    }
  } else {
    for (let i = 0; i < 34; i += 1) {
      paths.push(
        `M${186 + i * 3} -25 C${95 + i * 3} 46 ${305 + i * 4.1} 76 ${218 + i * 3.8} 132 S${228 + i * 3} 198 ${151 + i * 3} 262`,
      );
    }
  }

  return (
    <svg
      className="pointer-events-none absolute inset-0 h-full w-full"
      viewBox="0 0 360 227"
      preserveAspectRatio="none"
      aria-hidden
      style={{ opacity }}
    >
      <g fill="none" stroke={finish.pattern} strokeWidth={0.9}>
        {paths.map((d, index) => (
          <path key={index} d={d} />
        ))}
      </g>
    </svg>
  );
}

/** Chip EMV (dorado, como en la referencia). */
function EmvChip(): React.JSX.Element {
  return (
    <svg
      className="block h-auto shrink-0"
      viewBox="0 0 44 32"
      aria-hidden
      style={{ width: "clamp(26px, 11cqw, 38px)" }}
    >
      <rect
        x="1"
        y="1"
        width="42"
        height="30"
        rx="6"
        fill="#d8c9a6"
        stroke="#806d50"
      />
      <g fill="none" stroke="#897650" strokeWidth={1}>
        <path d="M1 10h12l5 5-5 6H1m42-11H30l-4 5 4 6h13M14 1v7l6 5h5l6-6V1m-17 30v-7l6-6h5l6 6v7M2 16h9m23 0h9" />
      </g>
    </svg>
  );
}

/** Símbolo de lectura sin contacto. */
function ContactlessIcon({ color }: { color: string }): React.JSX.Element {
  return (
    <svg
      className="shrink-0"
      viewBox="0 0 24 24"
      aria-hidden
      fill="none"
      stroke={color}
      strokeWidth={1.4}
      strokeLinecap="round"
      style={{ width: 16, height: 16, opacity: 0.85 }}
    >
      <path d="M6 8a9 9 0 0 1 0 8" />
      <path d="M10 5.5a13.5 13.5 0 0 1 0 13" />
      <path d="M14 3a18 18 0 0 1 0 18" />
    </svg>
  );
}

/** Marca del emisor: PLATA, Mercado Pago o Stori con su propia caja. */
function FaceBrand({
  card,
  variant,
}: {
  card: Card;
  variant: BrandVariant;
}): React.JSX.Element {
  const style = BRAND_STYLE[variant];

  if (variant === "mercado-pago") {
    return (
      <span
        className="block max-w-[77%]"
        style={{
          color: finishFor(card).brand,
          ...style,
        }}
      >
        mercado
        <span className="block" style={{ marginTop: "0.06em" }}>
          pago
        </span>
      </span>
    );
  }

  const label = variant === "plata" ? "PLΛTΛ" : variant === "stori" ? "stori" : card.bank;

  return (
    <span
      className="block max-w-[77%]"
      style={{
        color: finishFor(card).brand,
        ...style,
      }}
    >
      {label}
    </span>
  );
}

/**
 * Plástico de la tarjeta. Es un botón cuando tiene acción (tocar abre
 * la ficha) y un `div` cuando sólo se muestra.
 */
export function CardPlastic({
  card,
  typeLabel = "Crédito",
  onOpenDetail,
  onSwipe,
  className,
}: CardPlasticProps): React.JSX.Element {
  const finish = finishFor(card);
  const skin = card.skin ?? "ink";
  const variant = brandVariant(card.bank);
  const pointerStart = useRef<{ x: number; y: number } | null>(null);
  const swiped = useRef(false);

  const content = (
    <>
      <FacePattern finish={finish} skin={skin} />

      <span className="relative flex w-full items-start justify-between gap-2">
        <FaceBrand card={card} variant={variant} />
        <span
          className="shrink-0 text-chip font-semibold uppercase"
          style={{
            color: finish.muted,
            letterSpacing: "0.13em",
            marginTop: 2,
          }}
        >
          {typeLabel}
        </span>
      </span>

      <span className="relative mt-auto flex items-center gap-1.5">
        <EmvChip />
        <ContactlessIcon color={finish.muted} />
      </span>

      <span className="relative mt-1 flex max-w-full flex-col items-start gap-0.5">
        <span
          className="text-chip font-semibold uppercase"
          style={{ color: finish.muted, letterSpacing: "0.12em" }}
        >
          Titular
        </span>
        <span
          className="font-semibold"
          style={{
            color: finish.ink,
            fontSize: "clamp(0.8rem, 4.8cqw, 0.97rem)",
            lineHeight: 1.18,
          }}
        >
          {card.holderName}
        </span>
      </span>

      {onOpenDetail ? (
        <span
          className="absolute grid size-6 place-items-center rounded-full border"
          style={{
            right: 14,
            bottom: 14,
            borderColor: finish.muted,
            color: finish.muted,
            opacity: 0.85,
          }}
          aria-hidden
        >
          <ChevronRight className="size-3" strokeWidth={2} />
        </span>
      ) : null}
    </>
  );

  const shell = cn(
    "@container relative flex w-full flex-col overflow-hidden border text-left",
    "aspect-[1.586/1] rounded-md",
    "transition-transform duration-fast ease-out-soft",
    // El desplazamiento vertical sigue siendo nativo: el gesto
    // horizontal se lee de los punteros, no del scroll.
    "touch-pan-y",
    className,
  );
  const shellStyle = {
    backgroundColor: finish.bg,
    color: finish.ink,
    borderColor: finish.edge,
    padding: "clamp(15px, 1.55vw, 23px)",
    gap: 4,
  };

  if (!onOpenDetail) {
    return (
      <div className={shell} style={shellStyle} aria-label={card.bank}>
        {content}
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={(event) => {
        if (swiped.current) {
          // El gesto ya cambió de tarjeta: el clic no abre la ficha.
          swiped.current = false;
          event.preventDefault();
          return;
        }
        onOpenDetail();
      }}
      onPointerDown={(event) => {
        if (event.pointerType === "mouse") return;
        pointerStart.current = { x: event.clientX, y: event.clientY };
        swiped.current = false;
      }}
      onPointerUp={(event) => {
        const start = pointerStart.current;
        pointerStart.current = null;
        if (!start || !onSwipe) return;
        const dx = event.clientX - start.x;
        const dy = event.clientY - start.y;
        // Un arrastre claramente horizontal cambia de tarjeta; el
        // vertical se deja al scroll de la página.
        if (Math.abs(dx) < 40 || Math.abs(dx) < Math.abs(dy) * 1.5) return;
        swiped.current = true;
        onSwipe(dx > 0 ? 1 : -1);
      }}
      aria-label={`Ver detalle de ${card.bank}`}
      className={cn(shell, "hover:-translate-y-px")}
      style={shellStyle}
    >
      {content}
    </button>
  );
}
