/**
 * PaymentCalendar — control-ingresos
 *
 * F6.2 — Dashboard widget that lists the cards with a pending payment
 * for the current month. For each card:
 *   - paymentDate = computeCutCycle(card, today).paymentDate
 *   - amount = computePaymentForCurrentMonth(card.id, transactions, today)
 *
 * If amount === 0 the card is omitted. The footer shows the total of
 * the month. Uses TanStack Table for the row list.
 */
import { useMemo, useState } from "react";
import {
  type ColumnDef,
  type SortingState,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { ArrowUpDown, CalendarDays } from "lucide-react";
import { GlassCard } from "@/components/ui/GlassCard";
import { Skeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/feedback/EmptyState";
import { formatDate } from "@/lib/date/format";
import { formatCurrency } from "@/lib/money/format";
import { useLiveCards } from "@/hooks/useLiveCards";
import { useLiveTransactions } from "@/hooks/useLiveTransactions";
import { useLiveSettings } from "@/hooks/useLiveSettings";
import { computeCutCycle } from "@/engine/cycle";
import { computePaymentForCurrentMonth } from "@/engine/budget";
import type { Card } from "@/db/schemas/card";
import { cn } from "@/lib/cn";

interface Row {
  card: Card;
  paymentDate: Date;
  amount: number;
}

export function PaymentCalendar(): React.JSX.Element {
  const cards = useLiveCards();
  const transactions = useLiveTransactions();
  const settings = useLiveSettings();
  const [sorting, setSorting] = useState<SortingState>([
    { id: "paymentDate", desc: false },
  ]);

  const today = useMemo(() => new Date(), []);
  const currency = settings?.currency ?? "MXN";

  const rows = useMemo<Row[] | null>(() => {
    if (!cards || !transactions) return null;
    const list: Row[] = [];
    for (const card of cards) {
      const amount = computePaymentForCurrentMonth(
        card.id,
        transactions,
        today,
      );
      if (amount <= 0) continue;
      const cycle = computeCutCycle(card, today);
      list.push({ card, paymentDate: cycle.paymentDate, amount });
    }
    return list;
  }, [cards, transactions, today]);

  const total = useMemo(
    () => (rows ?? []).reduce((acc, r) => acc + r.amount, 0),
    [rows],
  );

  const columns = useMemo<ColumnDef<Row>[]>(
    () => [
      {
        id: "card",
        accessorFn: (r) => r.card.bank,
        header: "Tarjeta",
        cell: ({ row }) => (
          <div className="flex flex-col">
            <span className="text-sm font-medium text-[var(--color-text-body)]">
              {row.original.card.bank}
            </span>
            <span className="text-xs text-[var(--color-text-muted)] tabular-nums">
              •••• {row.original.card.last4}
            </span>
          </div>
        ),
      },
      {
        id: "paymentDate",
        accessorFn: (r) => r.paymentDate.getTime(),
        header: ({ column }) => (
          <button
            type="button"
            onClick={() => column.toggleSorting()}
            className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-[var(--color-text-muted)] hover:text-[var(--color-text-body)]"
          >
            Fecha de pago
            <ArrowUpDown
              className={cn(
                "size-3",
                column.getIsSorted() && "text-[var(--color-primary)]",
                column.getIsSorted() === "desc" && "rotate-180",
              )}
              aria-hidden
            />
          </button>
        ),
        cell: ({ row }) => (
          <span className="text-sm text-[var(--color-text-body)] whitespace-nowrap">
            {formatDate(row.original.paymentDate)}
          </span>
        ),
      },
      {
        id: "amount",
        accessorFn: (r) => r.amount,
        header: "Monto",
        cell: ({ row }) => (
          <span className="text-sm font-semibold tabular-nums text-[var(--color-text-body)]">
            {formatCurrency(row.original.amount, currency)}
          </span>
        ),
      },
    ],
    [currency],
  );

  const table = useReactTable({
    data: rows ?? [],
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  if (rows === null) {
    return <WidgetSkeleton />;
  }

  if (rows.length === 0) {
    return (
      <GlassCard className="p-6 h-full flex flex-col">
        <h2 className="text-base font-semibold tracking-tight text-[var(--color-text-primary)]">
          Próximos pagos del mes
        </h2>
        <div className="flex-1 flex items-center justify-center">
          <EmptyState
            icon={<CalendarDays className="size-5" aria-hidden />}
            title="No tenés pagos pendientes este mes"
            description="Cuando registres gastos con tarjeta, aparecerán acá."
          />
        </div>
      </GlassCard>
    );
  }

  return (
    <GlassCard className="p-6 h-full flex flex-col">
      <h2 className="text-base font-semibold tracking-tight text-[var(--color-text-primary)]">
        Próximos pagos del mes
      </h2>

      <div className="mt-4 -mx-2 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            {table.getHeaderGroups().map((hg) => (
              <tr
                key={hg.id}
                className="border-b border-[var(--color-border-subtle)]"
              >
                {hg.headers.map((h) => (
                  <th
                    key={h.id}
                    scope="col"
                    className="text-left px-2 py-2 first:pl-2"
                  >
                    {h.isPlaceholder
                      ? null
                      : flexRender(h.column.columnDef.header, h.getContext())}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.map((row) => (
              <tr
                key={row.id}
                className="border-b border-[var(--color-border-subtle)]/50 last:border-0"
              >
                {row.getVisibleCells().map((cell) => (
                  <td key={cell.id} className="px-2 py-2.5 first:pl-2">
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-auto pt-4 border-t border-[var(--color-border-subtle)] flex items-center justify-between">
        <span className="text-xs uppercase tracking-wide text-[var(--color-text-muted)] font-semibold">
          Total del mes
        </span>
        <span className="text-2xl font-semibold tabular-nums text-[var(--color-text-primary)]">
          {formatCurrency(total, currency)}
        </span>
      </div>
    </GlassCard>
  );
}

function WidgetSkeleton(): React.JSX.Element {
  return (
    <GlassCard className="p-6 h-full">
      <Skeleton className="h-4 w-40" rounded="sm" />
      <div className="mt-4 space-y-2">
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="h-10 w-full" rounded="md" />
        ))}
      </div>
    </GlassCard>
  );
}
