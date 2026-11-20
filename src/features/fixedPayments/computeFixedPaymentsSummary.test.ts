/**
 * Tests for the pure summary behind the redesigned Pagos fijos screen
 * (redesign-ui-2026, T6).
 *
 * Covers the month total, the "Este mes" / "Próximos" grouping (reusing
 * the engine's recurrence rule), the explicit-UTC reference date and the
 * segmented month labels.
 */
import { describe, expect, it } from "vitest";
import { computeFixedPaymentsSummary } from "./computeFixedPaymentsSummary";
import type { FixedPayment } from "@/db/schemas/fixedPayment";

function makeFixedPayment(
  overrides: Partial<FixedPayment> & Pick<FixedPayment, "id">,
): FixedPayment {
  return {
    amount: 100_000,
    description: "Pago",
    paymentDay: 1,
    period: "monthly",
    paymentMethod: "cash",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

describe("computeFixedPaymentsSummary", () => {
  // Local November 20, 2026 — the user's calendar month is November.
  const today = new Date(2026, 10, 20, 15, 0);

  it("sums only the payments due in the selected month", () => {
    const renta = makeFixedPayment({
      id: "fp-1",
      description: "Renta",
      amount: 500_000,
    });
    // Bimonthly created in October: November is 1 month later (odd) → not due.
    const seguro = makeFixedPayment({
      id: "fp-2",
      description: "Seguro",
      amount: 200_000,
      period: "bimonthly",
      createdAt: "2026-10-01T00:00:00.000Z",
    });

    const summary = computeFixedPaymentsSummary([renta, seguro], "MXN", "current", {
      today,
    });

    expect(summary.totalCents).toBe(500_000);
  });

  it("groups a monthly payment in the due list and an off-cycle bimonthly in the upcoming list", () => {
    const renta = makeFixedPayment({ id: "fp-1", description: "Renta" });
    const seguro = makeFixedPayment({
      id: "fp-2",
      description: "Seguro",
      period: "bimonthly",
      createdAt: "2026-10-01T00:00:00.000Z",
    });

    const summary = computeFixedPaymentsSummary([renta, seguro], "MXN", "current", {
      today,
    });

    expect(summary.dueRows.map((r) => r.id)).toEqual(["fp-1"]);
    expect(summary.upcomingRows.map((r) => r.id)).toEqual(["fp-2"]);
    expect(summary.totalCount).toBe(2);
  });

  it("keeps quarterly payments only every third month", () => {
    // August → November is 3 months → due.
    const dueQuarterly = makeFixedPayment({
      id: "q-1",
      period: "quarterly",
      createdAt: "2026-08-01T00:00:00.000Z",
    });
    // September → November is 2 months → not due yet.
    const offQuarterly = makeFixedPayment({
      id: "q-2",
      period: "quarterly",
      createdAt: "2026-09-01T00:00:00.000Z",
    });

    const summary = computeFixedPaymentsSummary(
      [dueQuarterly, offQuarterly],
      "MXN",
      "current",
      { today },
    );

    expect(summary.dueRows.map((r) => r.id)).toEqual(["q-1"]);
    expect(summary.upcomingRows.map((r) => r.id)).toEqual(["q-2"]);
  });

  it("sorts both lists by payment day", () => {
    const luz = makeFixedPayment({ id: "a", description: "Luz", paymentDay: 20 });
    const renta = makeFixedPayment({ id: "b", description: "Renta", paymentDay: 5 });

    const summary = computeFixedPaymentsSummary([luz, renta], "MXN", "current", {
      today,
    });

    expect(summary.dueRows.map((r) => r.id)).toEqual(["b", "a"]);
  });

  it("builds the engine reference date at UTC midnight of the intended month", () => {
    // 23:30 local on November 30: reading UTC fields off a local Date
    // could drift into December in negative-offset timezones. The engine
    // date must stay in November because it is built with the explicit
    // UTC constructor from the local calendar fields.
    const lateToday = new Date(2026, 10, 30, 23, 30);

    const summary = computeFixedPaymentsSummary([], "MXN", "current", {
      today: lateToday,
    });

    expect(summary.refDate.toISOString()).toBe("2026-11-01T00:00:00.000Z");
    expect(summary.monthLabel).toBe("Noviembre");
  });

  it("moves the window one month ahead when 'next' is selected", () => {
    const seguro = makeFixedPayment({
      id: "fp-2",
      description: "Seguro",
      period: "bimonthly",
      createdAt: "2026-10-01T00:00:00.000Z",
    });

    const summary = computeFixedPaymentsSummary([seguro], "MXN", "next", {
      today,
    });

    expect(summary.refDate.toISOString()).toBe("2026-12-01T00:00:00.000Z");
    expect(summary.monthLabel).toBe("Diciembre");
    // Created in October: December is 2 months later (even) → due again.
    expect(summary.dueRows.map((r) => r.id)).toEqual(["fp-2"]);
    expect(summary.upcomingRows).toEqual([]);
  });

  it("labels both segmented options from the local calendar and keeps the currency", () => {
    const summary = computeFixedPaymentsSummary([], "USD", "current", { today });

    expect(summary.currentMonthLabel).toBe("Noviembre");
    expect(summary.nextMonthLabel).toBe("Diciembre");
    expect(summary.currency).toBe("USD");
    expect(summary.totalCents).toBe(0);
    expect(summary.dueRows).toEqual([]);
    expect(summary.upcomingRows).toEqual([]);
  });
});
