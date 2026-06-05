/**
 * Transactions — control-ingresos
 *
 * F5.4 — Manage transactions. Top-level page that:
 *   1. Shows the live list (TanStack Table with sorting + pagination).
 *   2. Hosts a Drawer with `TransactionForm` for create/edit.
 *   3. Hosts a Modal for delete confirmation.
 *   4. Hosts a filter bar (type pills + date range + card).
 */
import { useMemo, useState } from "react";
import { Plus } from "lucide-react";
import { PageContainer } from "@/components/layout/PageContainer";
import { Button } from "@/components/ui/Button";
import { Drawer } from "@/components/ui/Drawer";
import { useLiveCards } from "@/hooks/useLiveCards";
import { useLiveTransactions } from "@/hooks/useLiveTransactions";
import { useLiveSettings } from "@/hooks/useLiveSettings";
import { useTransactionsStore } from "@/stores/transactionsStore";
import { transactionsRepo } from "@/db/repositories";
import {
  TransactionForm,
  TransactionsTable,
  TransactionFilters,
  DeleteTransactionConfirm,
  EMPTY_FILTERS,
  type TransactionFilters as Filters,
  type TransactionFormValues_Output,
} from "@/features/transactions";
import type { Transaction, MsiTerm } from "@/db/schemas/transaction";

type DrawerMode = "closed" | "create" | "edit";

export function Transactions(): React.JSX.Element {
  const cards = useLiveCards();
  const transactions = useLiveTransactions();
  const settings = useLiveSettings();
  const update = useTransactionsStore((s) => s.update);
  const remove = useTransactionsStore((s) => s.remove);

  const [drawer, setDrawer] = useState<DrawerMode>("closed");
  const [editing, setEditing] = useState<Transaction | null>(null);
  const [deleting, setDeleting] = useState<Transaction | null>(null);
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);

  const currency = settings?.currency ?? "MXN";

  const filtered = useMemo(() => {
    if (!transactions) return undefined;
    return transactions.filter((tx) => {
      if (filters.type !== "all" && tx.type !== filters.type) return false;
      if (filters.cardId) {
        const cardId = "cardId" in tx ? tx.cardId : undefined;
        if (cardId !== filters.cardId) return false;
      }
      if (filters.fromDate) {
        const txDate = tx.date.slice(0, 10);
        if (txDate < filters.fromDate) return false;
      }
      if (filters.toDate) {
        const txDate = tx.date.slice(0, 10);
        if (txDate > filters.toDate) return false;
      }
      return true;
    });
  }, [transactions, filters]);

  function openCreate(): void {
    setEditing(null);
    setDrawer("create");
  }
  function openEdit(tx: Transaction): void {
    setEditing(tx);
    setDrawer("edit");
  }
  function closeDrawer(): void {
    setDrawer("closed");
    setEditing(null);
  }

  async function onSubmitForm(values: TransactionFormValues_Output): Promise<void> {
    const amount = Math.round(values.amount * 100);
    // The discriminated union's type system loses the cardId field on
    // narrowed variants (a quirk of `Omit<Union, K>` over Zod inferred
    // unions). Cast at the boundary — the repo's Zod parse is the
    // final source of truth.
    const repo = transactionsRepo;
    if (editing) {
      if (values.type === "income") {
        await update(editing.id, {
          type: "income",
          amount,
          description: values.description,
          date: values.date,
          category: values.category,
          paymentMethod: values.paymentMethod as "cash" | "transfer",
        } as Partial<Transaction>);
      } else if (values.type === "expense") {
        await update(editing.id, {
          type: "expense",
          amount,
          description: values.description,
          date: values.date,
          category: values.category,
          paymentMethod: values.paymentMethod as
            | "cash"
            | "debit"
            | "credit"
            | "transfer",
          ...(values.cardId ? { cardId: values.cardId } : {}),
        } as Partial<Transaction>);
      } else {
        await update(editing.id, {
          type: "expense_msi",
          amount,
          description: values.description,
          date: values.date,
          category: values.category,
          paymentMethod: "credit",
          cardId: values.cardId ?? "",
          msiMonths: (values.msiMonths ?? 3) as MsiTerm,
          msiStartDate: values.msiStartDate ?? values.date,
        } as Partial<Transaction>);
      }
    } else {
      if (values.type === "income") {
        await repo.create({
          type: "income",
          amount,
          currency,
          description: values.description,
          date: values.date,
          category: values.category,
          paymentMethod: values.paymentMethod as "cash" | "transfer",
        } as Parameters<typeof repo.create>[0]);
      } else if (values.type === "expense") {
        await repo.create({
          type: "expense",
          amount,
          currency,
          description: values.description,
          date: values.date,
          category: values.category,
          paymentMethod: values.paymentMethod as
            | "cash"
            | "debit"
            | "credit"
            | "transfer",
          ...(values.cardId ? { cardId: values.cardId } : {}),
        } as Parameters<typeof repo.create>[0]);
      } else {
        if (!values.cardId || !values.msiMonths || !values.msiStartDate) {
          // Schema-level validation should have caught this. Bail.
          return;
        }
        await repo.create({
          type: "expense_msi",
          amount,
          currency,
          description: values.description,
          date: values.date,
          category: values.category,
          paymentMethod: "credit",
          cardId: values.cardId,
          msiMonths: values.msiMonths,
          msiStartDate: values.msiStartDate,
        } as Parameters<typeof repo.create>[0]);
      }
    }
    closeDrawer();
  }

  async function onConfirmDelete(tx: Transaction): Promise<void> {
    await remove(tx.id);
    setDeleting(null);
  }

  return (
    <PageContainer
      title="Transacciones"
      description="Ingresos, gastos directos y compras a meses sin intereses."
      actions={
        <Button
          type="button"
          variant="primary"
          leftIcon={<Plus className="size-4" aria-hidden />}
          onClick={openCreate}
        >
          Nueva transacción
        </Button>
      }
    >
      <TransactionFilters value={filters} onChange={setFilters} />
      <TransactionsTable
        data={filtered}
        cards={cards ?? []}
        currency={currency}
        onEdit={openEdit}
        onDelete={setDeleting}
      />

      <Drawer
        open={drawer !== "closed"}
        onClose={closeDrawer}
        title={drawer === "edit" ? "Editar transacción" : "Nueva transacción"}
        description={
          drawer === "edit"
            ? "Modificá los datos de la transacción."
            : "Registrá un ingreso, gasto o compra a MSI."
        }
      >
        <TransactionForm
          transaction={editing ?? undefined}
          currency={currency}
          onSubmit={onSubmitForm}
          onCancel={closeDrawer}
        />
      </Drawer>

      <DeleteTransactionConfirm
        transaction={deleting}
        currency={currency}
        onConfirm={onConfirmDelete}
        onClose={() => setDeleting(null)}
      />
    </PageContainer>
  );
}
