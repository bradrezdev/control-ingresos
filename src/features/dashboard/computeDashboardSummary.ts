import { format, getDaysInMonth } from "date-fns";
import { es } from "date-fns/locale";
import type { Card, FixedPayment, Transaction } from "@/db/schemas";
import {
  computeMonthlySpending,
  computeFixedPaymentsForMonth,
  computePaymentForCurrentMonth,
} from "@/engine/budget";
import { computeActivePaymentDate } from "@/engine/cycle";
import { isFixedPaymentDueThisMonth } from "@/engine/fixedPayments";
import { summarizeMsiByTenure } from "@/engine/msiSummary";
import { addMonths } from "@/lib/date/cycle";
import { toIsoDateString } from "@/lib/date/format";
import type {
  DashboardData,
  DashboardSummary,
  SelectedMonth,
  FixedPaymentRow,
  CardPaymentRow,
  MsiGroupRow,
  RecentTransactionRow,
} from "./types";

const CATEGORY_PALETTE = [
  { name: "violet", bg: "bg-violet-bg", text: "text-violet" },
  { name: "warning", bg: "bg-warning-bg", text: "text-warning" },
  { name: "rose", bg: "bg-rose-bg", text: "text-rose" },
  { name: "cyan", bg: "bg-cyan-bg", text: "text-cyan" },
  { name: "accent-blue", bg: "bg-accent-blue-bg", text: "text-accent-blue" },
] as const;

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  cash: "Efectivo",
  debit: "Débito",
  credit: "Crédito",
  transfer: "Transferencia",
};

function capitalize(value: string): string {
  return value.replace(/^\w/, (c) => c.toUpperCase());
}

function isCurrentMonth(date: Date, today: Date): boolean {
  return (
    date.getFullYear() === today.getFullYear() &&
    date.getMonth() === today.getMonth()
  );
}

function hashCategory(value: string): number {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = value.charCodeAt(i) + ((hash << 5) - hash);
  }
  return Math.abs(hash);
}

function categoryColors(category?: string) {
  const key = category?.trim().toLowerCase() ?? "";
  const index = key ? hashCategory(key) % CATEGORY_PALETTE.length : 0;
  return CATEGORY_PALETTE[index]!;
}

function daysUntilUTC(from: Date, to: Date): number {
  const a = Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), from.getUTCDate());
  const b = Date.UTC(to.getUTCFullYear(), to.getUTCMonth(), to.getUTCDate());
  return Math.round((b - a) / 86_400_000);
}

function accountNameForTransaction(
  tx: Transaction,
  cardById: Map<string, Card>,
): string {
  if ("cardId" in tx && tx.cardId) {
    const card = cardById.get(tx.cardId);
    if (card) return card.bank;
  }
  return PAYMENT_METHOD_LABELS[tx.paymentMethod] ?? tx.paymentMethod;
}

function buildFixedPaymentRows(
  fixedPayments: FixedPayment[],
  refDate: Date,
): { rows: FixedPaymentRow[]; total: number } {
  const due = fixedPayments.filter((fp) =>
    isFixedPaymentDueThisMonth(fp, refDate),
  );
  const sorted = [...due].sort(
    (a, b) => b.amount - a.amount || a.description.localeCompare(b.description),
  );
  const total = sorted.reduce((sum, fp) => sum + fp.amount, 0);
  const rows = sorted.map((fp) => ({
    id: fp.id,
    label: fp.description,
    amountCents: fp.amount,
  }));
  return { rows, total };
}

function buildCardPaymentRows(
  cards: Card[],
  transactions: Transaction[],
  refDate: Date,
  today: Date,
): { rows: CardPaymentRow[]; total: number } {
  const rows: CardPaymentRow[] = [];
  for (const card of cards) {
    if (card.cardType !== "credit") continue;
    const amount = computePaymentForCurrentMonth(card.id, transactions, refDate);
    if (amount <= 0) continue;
    const paymentDate = computeActivePaymentDate(card, refDate);
    const daysUntil = daysUntilUTC(today, paymentDate);
    rows.push({
      cardId: card.id,
      bank: card.bank,
      amountCents: amount,
      paymentDate,
      daysUntil,
      isOverdue: daysUntil < 0,
    });
  }

  rows.sort(
    (a, b) => Number(a.isOverdue) - Number(b.isOverdue) || a.paymentDate.getTime() - b.paymentDate.getTime(),
  );

  const total = rows.reduce((sum, r) => sum + r.amountCents, 0);
  return { rows, total };
}

function buildMsiGroups(
  transactions: Transaction[],
  refDate: Date,
): { groups: MsiGroupRow[]; totalDebt: number; activeCount: number } {
  const summary = summarizeMsiByTenure(transactions, refDate);
  const groups = Object.entries(summary)
    .map(([tenure, data]) => ({
      tenure: Number(tenure),
      totalDebt: data.totalDebt,
      activeCount: data.activeCount,
    }))
    .filter((g) => g.activeCount > 0)
    .sort((a, b) => b.tenure - a.tenure);

  const totalDebt = groups.reduce((sum, g) => sum + g.totalDebt, 0);
  const activeCount = groups.reduce((sum, g) => sum + g.activeCount, 0);
  const maxDebt = Math.max(1, ...groups.map((g) => g.totalDebt));

  return {
    groups: groups.map((g) => ({
      tenure: g.tenure,
      totalDebt: g.totalDebt,
      percent: Math.round((g.totalDebt / maxDebt) * 100),
    })),
    totalDebt,
    activeCount,
  };
}

function buildRecentTransactions(
  transactions: Transaction[],
  cards: Card[],
  refDate: Date,
): RecentTransactionRow[] {
  const cardById = new Map(cards.map((c) => [c.id, c]));
  const cutoff = toIsoDateString(refDate);

  return transactions
    .filter((tx) => tx.date <= cutoff)
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 3)
    .map((tx) => {
      const isIncome = tx.type === "income";
      const colors = categoryColors(tx.category);
      return {
        id: tx.id,
        description: tx.description,
        amountCents: isIncome ? tx.amount : -tx.amount,
        sign: isIncome ? ("positive" as const) : ("negative" as const),
        date: new Date(tx.date),
        accountName: accountNameForTransaction(tx, cardById),
        category: tx.category,
        categoryInitial: (tx.category ?? tx.description).charAt(0).toUpperCase(),
        categoryColor: colors.bg,
        categoryTextColor: colors.text,
      };
    });
}

export interface ComputeDashboardSummaryOptions {
  today?: Date;
}

export function computeDashboardSummary(
  data: DashboardData,
  selectedMonth: SelectedMonth,
  options: ComputeDashboardSummaryOptions = {},
): DashboardSummary {
  const today = options.today ?? new Date();
  const refDate =
    selectedMonth === "current" ? today : addMonths(today, 1);

  const { transactions, cards, fixedPayments, settings } = data;

  const { total: spendingTotal } = computeMonthlySpending(transactions, refDate);
  const fixedTotal = computeFixedPaymentsForMonth(fixedPayments, refDate);
  const usedCents = spendingTotal + fixedTotal;

  const limitCents = settings.monthlyLimit;
  const availableCents = limitCents > 0 ? limitCents - usedCents : 0;
  const usedPercent =
    limitCents > 0 ? Math.round((usedCents / limitCents) * 100) : 0;

  const currentDay = today.getDate();
  const daysInMonth = getDaysInMonth(refDate);
  const progressPercent = Math.min(
    100,
    Math.round((currentDay / daysInMonth) * 100),
  );

  const fixed = buildFixedPaymentRows(fixedPayments, refDate);
  const cardsResult = buildCardPaymentRows(cards, transactions, refDate, today);
  const msi = buildMsiGroups(transactions, refDate);
  const recent = buildRecentTransactions(transactions, cards, refDate);

  const urgentPayment =
    cardsResult.rows.find((r) => !r.isOverdue && r.daysUntil >= 0 && r.daysUntil <= 5) ?? null;

  const nextRefDate = addMonths(today, 1);

  return {
    currency: settings.currency,
    selectedMonth,
    monthLabel: capitalize(format(refDate, "MMMM", { locale: es })),
    currentMonthLabel: capitalize(format(today, "MMMM", { locale: es })),
    nextMonthLabel: capitalize(format(nextRefDate, "MMMM", { locale: es })),
    longDate: formatLongDate(today),
    refDate,
    isCurrentMonth: isCurrentMonth(refDate, today),
    limitCents,
    usedCents,
    availableCents,
    usedPercent,
    progressPercent,
    paceOk: usedPercent <= progressPercent,
    fixedTotalCents: fixed.total,
    fixedPayments: {
      top: fixed.rows.slice(0, 3),
      others: fixed.rows.slice(3),
    },
    cardTotalCents: cardsResult.total,
    cardPayments: cardsResult.rows,
    urgentPayment,
    msiTotalDebt: msi.totalDebt,
    msiActiveCount: msi.activeCount,
    msiGroups: msi.groups,
    recentTransactions: recent,
  };
}

function formatLongDate(date: Date): string {
  return capitalize(format(date, "EEEE d 'de' MMMM", { locale: es }));
}
