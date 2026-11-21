/**
 * Transactions — control-ingresos (redesign, T4)
 *
 * Redesigned movements screen: header with search + funnel tools, month
 * selector (period lives in `uiStore.currentMonth`), tappable period summary
 * tiles, quick-type chips with horizontal scroll, MSI purchase/installment
 * views, day-grouped list with 20-row incremental loading, advanced filters
 * sheet, bottom detail sheet, period breakdown, and the loading / empty /
 * error states. Create navigates to the full-screen `/transactions/new`
 * page; edit keeps the shared `TransactionForm` in the detail sheet and
 * persists through `useTransactionSubmit` (the same path as the entry
 * page).
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router";
import { Filter, Search, X } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { ScreenHeader } from "@/components/ui/design/ScreenHeader";
import { IconButton } from "@/components/ui/design/IconButton";
import { SegmentedControl } from "@/components/ui/design/SegmentedControl";
import { Drawer } from "@/components/ui/Drawer";
import { useLiveCards } from "@/hooks/useLiveCards";
import { useLiveTransactions } from "@/hooks/useLiveTransactions";
import { useLiveSettings } from "@/hooks/useLiveSettings";
import { useTransactionsStore } from "@/stores/transactionsStore";
import { useUiStore } from "@/stores/uiStore";
import {
  TransactionForm,
  DeleteTransactionConfirm,
  collectCategories,
  useTransactionSubmit,
  type TransactionFormValues_Output,
} from "@/features/transactions";
import { MonthSelector } from "@/features/transactions/MonthSelector";
import { PeriodSummary } from "@/features/transactions/PeriodSummary";
import { QuickFilters } from "@/features/transactions/QuickFilters";
import { AdvancedFilters } from "@/features/transactions/AdvancedFilters";
import { SearchField } from "@/features/transactions/SearchField";
import { TransactionList } from "@/features/transactions/TransactionList";
import { TransactionDetail } from "@/features/transactions/TransactionDetail";
import { TransactionEmpty } from "@/features/transactions/TransactionEmpty";
import { TransactionSkeleton } from "@/features/transactions/TransactionSkeleton";
import { TransactionError } from "@/features/transactions/TransactionError";
import { PeriodBreakdown } from "@/features/transactions/PeriodBreakdown";
import { filterTransactions } from "@/features/transactions/filterTransactions";
import { computePeriodStats } from "@/features/transactions/computePeriodStats";
import { groupTransactionsByDay } from "@/features/transactions/groupTransactionsByDay";
import {
  EMPTY_FILTER_STATE,
  type AdvancedFilters as AdvancedFilterState,
  type FilterState,
  type MsiView,
  type QuickFilter,
  type TransactionListItem,
} from "@/features/transactions/types";
import { monthIsoToDate } from "@/lib/date/format";
import type { Transaction } from "@/db/schemas/transaction";

type DrawerMode = "closed" | "edit";

const PAGE_SIZE = 20;

const MSI_VIEW_OPTIONS = [
  { value: "installment", label: "Por fecha de cuota" },
  { value: "purchase", label: "Por fecha de compra" },
];

interface AppliedChip {
  id: string;
  label: string;
  clear: () => void;
}

export function Transactions(): React.JSX.Element {
  const navigate = useNavigate();
  const transactions = useLiveTransactions();
  const cards = useLiveCards();
  const settings = useLiveSettings();
  const currentMonth = useUiStore((s) => s.currentMonth);
  const setCurrentMonth = useUiStore((s) => s.setCurrentMonth);
  const remove = useTransactionsStore((s) => s.remove);
  const { updateTransaction } = useTransactionSubmit(settings?.currency ?? "MXN");

  const [drawer, setDrawer] = useState<DrawerMode>("closed");
  const [editing, setEditing] = useState<Transaction | null>(null);
  const [deleting, setDeleting] = useState<Transaction | null>(null);
  const [detail, setDetail] = useState<TransactionListItem | null>(null);
  const [filters, setFilters] = useState<FilterState>(EMPTY_FILTER_STATE);
  const [draftFilters, setDraftFilters] = useState<AdvancedFilterState>(EMPTY_FILTER_STATE.advanced);
  const [searchOpen, setSearchOpen] = useState(false);
  const [filterSheetOpen, setFilterSheetOpen] = useState(false);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [retryNonce, setRetryNonce] = useState(0);

  // Any period or filter change restarts the incremental list at 20 rows.
  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [currentMonth, filters]);

  const currency = settings?.currency ?? "MXN";

  const cardById = useMemo(() => new Map((cards ?? []).map((c) => [c.id, c])), [cards]);

  const computed = useMemo(() => {
    // `retryNonce` is read here on purpose: the "Reintentar" action bumps it
    // to re-run this (otherwise pure and stable) computation after a failed
    // attempt. Without the reference the memo would never recompute.
    void retryNonce;
    if (transactions === undefined || cards === undefined) {
      return { status: "loading" } as const;
    }
    try {
      const items = filterTransactions({ transactions, cards, monthIso: currentMonth, filters });
      const statsValue = computePeriodStats({ transactions, cards, monthIso: currentMonth, filters });
      return { status: "ready", items, stats: statsValue } as const;
    } catch (cause: unknown) {
      return {
        status: "error",
        message:
          cause instanceof Error && cause.message
            ? cause.message
            : "No se pudieron calcular los movimientos.",
      } as const;
    }
  }, [transactions, cards, currentMonth, filters, retryNonce]);

  const visibleGroups = useMemo(() => {
    if (computed.status !== "ready") return [];
    return groupTransactionsByDay(computed.items.slice(0, visibleCount));
  }, [computed, visibleCount]);

  // The breakdown covers the whole period, not just the rows loaded so far.
  const fullGroups = useMemo(() => {
    if (computed.status !== "ready") return [];
    return groupTransactionsByDay(computed.items);
  }, [computed]);

  const hasMore = computed.status === "ready" && computed.items.length > visibleCount;

  function loadMore(): void {
    setVisibleCount((c) => c + PAGE_SIZE);
  }

  function openEdit(tx: Transaction): void {
    setEditing(tx);
    setDrawer("edit");
    setDetail(null);
  }

  // Drawer/Modal re-run their focus-trap effect when `onClose` identity
  // changes, which steals focus from text inputs on every keystroke. The
  // close handlers passed to them must therefore be stable references.
  const closeDrawer = useCallback(() => {
    setDrawer("closed");
    setEditing(null);
  }, []);
  const closeDetailSheet = useCallback(() => setDetail(null), []);
  const closeFilterSheetDrawer = useCallback(() => setFilterSheetOpen(false), []);

  function openCreate(): void {
    // S9: the empty state routes to the full-screen entry page.
    navigate("/transactions/new");
  }

  function onSelectItem(item: TransactionListItem): void {
    setDetail(item);
  }

  function setQuickFilter(next: QuickFilter): void {
    setFilters((f) => ({ ...f, quick: next }));
  }

  function setMsiView(next: string): void {
    setFilters((f) => ({ ...f, msiView: next as MsiView }));
  }

  function openFilterSheet(): void {
    setDraftFilters(filters.advanced);
    setFilterSheetOpen(true);
  }

  function applyFilters(): void {
    setFilters((f) => ({ ...f, advanced: draftFilters }));
    setFilterSheetOpen(false);
  }

  function clearAdvancedFilters(): void {
    setDraftFilters(EMPTY_FILTER_STATE.advanced);
    setFilters((f) => ({ ...f, advanced: EMPTY_FILTER_STATE.advanced }));
  }

  function clearAllFilters(): void {
    setFilters(EMPTY_FILTER_STATE);
    setDraftFilters(EMPTY_FILTER_STATE.advanced);
  }

  async function onConfirmDelete(tx: Transaction): Promise<void> {
    await remove(tx.id);
    setDeleting(null);
    setDetail(null);
  }

  async function onSubmitForm(values: TransactionFormValues_Output): Promise<void> {
    // El form ya entrega `amount` en centavos enteros (ver TransactionForm:
    // passthrough directo de onChangeCents). La persistencia vive en el
    // hook compartido `useTransactionSubmit` (misma vía que la pantalla
    // Nueva transacción).
    if (!editing) return;
    await updateTransaction(editing.id, values);
    closeDrawer();
  }

  const appliedChips = useMemo<AppliedChip[]>(() => {
    const chips: AppliedChip[] = [];
    const adv = filters.advanced;
    if (adv.cardId) {
      const name = cardById.get(adv.cardId)?.bank ?? "Tarjeta";
      chips.push({
        id: "cardId",
        label: name,
        clear: () => setFilters((f) => ({ ...f, advanced: { ...f.advanced, cardId: "" } })),
      });
    }
    if (adv.category) {
      chips.push({
        id: "category",
        label: adv.category,
        clear: () => setFilters((f) => ({ ...f, advanced: { ...f.advanced, category: "" } })),
      });
    }
    if (adv.fromDate || adv.toDate) {
      const label =
        adv.fromDate && adv.toDate
          ? `${adv.fromDate} – ${adv.toDate}`
          : adv.fromDate
            ? `Desde ${adv.fromDate}`
            : `Hasta ${adv.toDate}`;
      chips.push({
        id: "dates",
        label,
        clear: () =>
          setFilters((f) => ({
            ...f,
            advanced: { ...f.advanced, fromDate: "", toDate: "" },
          })),
      });
    }
    return chips;
  }, [filters.advanced, cardById]);

  const monthLabel = format(monthIsoToDate(currentMonth), "MMMM", { locale: es }).toLowerCase();

  return (
    <div className="flex flex-col gap-4">
      <ScreenHeader
        title="Movimientos"
        right={
          <div className="flex items-center gap-2">
            <IconButton
              icon={<Search className="size-5" strokeWidth={2} aria-hidden />}
              aria-label="Buscar"
              onClick={() => setSearchOpen((s) => !s)}
              aria-pressed={searchOpen}
            />
            <IconButton
              icon={<Filter className="size-5" strokeWidth={2} aria-hidden />}
              aria-label="Abrir filtros"
              onClick={openFilterSheet}
              aria-pressed={appliedChips.length > 0}
            />
          </div>
        }
      />

      {searchOpen ? (
        <SearchField
          value={filters.search}
          onChange={(search) => setFilters((f) => ({ ...f, search }))}
          onClose={() => setSearchOpen(false)}
        />
      ) : null}

      <MonthSelector monthIso={currentMonth} onChange={setCurrentMonth} />

      {computed.status === "ready" ? (
        <PeriodSummary
          stats={computed.stats}
          currency={currency}
          active={filters.quick}
          onSelect={setQuickFilter}
        />
      ) : null}

      <QuickFilters value={filters.quick} onChange={setQuickFilter} />

      {filters.quick === "expense_msi" ? (
        <SegmentedControl
          options={MSI_VIEW_OPTIONS}
          value={filters.msiView}
          onChange={setMsiView}
          aria-label="Fecha de los movimientos a meses"
        />
      ) : null}

      {appliedChips.length > 0 ? (
        <div className="flex flex-wrap gap-1.5" aria-label="Filtros aplicados">
          {appliedChips.map((chip) => (
            <button
              key={chip.id}
              type="button"
              onClick={chip.clear}
              aria-label={`Quitar filtro ${chip.label}`}
              className="inline-flex h-11 items-center gap-1.5 rounded-md px-2.5 text-aux font-semibold bg-selected text-primary hover:bg-day transition-colors duration-fast ease-out-soft"
            >
              {chip.label}
              <X className="size-3.5 shrink-0" strokeWidth={2} aria-hidden />
            </button>
          ))}
        </div>
      ) : null}

      {computed.status === "loading" ? (
        <TransactionSkeleton />
      ) : computed.status === "error" ? (
        <TransactionError
          message={computed.message}
          onRetry={() => setRetryNonce((n) => n + 1)}
        />
      ) : visibleGroups.length === 0 ? (
        <TransactionEmpty
          monthLabel={monthLabel}
          onAdd={openCreate}
          filtered={filters.search.trim() !== "" || filters.quick !== "all" || appliedChips.length > 0}
          onClearFilters={clearAllFilters}
        />
      ) : (
        <>
          <TransactionList
            groups={visibleGroups}
            cardById={cardById}
            currency={currency}
            hasMore={hasMore}
            onLoadMore={loadMore}
            onSelect={onSelectItem}
          />
          <PeriodBreakdown groups={fullGroups} cardById={cardById} currency={currency} />
        </>
      )}

      <Drawer
        open={drawer === "edit"}
        onClose={closeDrawer}
        title="Editar transacción"
        description="Edita los datos de la transacción."
      >
        <TransactionForm
          transaction={editing ?? undefined}
          currency={currency}
          cards={cards ?? []}
          suggestedCategories={collectCategories(transactions ?? [])}
          onSubmit={onSubmitForm}
          onCancel={closeDrawer}
        />
      </Drawer>

      <Drawer
        open={detail !== null}
        onClose={closeDetailSheet}
        title="Detalle del movimiento"
      >
        {detail ? (
          <TransactionDetail
            item={detail}
            card={"cardId" in detail.tx && detail.tx.cardId ? cardById.get(detail.tx.cardId) : undefined}
            currency={currency}
            onEdit={() => openEdit(detail.tx)}
            onDelete={() => setDeleting(detail.tx)}
          />
        ) : null}
      </Drawer>

      <DeleteTransactionConfirm
        transaction={deleting}
        currency={currency}
        onConfirm={onConfirmDelete}
        onClose={() => setDeleting(null)}
      />

      <Drawer open={filterSheetOpen} onClose={closeFilterSheetDrawer} title="Filtros">
        <AdvancedFilters
          filters={draftFilters}
          onChange={setDraftFilters}
          onApply={applyFilters}
          onClear={clearAdvancedFilters}
        />
      </Drawer>
    </div>
  );
}
