/**
 * Drawer — control-ingresos
 *
 * Slide-in panel from the right. On desktop it's a 480px panel; on
 * mobile it slides up from the bottom as a full-height sheet (per
 * onano-design-system "regla de sheets").
 *
 * Used for transaction forms and card/debt editors.
 */
import { useEffect, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { cn } from "@/lib/cn";

export interface DrawerProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  children: ReactNode;
  hideCloseButton?: boolean;
}

export function Drawer({
  open,
  onClose,
  title,
  description,
  children,
  hideCloseButton = false,
}: DrawerProps): React.JSX.Element | null {
  const panelRef = useRef<HTMLDivElement | null>(null);
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

    panelRef.current?.focus();

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
      className="fixed inset-0 z-50 flex justify-end"
      role="presentation"
    >
      <button
        type="button"
        aria-label="Cerrar drawer"
        onClick={onClose}
        className="absolute inset-0 bg-black/40 backdrop-blur-sm cursor-default"
        tabIndex={-1}
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? "drawer-title" : undefined}
        aria-describedby={description ? "drawer-desc" : undefined}
        tabIndex={-1}
        className={cn(
          "relative w-full sm:max-w-md md:max-w-lg h-full",
          "glass",
          "rounded-l-[var(--radius-lg)] sm:rounded-l-[var(--radius-lg)] rounded-none",
          "p-6 md:p-8",
          "overflow-y-auto",
          "animate-in slide-in-from-right duration-300",
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
            id="drawer-title"
            className="text-xl font-semibold tracking-tight text-[var(--color-text-primary)] pr-8"
          >
            {title}
          </h2>
        ) : null}
        {description ? (
          <p
            id="drawer-desc"
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
