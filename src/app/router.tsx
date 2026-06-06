import { lazy, Suspense } from "react";
import { createBrowserRouter, Navigate, Outlet } from "react-router";
import { AppShell } from "@/components/layout/Sidebar";
import { PageSkeleton } from "@/components/feedback/PageSkeleton";

const Dashboard = lazy(() =>
  import("@/pages/Dashboard").then((m) => ({ default: m.Dashboard })),
);
const Transactions = lazy(() =>
  import("@/pages/Transactions").then((m) => ({ default: m.Transactions })),
);
const Cards = lazy(() =>
  import("@/pages/Cards").then((m) => ({ default: m.Cards })),
);
const FixedPayments = lazy(() =>
  import("@/pages/FixedPayments").then((m) => ({ default: m.FixedPayments })),
);
const Settings = lazy(() =>
  import("@/pages/Settings").then((m) => ({ default: m.Settings })),
);

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

function LazyPage({ children }: { children: React.ReactNode }): React.JSX.Element {
  return <Suspense fallback={<PageSkeleton />}>{children}</Suspense>;
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
      {
        index: true,
        element: (
          <LazyPage>
            <Dashboard />
          </LazyPage>
        ),
      },
      {
        path: "transactions",
        element: (
          <LazyPage>
            <Transactions />
          </LazyPage>
        ),
      },
      {
        path: "cards",
        element: (
          <LazyPage>
            <Cards />
          </LazyPage>
        ),
      },
      {
        path: "fixed-payments",
        element: (
          <LazyPage>
            <FixedPayments />
          </LazyPage>
        ),
      },
      {
        path: "settings",
        element: (
          <LazyPage>
            <Settings />
          </LazyPage>
        ),
      },
      { path: "*", element: <Navigate to="/" replace /> },
    ],
  },
  { path: "*", element: <NotFound /> },
]);
