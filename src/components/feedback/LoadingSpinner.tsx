/**
 * LoadingSpinner — control-ingresos
 *
 * Accessible spinner. Default `aria-label` is "Cargando"; pass a more
 * specific label for context (e.g. "Cargando transacciones").
 */
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/cn";

export interface LoadingSpinnerProps {
  size?: "sm" | "md" | "lg";
  label?: string;
  className?: string;
}

const sizeMap = {
  sm: "size-4",
  md: "size-6",
  lg: "size-8",
} as const;

export function LoadingSpinner({
  size = "md",
  label = "Cargando",
  className,
}: LoadingSpinnerProps): React.JSX.Element {
  return (
    <span
      role="status"
      aria-label={label}
      className={cn("inline-flex items-center justify-center", className)}
    >
      <Loader2
        className={cn(sizeMap[size], "animate-spin text-[var(--color-primary)]")}
        aria-hidden
      />
    </span>
  );
}
