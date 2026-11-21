/**
 * NewTransaction — control-ingresos (redesign, T7)
 *
 * Full-screen "Nueva transacción" entry (prototype `#entry-screen`,
 * REDESIGN §Fase 2 punto 9). Mounted at `/transactions/new` OUTSIDE the
 * AppShell on purpose: the prototype hides the floating nav on this
 * screen (`body[data-page=nueva-transaccion] .mobile-nav { display:none }`),
 * so the route lives as a sibling of the shell route in the router.
 *
 * The page owns only the chrome (close button + centered 17/700 title)
 * and the loading skeleton; the form itself is the shared
 * `TransactionForm` and persistence goes through `useTransactionSubmit`
 * — the exact same path as the Movimientos edit sheet.
 */
import { useLocation, useNavigate } from "react-router";
import { X } from "lucide-react";
import { IconButton } from "@/components/ui/design/IconButton";
import {
  TransactionForm,
  TransactionFormSkeleton,
  collectCategories,
  useTransactionSubmit,
  type TransactionFormValues_Output,
} from "@/features/transactions";
import { useLiveCards } from "@/hooks/useLiveCards";
import { useLiveSettings } from "@/hooks/useLiveSettings";
import { useLiveTransactions } from "@/hooks/useLiveTransactions";

export function NewTransaction(): React.JSX.Element {
  const navigate = useNavigate();
  const location = useLocation();
  const cards = useLiveCards();
  const settings = useLiveSettings();
  const transactions = useLiveTransactions();
  const { createTransaction } = useTransactionSubmit(
    settings?.currency ?? "MXN",
  );

  const currency = settings?.currency ?? "MXN";
  const ready =
    settings !== undefined && cards !== undefined && transactions !== undefined;

  function goBack(): void {
    // Direct loads (fresh tab) have no history to go back to; fall back
    // to the movements screen instead of leaving the app.
    if (location.key === "default") {
      navigate("/transactions", { replace: true });
    } else {
      navigate(-1);
    }
  }

  async function handleCreate(
    values: TransactionFormValues_Output,
  ): Promise<void> {
    await createTransaction(values);
    goBack();
  }

  return (
    <div className="flex min-h-dvh flex-col bg-canvas text-body">
      <main className="mx-auto flex w-full max-w-[430px] flex-1 flex-col px-4 pb-[max(24px,env(safe-area-inset-bottom))] pt-3.5">
        <header className="flex min-h-11 items-center gap-2">
          <IconButton
            icon={<X className="size-5" strokeWidth={2} aria-hidden />}
            aria-label="Cerrar"
            onClick={goBack}
          />
          <h1 className="flex-1 text-center text-title font-bold text-body">
            Nueva transacción
          </h1>
          {/* Spacer: keeps the title optically centered (prototype .entry-head). */}
          <span aria-hidden className="w-11" />
        </header>

        {ready ? (
          <TransactionForm
            currency={currency}
            cards={cards}
            suggestedCategories={collectCategories(transactions ?? [])}
            onSubmit={handleCreate}
          />
        ) : (
          <TransactionFormSkeleton />
        )}
      </main>
    </div>
  );
}
