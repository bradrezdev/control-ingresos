import type { ReactNode } from "react";
import { NavLink, Link } from "react-router";
import { Home, Receipt, Plus, CreditCard, Repeat } from "lucide-react";
import { cn } from "@/lib/cn";

interface AppShellProps {
  children: ReactNode;
}

const NAV_ITEMS = [
  { to: "/", label: "Inicio", icon: Home, end: true },
  { to: "/transactions", label: "Movimientos", icon: Receipt, end: false },
  { to: "/cards", label: "Tarjetas", icon: CreditCard, end: false },
  { to: "/fixed-payments", label: "Fijos", icon: Repeat, end: false },
] as const;

/**
 * Mobile-first app shell.
 *
 * - The desktop sidebar is intentionally removed (S13): the prototype hides it
 *   and the theme toggle remains reachable from Settings.
 * - A 72px floating bottom nav is always visible and contains the five global
 *   destinations: Inicio, Movimientos, +, Tarjetas, Fijos.
 * - The main column is centered at 430px with horizontal padding and enough
 *   bottom clearance for the floating nav.
 */
export function AppShell({ children }: AppShellProps): React.JSX.Element {
  return (
    <div className="min-h-[100dvh] bg-canvas text-body">
      <main className="app-main">{children}</main>
      <BottomNav />
    </div>
  );
}

function BottomNav(): React.JSX.Element {
  return (
    <nav
      className={cn(
        "bottom-nav",
        "flex items-center justify-around",
        "bg-surface shadow-nav",
      )}
      aria-label="Navegación principal"
    >
      {NAV_ITEMS.slice(0, 2).map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.end}
          className={({ isActive }) =>
            cn(
              "group relative flex flex-col items-center justify-center",
              "min-w-[56px] min-h-[48px] px-1.5 py-1 rounded-3xl",
              "transition-colors duration-fast ease-out-soft",
              "focus-visible:outline-offset-2",
              isActive ? "text-primary" : "text-muted hover:text-body",
            )
          }
        >
          {({ isActive }) => (
            <>
              <span
                className={cn(
                  "inline-flex items-center justify-center",
                  "h-[30px] px-4 rounded-[15px]",
                  "transition-colors duration-fast ease-out-soft",
                  isActive ? "bg-selected" : "bg-transparent",
                )}
              >
                <item.icon className="size-5" aria-hidden strokeWidth={2} />
              </span>
              <span className="mt-0.5 text-[11px] font-semibold leading-tight">
                {item.label}
              </span>
            </>
          )}
        </NavLink>
      ))}

      <Link
        to="/transactions"
        state={{ openCreate: true }}
        aria-label="Nueva transacción"
        className={cn(
          "flex items-center justify-center",
          "size-14 rounded-full",
          "bg-button text-hero-text",
          "shadow-cta",
          "-mt-[22px]",
          "transition-transform duration-fast ease-out-soft",
          "active:scale-95",
          "focus-visible:outline-offset-2",
        )}
      >
        <Plus className="size-6" aria-hidden strokeWidth={2} />
      </Link>

      {NAV_ITEMS.slice(2).map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.end}
          className={({ isActive }) =>
            cn(
              "group relative flex flex-col items-center justify-center",
              "min-w-[56px] min-h-[48px] px-1.5 py-1 rounded-3xl",
              "transition-colors duration-fast ease-out-soft",
              "focus-visible:outline-offset-2",
              isActive ? "text-primary" : "text-muted hover:text-body",
            )
          }
        >
          {({ isActive }) => (
            <>
              <span
                className={cn(
                  "inline-flex items-center justify-center",
                  "h-[30px] px-4 rounded-[15px]",
                  "transition-colors duration-fast ease-out-soft",
                  isActive ? "bg-selected" : "bg-transparent",
                )}
              >
                <item.icon className="size-5" aria-hidden strokeWidth={2} />
              </span>
              <span className="mt-0.5 text-[11px] font-semibold leading-tight">
                {item.label}
              </span>
            </>
          )}
        </NavLink>
      ))}
    </nav>
  );
}
