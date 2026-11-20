import type { ReactNode } from "react";
import { Link } from "react-router";
import { ArrowLeft } from "lucide-react";
import { cn } from "@/lib/cn";

export interface ScreenHeaderProps {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  right?: ReactNode;
  back?: { to: string; label?: string };
}

/**
 * Screen header with the redesign typography scale.
 *
 * Equivalent to the prototype's page head: 26/800 primary title,
 * optional 13px muted eyebrow/subtitle, a 44×44 back button, and a
 * right-hand slot (usually `<SettingsButton />`).
 */
export function ScreenHeader({
  eyebrow,
  title,
  subtitle,
  right,
  back,
}: ScreenHeaderProps): React.JSX.Element {
  return (
    <header className="flex items-center gap-3 min-h-11">
      {back ? (
        <Link
          to={back.to}
          aria-label={back.label ?? "Volver"}
          className={cn(
            "inline-flex size-11 shrink-0 items-center justify-center rounded-full",
            "bg-surface text-primary",
            "transition-colors duration-fast ease-out-soft",
            "hover:bg-day",
          )}
        >
          <ArrowLeft className="size-5" aria-hidden strokeWidth={2} />
        </Link>
      ) : null}

      <div className="flex-1 min-w-0">
        {eyebrow ? (
          <p className="text-aux text-muted mb-0.5">{eyebrow}</p>
        ) : null}
        <h1 className="text-display font-extrabold text-primary">{title}</h1>
        {subtitle ? (
          <p className="text-aux text-muted mt-0.5">{subtitle}</p>
        ) : null}
      </div>

      {right ? <div className="shrink-0">{right}</div> : null}
    </header>
  );
}
