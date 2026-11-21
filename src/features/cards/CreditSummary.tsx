/**
 * CreditSummary — control-ingresos (Tarjetas · Mis finanzas)
 *
 * El resumen azul marino: "Crédito disponible estimado" con botón de
 * información, la cifra conjunta con los centavos más pequeños, la barra
 * de uso con su porcentaje, el número de tarjetas y las dos celdas
 * "Usado estimado" / "Límite total".
 *
 * Medidas: `DESIGN-RULES` §4 (resumen de 28 px de radio, relleno
 * 10·20·20) y §6 (barra de 12 px).
 */
import { Info } from "lucide-react";
import { ProgressTrack } from "@/components/ui/design";
import { formatCurrency } from "@/lib/money/format";
import type { WalletPortfolio } from "@/engine/wallet";

export interface CreditSummaryProps {
  portfolio: WalletPortfolio;
  currency: string;
  /** Abre la hoja "Cómo se estima el crédito". */
  onOpenInfo: () => void;
}

/** Parte la cifra en enteros y centavos para el tratamiento tipográfico. */
function splitAmount(cents: number, currency: string): {
  whole: string;
  fraction: string;
} {
  const text = formatCurrency(cents, currency).replace(/^-/, "");
  const dot = text.lastIndexOf(".");
  if (dot === -1) return { whole: text, fraction: "" };
  return { whole: text.slice(0, dot), fraction: text.slice(dot) };
}

export function CreditSummary({
  portfolio,
  currency,
  onOpenInfo,
}: CreditSummaryProps): React.JSX.Element {
  const parts = splitAmount(portfolio.availableCents, currency);
  const cardLabel =
    portfolio.cardCount === 1 ? "1 tarjeta" : `${portfolio.cardCount} tarjetas`;

  return (
    <section
      className="bg-wallet-hero text-wallet-hero-text rounded-hero overflow-hidden wallet-hero"
      aria-label="Crédito de todas las tarjetas"
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-aux text-wallet-hero-dim">
          Crédito disponible estimado
        </p>
        <button
          type="button"
          onClick={onOpenInfo}
          aria-label="Cómo se estima el crédito"
          className="-mt-2 -mr-2 grid size-11 shrink-0 place-items-center rounded-full text-wallet-hero-text transition-colors duration-fast hover:bg-wallet-hero-text/10"
        >
          <Info className="size-5" strokeWidth={2} aria-hidden />
        </button>
      </div>

      <div className="flex items-baseline gap-1">
        <span className="text-figure font-extrabold tracking-tight">
          {parts.whole}
        </span>
        {parts.fraction ? (
          <span className="text-figure-fraction font-bold text-wallet-hero-dim">
            {parts.fraction}
          </span>
        ) : null}
      </div>

      <ProgressTrack
        variant="hero"
        fill={portfolio.percent}
        className="mt-4 mb-1.5"
        aria-label={`Uso del crédito ${portfolio.percent}%`}
      />

      <div className="flex items-center justify-between gap-3 text-aux text-wallet-hero-dim">
        <span>Usado {portfolio.percent}%</span>
        <span>{cardLabel}</span>
      </div>

      <div className="mt-3.5 grid grid-cols-2 gap-2.5">
        <div className="rounded-md bg-wallet-hero-text/10 px-3.5 pt-1.5 pb-3">
          <small className="block text-aux text-wallet-hero-dim">
            Usado estimado
          </small>
          <b className="wallet-hero-tile-value block font-bold tabular-nums">
            {formatCurrency(portfolio.usedCents, currency)}
          </b>
        </div>
        <div className="rounded-md bg-wallet-hero-text/10 px-3.5 pt-1.5 pb-3">
          <small className="block text-aux text-wallet-hero-dim">
            Límite total
          </small>
          <b className="wallet-hero-tile-value block font-bold tabular-nums">
            {formatCurrency(portfolio.limitCents, currency)}
          </b>
        </div>
      </div>
    </section>
  );
}
