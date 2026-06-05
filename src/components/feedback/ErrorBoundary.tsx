/**
 * ErrorBoundary — control-ingresos
 *
 * Class component (React requires class for error boundaries). Catches
 * render-time errors anywhere in its subtree and shows a fallback UI
 * with a "Try again" recovery action.
 */
import { Component, type ErrorInfo, type ReactNode } from "react";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/Button";

interface ErrorBoundaryProps {
  fallback?: ReactNode;
  children: ReactNode;
  onError?: (error: Error, info: ErrorInfo) => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  override state: ErrorBoundaryState = {
    hasError: false,
    error: null,
  };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  override componentDidCatch(error: Error, info: ErrorInfo): void {
    // Log to console for now; future: send to telemetry.
    console.error("ErrorBoundary caught:", error, info);
    this.props.onError?.(error, info);
  }

  reset = (): void => {
    this.setState({ hasError: false, error: null });
  };

  override render(): ReactNode {
    if (!this.state.hasError) return this.props.children;

    if (this.props.fallback) return this.props.fallback;

    return (
      <div className="min-h-[100dvh] flex items-center justify-center p-6 bg-[var(--color-canvas)]">
        <div className="glass p-8 max-w-md w-full text-center">
          <div
            className="mx-auto size-12 rounded-full bg-[var(--color-danger)]/10 text-[var(--color-danger)] flex items-center justify-center mb-4"
            aria-hidden
          >
            <AlertTriangle className="size-5" />
          </div>
          <h2 className="text-lg font-semibold text-[var(--color-text-primary)]">
            Algo salió mal
          </h2>
          <p className="mt-2 text-sm text-[var(--color-text-muted)]">
            La app encontró un error inesperado. Podés reintentar o recargar la
            página.
          </p>
          {this.state.error ? (
            <pre className="mt-4 p-3 rounded-[var(--radius-md)] bg-[var(--color-surface-inset)] text-xs text-left text-[var(--color-text-body)] overflow-auto max-h-32">
              {this.state.error.message}
            </pre>
          ) : null}
          <div className="mt-6 flex items-center justify-center gap-2">
            <Button variant="primary" onClick={this.reset}>
              Reintentar
            </Button>
          </div>
        </div>
      </div>
    );
  }
}
