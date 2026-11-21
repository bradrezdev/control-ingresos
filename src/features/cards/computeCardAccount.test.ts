/**
 * Unit tests for the pure wallet computation (redesign-ui-2026, T5).
 *
 * `today` is pinned to noon UTC so the UTC day is the same in any test TZ,
 * matching the engine's UTC-midnight date convention.
 */
import { describe, expect, it, vi, beforeEach } from "vitest";
import { computeActivePaymentDate } from "@/engine/cycle";
import type * as CycleModule from "@/engine/cycle";
import type { Card, Transaction } from "@/db/schemas";
import {
  computeCardAccount,
  computeWalletOverview,
  computeMsiPlans,
} from "./computeCardAccount";

vi.mock("@/engine/cycle", async (importOriginal) => {
  const actual = await importOriginal<typeof CycleModule>();
  return {
    computeActivePaymentDate: vi.fn(actual.computeActivePaymentDate),
  };
});

const cycleEngine = vi.mocked(computeActivePaymentDate);

const today = new Date("2026-11-20T12:00:00Z");

/** ISO calendar day (UTC) of a Date — used for TZ-independent assertions. */
const isoUtc = (d: Date): string => d.toISOString().slice(0, 10);

const baseCard: Card = {
  id: "card-1",
  bank: "PLATA",
  holderName: "Bryan Núñez",
  cardType: "credit",
  cutDay: 17,
  daysToPayAfterCut: 20,
  creditLimit: 1_000_000,
  priority: 0,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

const debitCard: Card = {
  id: "card-debit",
  bank: "Débito diario",
  holderName: "Bryan Núñez",
  cardType: "debit",
  priority: 1,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

function expense(
  id: string,
  date: string,
  amount: number,
  cardId = "card-1",
): Transaction {
  return {
    id,
    type: "expense",
    amount,
    currency: "MXN",
    description: `Gasto ${id}`,
    date,
    category: "Comida",
    paymentMethod: "credit",
    cardId,
  };
}

function msiPurchase(
  id: string,
  cardId: string,
  amount: number,
  months: number,
  start: string,
): Transaction {
  return {
    id,
    type: "expense_msi",
    amount,
    currency: "MXN",
    description: `MSI ${id}`,
    date: start,
    category: "Hogar",
    paymentMethod: "credit",
    cardId,
    msiMonths: months,
    msiStartDate: start,
  };
}

beforeEach(() => {
  cycleEngine.mockClear();
});

describe("computeCardAccount — usage and available", () => {
  it("computes used, available and percent from the card's credit limit", () => {
    const transactions = [
      expense("tx-1", "2026-11-05", 250_000),
      expense("tx-2", "2026-11-10", 50_000),
      expense("tx-3", "2026-10-20", 999_999),
    ];
    const account = computeCardAccount(baseCard, transactions, today);

    expect(account.isCredit).toBe(true);
    expect(account.usedCents).toBe(300_000);
    expect(account.limitCents).toBe(1_000_000);
    expect(account.availableCents).toBe(700_000);
    expect(account.usedPercent).toBe(30);
  });

  it("maps the usage bar tone to the percent thresholds", () => {
    const at = (used: number, percent: number) => {
      const card: Card = { ...baseCard, creditLimit: 100_000 };
      const account = computeCardAccount(
        card,
        [expense("tx", "2026-11-10", used)],
        today,
      );
      expect(account.usedPercent).toBe(percent);
      return account.usageTone;
    };

    expect(at(60_000, 60)).toBe("primary");
    expect(at(61_000, 61)).toBe("warning");
    expect(at(85_000, 85)).toBe("warning");
    expect(at(86_000, 86)).toBe("danger");
  });

  it("keeps the real percent above 100 while the bar clamps its fill", () => {
    const card: Card = { ...baseCard, creditLimit: 100_000 };
    const account = computeCardAccount(
      card,
      [expense("tx", "2026-11-10", 129_000)],
      today,
    );

    expect(account.usedPercent).toBe(129);
    expect(account.usageTone).toBe("danger");
    expect(account.availableCents).toBe(0);
  });

  it("returns null credit metrics for a credit card without a limit", () => {
    const card: Card = { ...baseCard, creditLimit: undefined };
    const account = computeCardAccount(
      card,
      [expense("tx", "2026-11-10", 50_000)],
      today,
    );

    expect(account.usedCents).toBe(50_000);
    expect(account.limitCents).toBeNull();
    expect(account.availableCents).toBeNull();
    expect(account.usedPercent).toBeNull();
    expect(account.usageTone).toBeNull();
  });

  it("counts a card with no transactions as Al día", () => {
    const account = computeCardAccount(baseCard, [], today);

    expect(account.usedCents).toBe(0);
    expect(account.paymentChip).toEqual({ tone: "ok", label: "Al día" });
  });
});

describe("computeCardAccount — payment chip", () => {
  const chipFor = (card: Card, transactions: Transaction[]) => {
    const account = computeCardAccount(card, transactions, today);
    return account.paymentChip;
  };

  it("labels a payment due within 5 days as a warning chip", () => {
    const card: Card = { ...baseCard, cutDay: 19, daysToPayAfterCut: 3 };
    const chip = chipFor(card, [expense("tx", "2026-11-10", 10_000)]);
    expect(chip).toEqual({ tone: "warn", label: "En 2 días" });
  });

  it("labels a distant payment with a neutral chip", () => {
    const chip = chipFor(baseCard, [expense("tx", "2026-11-10", 10_000)]);
    expect(chip).toEqual({ tone: "neutral", label: "En 17 días" });
  });

  it("labels today's and tomorrow's payments", () => {
    const hoy: Card = { ...baseCard, cutDay: 17, daysToPayAfterCut: 3 };
    expect(chipFor(hoy, [expense("tx", "2026-11-10", 10_000)])).toEqual({
      tone: "warn",
      label: "Hoy",
    });

    const manana: Card = { ...baseCard, cutDay: 18, daysToPayAfterCut: 3 };
    expect(chipFor(manana, [expense("tx", "2026-11-10", 10_000)])).toEqual({
      tone: "warn",
      label: "Mañana",
    });
  });

  it("labels an already-past payment as Pasado", () => {
    const card: Card = { ...baseCard, cutDay: 5, daysToPayAfterCut: 10 };
    const chip = chipFor(card, [expense("tx", "2026-11-01", 10_000)]);
    expect(chip).toEqual({ tone: "neutral", label: "Pasado" });
  });
});

describe("computeCardAccount — statement cycle", () => {
  it("derives the current statement window from the engine payment date", () => {
    const transactions = [
      expense("in-1", "2026-10-18", 10_000),
      expense("in-2", "2026-11-01", 20_000),
      expense("edge", "2026-11-17", 30_000),
      expense("out-1", "2026-10-17", 40_000),
      expense("out-2", "2026-11-18", 50_000),
    ];
    const account = computeCardAccount(baseCard, transactions, today);

    expect(account.cycle).not.toBeNull();
    expect(isoUtc(account.cycle!.cutDate)).toBe("2026-11-17");
    expect(isoUtc(account.cycle!.startDate)).toBe("2026-10-18");
    expect(isoUtc(account.cycle!.dueDate)).toBe("2026-12-07");
    expect(isoUtc(account.paymentDate!)).toBe("2026-12-07");

    const ids = account.cycleTransactions.map((tx) => tx.id);
    expect(ids).toEqual(["in-1", "in-2", "edge"]);
  });

  it("estimates the next month's payment with the same engine helper", () => {
    const transactions = [
      expense("nov", "2026-11-05", 50_000),
      expense("dec", "2026-12-05", 100_000),
      msiPurchase("msi-1", "card-1", 30_000, 3, "2026-11-01"),
    ];
    const account = computeCardAccount(baseCard, transactions, today);

    // November: direct expense + MSI installment 1 (10,000 of 30,000 over 3).
    expect(account.usedCents).toBe(60_000);
    // December: direct expense + MSI installment 2.
    expect(account.nextMonthPaymentCents).toBe(110_000);
  });
});

describe("computeCardAccount — debit cards", () => {
  it("never calls the cycle engine and exposes no credit metrics", () => {
    const transactions = [
      expense("d-1", "2026-11-10", 20_000, "card-debit"),
      expense("d-2", "2026-10-15", 10_000, "card-debit"),
      expense("other", "2026-11-10", 10_000, "card-1"),
    ];
    const account = computeCardAccount(debitCard, transactions, today);

    expect(account.isCredit).toBe(false);
    expect(account.usedCents).toBeNull();
    expect(account.limitCents).toBeNull();
    expect(account.availableCents).toBeNull();
    expect(account.usedPercent).toBeNull();
    expect(account.usageTone).toBeNull();
    expect(account.paymentDate).toBeNull();
    expect(account.paymentChip).toBeNull();
    expect(account.cycle).toBeNull();
    expect(account.nextMonthPaymentCents).toBeNull();
    expect(cycleEngine).not.toHaveBeenCalled();
  });

  it("lists the debit card's movements for the current month", () => {
    const transactions = [
      expense("d-nov", "2026-11-10", 20_000, "card-debit"),
      expense("d-oct", "2026-10-15", 10_000, "card-debit"),
    ];
    const account = computeCardAccount(debitCard, transactions, today);

    expect(account.cycleTransactions.map((tx) => tx.id)).toEqual(["d-nov"]);
  });

  it("calls the cycle engine for credit cards (spy sanity)", () => {
    computeCardAccount(baseCard, [], today);
    expect(cycleEngine).toHaveBeenCalled();
  });
});

describe("computeWalletOverview", () => {
  const plata: Card = { ...baseCard, cutDay: 19, daysToPayAfterCut: 3 };
  const bbva: Card = {
    ...baseCard,
    id: "card-2",
    bank: "BBVA",
    cutDay: 5,
    daysToPayAfterCut: 10,
    creditLimit: 500_000,
    priority: 1,
  };

  it("totals limit, used and available across credit cards", () => {
    const accounts = [
      computeCardAccount(
        plata,
        [expense("p", "2026-11-10", 250_000)],
        today,
      ),
      computeCardAccount(
        bbva,
        [expense("b", "2026-11-10", 100_000, "card-2")],
        today,
      ),
    ];
    const overview = computeWalletOverview(accounts, "MXN");

    expect(overview.currency).toBe("MXN");
    expect(overview.totalLimitCents).toBe(1_500_000);
    expect(overview.totalUsedCents).toBe(350_000);
    expect(overview.totalAvailableCents).toBe(1_150_000);
  });

  it("picks the earliest upcoming due card with a pending payment", () => {
    const accounts = [
      // BBVA's payment is already past; PLATA pays in 2 days.
      computeCardAccount(
        bbva,
        [expense("b", "2026-11-10", 100_000, "card-2")],
        today,
      ),
      computeCardAccount(
        plata,
        [expense("p", "2026-11-10", 250_000)],
        today,
      ),
    ];
    const overview = computeWalletOverview(accounts, "MXN");

    expect(overview.nextDue).not.toBeNull();
    expect(overview.nextDue!.bank).toBe("PLATA");
    expect(overview.nextDue!.daysUntil).toBe(2);
    expect(isoUtc(overview.nextDue!.paymentDate)).toBe("2026-11-22");
  });

  it("ignores cards with nothing to pay when picking the next due", () => {
    const empty = computeCardAccount(plata, [], today);
    const overview = computeWalletOverview([empty], "MXN");
    expect(overview.nextDue).toBeNull();
  });

  it("returns null nextDue when every payment is already past", () => {
    const past = computeCardAccount(
      bbva,
      [expense("b", "2026-11-01", 100_000, "card-2")],
      today,
    );
    const overview = computeWalletOverview([past], "MXN");
    expect(overview.nextDue).toBeNull();
  });

  it("floors each card's available at zero before totaling", () => {
    const over: Card = { ...baseCard, creditLimit: 100_000 };
    const accounts = [
      computeCardAccount(
        over,
        [expense("o", "2026-11-10", 129_000)],
        today,
      ),
      computeCardAccount(
        plata,
        [expense("p", "2026-11-10", 250_000)],
        today,
      ),
    ];
    const overview = computeWalletOverview(accounts, "MXN");

    expect(overview.totalAvailableCents).toBe(750_000);
  });

  it("handles an empty wallet", () => {
    const overview = computeWalletOverview([], "USD");

    expect(overview.currency).toBe("USD");
    expect(overview.totalLimitCents).toBe(0);
    expect(overview.totalUsedCents).toBe(0);
    expect(overview.totalAvailableCents).toBe(0);
    expect(overview.nextDue).toBeNull();
  });
});

describe("computeMsiPlans", () => {
  it("computes remaining debt and installment info for active plans", () => {
    const transactions = [
      msiPurchase("msi-1", "card-1", 240_000, 12, "2026-09-01"),
    ];
    const plans = computeMsiPlans(transactions, today);

    expect(plans).toHaveLength(1);
    const plan = plans[0]!;
    expect(plan.id).toBe("msi-1");
    expect(plan.monthsTotal).toBe(12);
    expect(plan.currentInstallment).toBe(3);
    expect(plan.monthlyCents).toBe(20_000);
    // 10 installments left including this month's (engine convention).
    expect(plan.remainingCents).toBe(200_000);
    expect(plan.installmentsLeft).toBe(10);
  });

  it("excludes finished plans and non-MSI transactions", () => {
    const transactions = [
      msiPurchase("old", "card-1", 120_000, 12, "2025-11-01"),
      expense("plain", "2026-11-10", 10_000),
    ];
    expect(computeMsiPlans(transactions, today)).toEqual([]);
  });

  it("sorts plans by remaining debt, largest first", () => {
    const transactions = [
      msiPurchase("small", "card-1", 30_000, 3, "2026-11-01"),
      msiPurchase("big", "card-1", 240_000, 12, "2026-09-01"),
    ];
    const plans = computeMsiPlans(transactions, today);

    expect(plans.map((p) => p.id)).toEqual(["big", "small"]);
  });

  it("returns an empty list for no transactions", () => {
    expect(computeMsiPlans([], today)).toEqual([]);
  });
});
