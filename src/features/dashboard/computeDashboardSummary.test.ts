import { describe, expect, it } from "vitest";
import type { Card, FixedPayment, Transaction } from "@/db/schemas";
import { computeDashboardSummary } from "./computeDashboardSummary";

const today = new Date(2026, 10, 20); // 20 de noviembre de 2026

const settings = {
  monthlyLimit: 2_500_000, // $25,000.00
  currency: "MXN",
};

const cards: Card[] = [
  {
    id: "card-1",
    bank: "PLATA",
    holderName: "Usuario",
    cardType: "credit",
    cutDay: 17,
    daysToPayAfterCut: 5,
    creditLimit: 1_000_000,
    priority: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "card-2",
    bank: "Mercado Pago",
    holderName: "Usuario",
    cardType: "credit",
    cutDay: 5,
    daysToPayAfterCut: 5,
    creditLimit: 500_000,
    priority: 1,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "card-3",
    bank: "Débito BBVA",
    holderName: "Usuario",
    cardType: "debit",
    priority: 2,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

const transactions: Transaction[] = [
  {
    id: "tx-1",
    type: "expense",
    amount: 100_000, // $1,000.00
    currency: "MXN",
    description: "Cena Adobe Pizza",
    date: "2026-11-05",
    category: "Comida",
    paymentMethod: "credit",
    cardId: "card-1",
  },
  {
    id: "tx-2",
    type: "income",
    amount: 50_000,
    currency: "MXN",
    description: "Reembolso",
    date: "2026-11-10",
    paymentMethod: "transfer",
  },
  {
    id: "tx-3",
    type: "expense_msi",
    amount: 240_000, // $2,400.00 a 12 meses
    currency: "MXN",
    description: "Televisión",
    date: "2026-09-01",
    category: "Hogar",
    paymentMethod: "credit",
    cardId: "card-2",
    msiMonths: 12,
    msiStartDate: "2026-09-01",
  },
];

const fixedPayments: FixedPayment[] = [
  {
    id: "fp-1",
    amount: 770_000,
    description: "Renta",
    paymentDay: 1,
    period: "monthly",
    paymentMethod: "debit",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "fp-2",
    amount: 300_000,
    description: "Gasolina",
    paymentDay: 5,
    period: "monthly",
    paymentMethod: "cash",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "fp-3",
    amount: 50_000,
    description: "iCloud",
    paymentDay: 10,
    period: "monthly",
    paymentMethod: "debit",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "fp-4",
    amount: 50_000,
    description: "Apple Music",
    paymentDay: 10,
    period: "monthly",
    paymentMethod: "debit",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

const data = { transactions, cards, fixedPayments, settings };

describe("computeDashboardSummary", () => {
  it("calculates used amount as monthly spending plus fixed payments", () => {
    const summary = computeDashboardSummary(data, "current", { today });
    // Gasto directo $1,000 + MSI $200 + fijos $1,170,000 = $1,290,000
    expect(summary.usedCents).toBe(1_290_000);
    expect(summary.availableCents).toBe(1_210_000);
  });

  it("reports pace as 'ok' when used % is within month progress %", () => {
    const summary = computeDashboardSummary(data, "current", { today });
    expect(summary.usedPercent).toBe(52);
    expect(summary.progressPercent).toBe(67);
    expect(summary.paceOk).toBe(true);
  });

  it("flags 'Vas rápido' when spending outpaces month progress", () => {
    const highLimit = { ...settings, monthlyLimit: 1_500_000 };
    const summary = computeDashboardSummary(
      { ...data, settings: highLimit },
      "current",
      { today },
    );
    expect(summary.usedPercent).toBe(86);
    expect(summary.paceOk).toBe(false);
  });

  it("reports used percent above 100% without capping the value", () => {
    const lowLimit = { ...settings, monthlyLimit: 1_000_000 };
    const summary = computeDashboardSummary(
      { ...data, settings: lowLimit },
      "current",
      { today },
    );
    expect(summary.usedPercent).toBe(129);
    expect(summary.paceOk).toBe(false);
  });

  it("returns zero available and no percent when limit is not configured", () => {
    const noLimit = { ...settings, monthlyLimit: 0 };
    const summary = computeDashboardSummary(
      { ...data, settings: noLimit },
      "current",
      { today },
    );
    expect(summary.limitCents).toBe(0);
    expect(summary.availableCents).toBe(0);
    expect(summary.usedPercent).toBe(0);
  });

  it("selects the nearest upcoming card payment within 5 days as urgent", () => {
    const summary = computeDashboardSummary(data, "current", { today });
    expect(summary.urgentPayment).not.toBeNull();
    expect(summary.urgentPayment?.bank).toBe("PLATA");
    expect(summary.urgentPayment?.daysUntil).toBe(2);
  });

  it("does not mark an overdue payment as urgent", () => {
    const summary = computeDashboardSummary(data, "current", { today });
    const overdue = summary.cardPayments.find((r) => r.bank === "Mercado Pago");
    expect(overdue?.isOverdue).toBe(true);
    expect(summary.urgentPayment?.bank).not.toBe("Mercado Pago");
  });

  it("excludes debit cards and zero-amount cards from payment list", () => {
    const summary = computeDashboardSummary(data, "current", { today });
    const banks = summary.cardPayments.map((r) => r.bank);
    expect(banks).toContain("PLATA");
    expect(banks).toContain("Mercado Pago");
    expect(banks).not.toContain("Débito BBVA");
  });

  it("sorts upcoming card payments first and moves overdue payments to the end", () => {
    const summary = computeDashboardSummary(data, "current", { today });
    expect(summary.cardPayments[0]!.isOverdue).toBe(false);
    expect(summary.cardPayments[summary.cardPayments.length - 1]!.isOverdue).toBe(true);
  });

  it("breaks fixed payments into top three and the rest", () => {
    const summary = computeDashboardSummary(data, "current", { today });
    expect(summary.fixedPayments.top).toHaveLength(3);
    expect(summary.fixedPayments.others).toHaveLength(1);
    expect(summary.fixedPayments.top[0]!.label).toBe("Renta");
    expect(summary.fixedPayments.others[0]!.label).toBe("iCloud");
    expect(summary.fixedTotalCents).toBe(1_170_000);
  });

  it("summarises MSI debt by tenure and computes percent relative to the largest", () => {
    const summary = computeDashboardSummary(data, "current", { today });
    expect(summary.msiActiveCount).toBe(1);
    expect(summary.msiGroups).toHaveLength(1);
    expect(summary.msiGroups[0]!.tenure).toBe(12);
    expect(summary.msiGroups[0]!.totalDebt).toBe(200_000); // 10 meses restantes × $200
    expect(summary.msiGroups[0]!.percent).toBe(100);
  });

  it("returns the three most recent transactions with account and category info", () => {
    const summary = computeDashboardSummary(data, "current", { today });
    expect(summary.recentTransactions).toHaveLength(3);
    const [first] = summary.recentTransactions;
    expect(first).toBeDefined();
    expect(first!.description).toBe("Reembolso");
    expect(first!.sign).toBe("positive");
    expect(first!.accountName).toBe("Transferencia");
  });

  it("switches ref date and labels when next month is selected", () => {
    const summary = computeDashboardSummary(data, "next", { today });
    expect(summary.selectedMonth).toBe("next");
    expect(summary.monthLabel).toBe("Diciembre");
    expect(summary.isCurrentMonth).toBe(false);
  });
});
