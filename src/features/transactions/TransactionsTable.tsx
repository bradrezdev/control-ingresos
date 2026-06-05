/**
 * TransactionsTable — control-ingresos
 *
 * TanStack Table v8 list of transactions with sorting, pagination,
 * and per-row actions (edit + delete). Pure presentation — receives
 * the filtered list, emits edit/delete callbacks.
 *
 * Columns: Fecha, Descripción, Tipo, Categoría, Monto, Método, Tarjeta, Acciones.
 * MSI rows show a "X/Y meses" badge in the Descripción column.
 */
import { useMemo, useState } from "react";
import {
  type ColumnDef,
  type SortingState,
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { ArrowUpDown, Pencil, Trash2, ChevronLeft, ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/feedback/EmptyState";
import { Receipt } from "lucide-react";
import { formatCurrency } from "@/lib/money/format";
import { formatDate } from "@/lib/date/format";
import { centsToDisplay } from "@/lib/money/format";
import { cn } from "@/lib/cn";
import type { Card } from "@/db/schemas/card";
import type {
  MsiExpense,
  Transaction,
} from "@/db/schemas/transaction";

export interface TransactionsTableProps {
  data: Transaction[] | undefined;
  cards: Card[];
  currency: string;
  loading?: boolean;
  onEdit: (tx: Transaction) => void;
  onDelete: (tx: Transaction) => void;
}

const PAGE_SIZE_OPTIONS = [10, 25, 50] as const;

const typeVariant: Record<Transaction["type"], "success" | "danger" | "primary"> = {
  income: "success",
  expense: "danger",
  expense_msi: "primary",
};

const typeLabel: Record<Transaction["type"], string> = {
  income: "Ingreso",
  expense: "Gasto",
  expense_msi: "MSI",
};

const methodLabel: Record<Transaction["paymentMethod"], string> = {
  cash: "Efectivo",
  debit: "Débito",
  credit: "Crédito",
  transfer: "Transferencia",
};

export function TransactionsTable({
  data,
  cards,
  currency,
  loading = false,
  onEdit,
  onDelete,
}: TransactionsTableProps): React.JSX.Element {
  const [sorting, setSorting] = useState<SortingState>([
    { id: "date", desc: true },
  ]);
  const [pageSize, setPageSize] = useState<number>(10);
  const [pageIndex, setPageIndex] = useState(0);

  const cardById = useMemo(
    () => new Map(cards.map((c) => [c.id, c])),
    [cards],
  );

  const columns = useMemo<ColumnDef<Transaction>[]>(
    () => [
      {
        id: "date",
        accessorFn: (tx) => tx.date,
        header: ({ column }) => (
          <SortHeader
            label="Fecha"
            sorted={column.getIsSorted()}
            onClick={() => column.toggleSorting()}
          />
        ),
        cell: ({ row }) => (
          <span className="text-sm text-[var(--color-text-body)] whitespace-nowrap">
            {formatDate(row.original.date)}
          </span>
        ),
      },
      {
        id: "description",
        accessorFn: (tx) => tx.description,
        header: "Descripción",
        cell: ({ row }) => {
          const tx = row.original;
          const isMsi = tx.type === "expense_msi";
          return (
            <div className="flex flex-col gap-1 max-w-xs">
              <span className="text-sm text-[var(--color-text-body)] truncate">
                {tx.description}
              </span>
              {isMsi ? (
                <Badge variant="info" className="self-start">
                  {tx.msiMonths}/{tx.msiMonths} meses
                </Badge>
              ) : null}
            </div>
          );
        },
      },
      {
        id: "type",
        accessorFn: (tx) => tx.type,
        header: "Tipo",
        cell: ({ row }) => (
          <Badge variant={typeVariant[row.original.type]}>
            {typeLabel[row.original.type]}
          </Badge>
        ),
      },
      {
        id: "category",
        accessorFn: (tx) => tx.category ?? "",
        header: "Categoría",
        cell: ({ row }) => (
          <span className="text-sm text-[var(--color-text-muted)]">
            {row.original.category ?? "—"}
          </span>
        ),
      },
      {
        id: "amount",
        accessorFn: (tx) => centsToDisplay(tx.amount),
        header: ({ column }) => (
          <SortHeader
            label="Monto"
            sorted={column.getIsSorted()}
            onClick={() => column.toggleSorting()}
            align="right"
          />
        ),
        cell: ({ row }) => {
          const tx = row.original;
          const isExpense = tx.type !== "income";
          return (
            <span
              className={cn(
                "text-sm font-semibold whitespace-nowrap tabular-nums",
                isExpense
                  ? "text-[var(--color-danger)]"
                  : "text-[var(--color-success)]",
              )}
            >
              {isExpense ? "−" : "+"}
              {formatCurrency(tx.amount, currency)}
            </span>
          );
        },
      },
      {
        id: "method",
        accessorFn: (tx) => tx.paymentMethod,
        header: "Método",
        cell: ({ row }) => (
          <span className="text-sm text-[var(--color-text-body)]">
            {methodLabel[row.original.paymentMethod]}
          </span>
        ),
      },
      {
        id: "card",
        accessorFn: (tx) => {
          if (!("cardId" in tx) || !tx.cardId) return "";
          return cardById.get(tx.cardId)?.bank ?? "";
        },
        header: "Tarjeta",
        cell: ({ row }) => {
          const tx = row.original;
          if (!("cardId" in tx) || !tx.cardId) {
            return (
              <span className="text-sm text-[var(--color-text-muted)]">—</span>
            );
          }
          const card = cardById.get(tx.cardId);
          return (
            <span className="text-sm text-[var(--color-text-body)]">
              {card ? `${card.bank} •••• ${card.last4}` : "—"}
            </span>
          );
        },
      },
      {
        id: "actions",
        header: "",
        enableSorting: false,
        cell: ({ row }) => (
          <div className="flex items-center gap-1 justify-end">
            <button
              type="button"
              aria-label={`Editar ${row.original.description}`}
              onClick={() => onEdit(row.original)}
              className="size-8 rounded-full flex items-center justify-center text-[var(--color-text-muted)] hover:bg-[var(--color-surface-inset)] hover:text-[var(--color-text-body)] transition-colors"
            >
              <Pencil className="size-3.5" aria-hidden />
            </button>
            <button
              type="button"
              aria-label={`Eliminar ${row.original.description}`}
              onClick={() => onDelete(row.original)}
              className="size-8 rounded-full flex items-center justify-center text-[var(--color-text-muted)] hover:bg-[var(--color-danger)]/10 hover:text-[var(--color-danger)] transition-colors"
            >
              <Trash2 className="size-3.5" aria-hidden />
            </button>
          </div>
        ),
      },
    ],
    [cardById, currency, onEdit, onDelete],
  );

  const table = useReactTable({
    data: data ?? [],
    columns,
    state: { sorting, pagination: { pageIndex, pageSize } },
    onSortingChange: setSorting,
    onPaginationChange: (updater) => {
      const next =
        typeof updater === "function"
          ? updater({ pageIndex, pageSize })
          : updater;
      setPageIndex(next.pageIndex);
      setPageSize(next.pageSize);
    },
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  });

  if (loading || data === undefined) {
    return (
      <div className="space-y-2" role="status" aria-label="Cargando transacciones">
        {[0, 1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-12 w-full" rounded="md" />
        ))}
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <EmptyState
        icon={<Receipt className="size-5" aria-hidden />}
        title="No hay transacciones"
        description="Hacé click en 'Nueva transacción' para registrar tu primer movimiento."
      />
    );
  }

  const rows = table.getRowModel().rows;
  const totalPages = table.getPageCount();
  const currentPage = pageIndex + 1;

  return (
    <div className="flex flex-col gap-3">
      <div className="overflow-x-auto rounded-[var(--radius-lg)] border border-[var(--color-border-subtle)]">
        <table className="w-full text-sm">
          <thead className="bg-[var(--color-surface-inset)]">
            {table.getHeaderGroups().map((hg) => (
              <tr key={hg.id} className="border-b border-[var(--color-border-subtle)]">
                {hg.headers.map((header) => (
                  <th
                    key={header.id}
                    scope="col"
                    className="text-left text-xs font-semibold uppercase tracking-wide text-[var(--color-text-muted)] px-4 py-3"
                  >
                    {header.isPlaceholder
                      ? null
                      : flexRender(header.column.columnDef.header, header.getContext())}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr
                key={row.id}
                className="border-b border-[var(--color-border-subtle)] last:border-0 hover:bg-[var(--color-surface-inset)]/50 transition-colors"
              >
                {row.getVisibleCells().map((cell) => (
                  <td key={cell.id} className="px-4 py-3 align-middle">
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-[var(--color-text-muted)]">
        <div className="flex items-center gap-2">
          <span>Filas por página:</span>
          <select
            value={pageSize}
            onChange={(e) => {
              setPageSize(Number(e.target.value));
              setPageIndex(0);
            }}
            className="h-8 px-2 text-sm rounded-[var(--radius-sm)] bg-[var(--color-surface-inset)] border border-[var(--color-border-subtle)] focus:outline-none focus:border-[var(--color-border-focus)]"
            aria-label="Filas por página"
          >
            {PAGE_SIZE_OPTIONS.map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-2">
          <span>
            Página {currentPage} de {totalPages || 1}
          </span>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setPageIndex((p) => Math.max(0, p - 1))}
            disabled={pageIndex === 0}
            aria-label="Página anterior"
          >
            <ChevronLeft className="size-4" aria-hidden />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() =>
              setPageIndex((p) => Math.min(totalPages - 1, p + 1))
            }
            disabled={pageIndex >= totalPages - 1}
            aria-label="Página siguiente"
          >
            <ChevronRight className="size-4" aria-hidden />
          </Button>
        </div>
      </div>
    </div>
  );
}

function SortHeader({
  label,
  sorted,
  onClick,
  align = "left",
}: {
  label: string;
  sorted: false | "asc" | "desc";
  onClick: () => void;
  align?: "left" | "right";
}): React.JSX.Element {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1.5",
        "text-xs font-semibold uppercase tracking-wide",
        "text-[var(--color-text-muted)] hover:text-[var(--color-text-body)]",
        "transition-colors",
        align === "right" && "ml-auto",
      )}
    >
      {label}
      <ArrowUpDown
        className={cn(
          "size-3",
          sorted && "text-[var(--color-primary)]",
          sorted === "desc" && "rotate-180",
        )}
        aria-hidden
      />
    </button>
  );
}

// Re-export MsiExpense for type consumers downstream.
export type { MsiExpense };
