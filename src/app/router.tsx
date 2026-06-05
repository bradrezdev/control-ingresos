import { createBrowserRouter, Navigate, Outlet } from "react-router";
import { AppShell } from "@/components/layout/Sidebar";
import { Dashboard } from "@/pages/Dashboard";
import { Transactions } from "@/pages/Transactions";
import { Cards } from "@/pages/Cards";
import { Debts } from "@/pages/Debts";
import { Settings } from "@/pages/Settings";

function NotFound(): React.JSX.Element {
  return (
    <div className="p-8">
      <div className="glass p-8 max-w-md mx-auto text-center">
        <h1 className="text-3xl font-semibold text-[var(--color-text-primary)]">404</h1>
        <p className="mt-2 text-[var(--color-text-muted)]">Página no encontrada</p>
      </div>
    </div>
  );
}

export const router = createBrowserRouter([
  {
    path: "/",
    element: (
      <AppShell>
        <Outlet />
      </AppShell>
    ),
    children: [
      { index: true, element: <Dashboard /> },
      { path: "transactions", element: <Transactions /> },
      { path: "cards", element: <Cards /> },
      { path: "debts", element: <Debts /> },
      { path: "settings", element: <Settings /> },
      { path: "*", element: <Navigate to="/" replace /> },
    ],
  },
  { path: "*", element: <NotFound /> },
]);
