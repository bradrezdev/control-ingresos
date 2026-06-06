import type { ReactNode } from "react";
import { NavLink } from "react-router";
import {
  LayoutDashboard,
  Receipt,
  CreditCard,
  Repeat,
  Settings as SettingsIcon,
} from "lucide-react";
import { cn } from "@/lib/cn";
import { ThemeToggle } from "@/components/ui/ThemeToggle";

const NAV_ITEMS = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/transactions", label: "Transacciones", icon: Receipt, end: false },
  { to: "/cards", label: "Tarjetas", icon: CreditCard, end: false },
  { to: "/fixed-payments", label: "Pagos fijos", icon: Repeat, end: false },
  { to: "/settings", label: "Ajustes", icon: SettingsIcon, end: false },
] as const;

interface AppShellProps {
  children: ReactNode;
}

export function AppShell({ children }: AppShellProps): React.JSX.Element {
  return (
    <div className="min-h-[100dvh] flex flex-col md:flex-row bg-[var(--color-canvas)] text-[var(--color-text-body)]">
      <Sidebar />
      <main className="flex-1 min-w-0 pb-20 md:pb-0">{children}</main>
      <BottomNav />
    </div>
  );
}

function Sidebar(): React.JSX.Element {
  return (
    <aside
      className={cn(
        "hidden md:flex md:flex-col",
        "w-64 shrink-0",
        "border-r border-[var(--color-border-subtle)]",
        "bg-[var(--color-canvas)]",
        "px-4 py-6",
        "sticky top-0 h-[100dvh]",
      )}
    >
      <div className="px-3 mb-8">
        <h1 className="text-lg font-semibold tracking-tight text-[var(--color-text-primary)]">
          Ingresos
        </h1>
        <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
          Local-first tracking
        </p>
      </div>

      <nav className="flex flex-col gap-1" aria-label="Navegación principal">
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) =>
              cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-[var(--radius-md)]",
                "text-sm font-medium",
                "transition-colors duration-[var(--duration-fast)] ease-[var(--ease-out-soft)]",
                isActive
                  ? "bg-[var(--color-primary)] text-[var(--color-text-inverse)]"
                  : "text-[var(--color-text-body)] hover:bg-[var(--color-surface-inset)]",
              )
            }
          >
            <item.icon className="size-4 shrink-0" aria-hidden />
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="mt-auto px-3 pt-6 flex flex-col gap-2">
        <span className="text-[10px] uppercase tracking-wide text-[var(--color-text-muted)] font-semibold">
          Tema
        </span>
        <ThemeToggle size="sm" />
      </div>
    </aside>
  );
}

function BottomNav(): React.JSX.Element {
  return (
    <nav
      className={cn(
        "md:hidden",
        "fixed bottom-0 inset-x-0 z-40",
        "glass",
        "flex items-center justify-around",
        "px-2 py-2",
        "pb-[max(0.5rem,env(safe-area-inset-bottom))]",
      )}
      aria-label="Navegación inferior"
    >
      {NAV_ITEMS.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.end}
          className={({ isActive }) =>
            cn(
              "flex flex-col items-center justify-center",
              "min-w-[44px] min-h-[44px] px-3 py-1.5",
              "rounded-[var(--radius-md)]",
              "transition-colors duration-[var(--duration-fast)]",
              isActive
                ? "text-[var(--color-primary)]"
                : "text-[var(--color-text-muted)]",
            )
          }
        >
          <item.icon className="size-5" aria-hidden />
          <span className="text-[10px] mt-0.5 font-medium">{item.label}</span>
        </NavLink>
      ))}
    </nav>
  );
}
