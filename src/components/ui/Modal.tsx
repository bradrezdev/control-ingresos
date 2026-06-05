/**
 * Modal — control-ingresos
 *
 * Portal-based modal with a backdrop. Closes on:
 *   - Escape key
 *   - Click on backdrop
 *   - Explicit `onClose` call from a child (e.g. Cancel button)
 *
 * Locks body scroll while open and restores focus on close.
 */
import { useEffect, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { cn } from "@/lib/cn";

export interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  size?: "sm" | "md" | "lg" | "xl";
  children: ReactNode;
  hideCloseButton?: boolean;
}

const sizeMap = {
  sm: "max-w-sm",
  md: "max-w-md",
  lg: "max-w-lg",
  xl: "max-w-2xl",
} as const;

export function Modal({
  open,
  onClose,
  title,
  description,
  size = "md",
  children,
  hideCloseButton = false,
}: ModalProps): React.JSX.Element | null {
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const previouslyFocused = useRef<Element | null>(null);

  useEffect(() => {
    if (!open) return;
    previouslyFocused.current = document.activeElement;

    function onKey(e: KeyboardEvent): void {
      if (e.key === "Escape") {
        e.stopPropagation();
        onClose();
      }
    }
    document.addEventListener("keydown", onKey);

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    // Focus the modal so Escape works without prior interaction.
    dialogRef.current?.focus();

    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
      if (previouslyFocused.current instanceof HTMLElement) {
        previouslyFocused.current.focus();
      }
    };
  }, [open, onClose]);

  if (!open) return null;
  if (typeof document === "undefined") return null;

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="presentation"
    >
      <button
        type="button"
        aria-label="Cerrar modal"
        onClick={onClose}
        className="absolute inset-0 bg-black/40 backdrop-blur-sm cursor-default"
        tabIndex={-1}
      />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? "modal-title" : undefined}
        aria-describedby={description ? "modal-desc" : undefined}
        tabIndex={-1}
        className={cn(
          "relative w-full",
          sizeMap[size],
          "glass p-6 md:p-8",
          "rounded-[var(--radius-lg)]",
          "shadow-[var(--shadow-glass)]",
          "animate-in fade-in zoom-in-95 duration-200",
          "max-h-[90vh] overflow-y-auto",
        )}
      >
        {!hideCloseButton ? (
          <button
            type="button"
            onClick={onClose}
            className={cn(
              "absolute top-4 right-4",
              "size-8 rounded-full",
              "flex items-center justify-center",
              "text-[var(--color-text-muted)]",
              "hover:bg-[var(--color-surface-inset)] hover:text-[var(--color-text-body)]",
              "transition-colors duration-[var(--duration-fast)]",
            )}
            aria-label="Cerrar"
          >
            <X className="size-4" aria-hidden />
          </button>
        ) : null}
        {title ? (
          <h2
            id="modal-title"
            className="text-xl font-semibold tracking-tight text-[var(--color-text-primary)] pr-8"
          >
            {title}
          </h2>
        ) : null}
        {description ? (
          <p
            id="modal-desc"
            className="mt-1 text-sm text-[var(--color-text-muted)]"
          >
            {description}
          </p>
        ) : null}
        <div className={cn(title || description ? "mt-6" : "")}>{children}</div>
      </div>
    </div>,
    document.body,
  );
}
